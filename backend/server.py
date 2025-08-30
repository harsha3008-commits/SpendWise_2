from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import os
import logging
import uuid
import hashlib
import razorpay
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Razorpay
razorpay_client = razorpay.Client(auth=(
    os.environ['RAZORPAY_KEY_ID'], 
    os.environ['RAZORPAY_KEY_SECRET']
))

# Create FastAPI app and router
app = FastAPI(title="SpendWise API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # expense, income, transfer, bill
    amount: float
    currency: str = "INR"
    categoryId: str
    accountId: Optional[str] = None
    note: Optional[str] = None
    merchant: Optional[str] = None
    tags: Optional[List[str]] = []
    timestamp: int = Field(default_factory=lambda: int(datetime.utcnow().timestamp() * 1000))
    billDueAt: Optional[int] = None
    attachmentIds: Optional[List[str]] = []
    previousHash: str = ""
    currentHash: str = ""
    version: int = 1
    walletAddress: Optional[str] = None
    blockchainTxHash: Optional[str] = None
    isRecurring: bool = False
    budgetId: Optional[str] = None
    isPaid: bool = False

class TransactionCreate(BaseModel):
    type: str
    amount: float
    currency: str = "INR"
    categoryId: str
    accountId: Optional[str] = None
    note: Optional[str] = None
    merchant: Optional[str] = None
    tags: Optional[List[str]] = []
    billDueAt: Optional[int] = None
    isRecurring: bool = False
    budgetId: Optional[str] = None

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    type: str  # expense or income
    budgetMonthly: Optional[float] = None
    isDefault: bool = False

class Budget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    categoryIds: List[str]
    amount: float
    spent: float = 0.0
    period: str = "monthly"
    startDate: int
    endDate: int
    isActive: bool = True
    notifications: bool = True

class Bill(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    amount: float
    dueDate: int
    categoryId: str
    isRecurring: bool = False
    isPaid: bool = False
    reminderDays: List[int] = [7, 1]
    paymentTransactionId: Optional[str] = None

class PaymentOrder(BaseModel):
    amount: int  # Amount in paise
    currency: str = "INR"
    receipt: Optional[str] = None

class SubscriptionPlan(BaseModel):
    plan_id: str
    amount: int
    interval: str = "monthly"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: Optional[str] = None
    encryptionKeyHash: str
    createdAt: int = Field(default_factory=lambda: int(datetime.utcnow().timestamp() * 1000))
    lastActiveAt: int = Field(default_factory=lambda: int(datetime.utcnow().timestamp() * 1000))
    walletAddress: Optional[str] = None

# Utility functions
def compute_hash(tx: Transaction) -> str:
    """Compute SHA-256 hash for blockchain-style ledger"""
    hash_input = f"{tx.id}|{tx.amount}|{tx.currency}|{tx.categoryId}|{tx.timestamp}|{tx.billDueAt or ''}|{tx.previousHash}"
    return hashlib.sha256(hash_input.encode()).hexdigest()

async def get_last_transaction() -> Optional[Transaction]:
    """Get the most recent transaction by timestamp"""
    last_tx = await db.transactions.find_one(
        sort=[("timestamp", -1)]
    )
    return Transaction(**last_tx) if last_tx else None

# API Routes

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "spendwise-api"}

# User routes
@api_router.post("/users", response_model=User)
async def create_user(user_data: dict):
    user = User(**user_data)
    result = await db.users.insert_one(user.dict())
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# Transaction routes
@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(skip: int = 0, limit: int = 100):
    transactions = await db.transactions.find().skip(skip).limit(limit).sort("timestamp", -1).to_list(limit)
    return [Transaction(**tx) for tx in transactions]

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate):
    # Get the last transaction for hash chaining
    last_tx = await get_last_transaction()
    previous_hash = last_tx.currentHash if last_tx else "0"
    
    # Create new transaction
    transaction = Transaction(
        **transaction_data.dict(),
        previousHash=previous_hash
    )
    
    # Compute hash
    transaction.currentHash = compute_hash(transaction)
    
    # Save to database
    result = await db.transactions.insert_one(transaction.dict())
    return transaction

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return Transaction(**transaction)

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, updates: dict):
    # Get existing transaction
    existing = await db.transactions.find_one({"id": transaction_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update transaction
    updated_tx = Transaction(**{**existing, **updates})
    
    # Recompute hash if necessary
    updated_tx.currentHash = compute_hash(updated_tx)
    
    # Save to database
    await db.transactions.update_one(
        {"id": transaction_id}, 
        {"$set": updated_tx.dict()}
    )
    
    return updated_tx

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted successfully"}

# Ledger verification
@api_router.get("/ledger/verify")
async def verify_ledger():
    transactions = await db.transactions.find().sort("timestamp", 1).to_list(None)
    
    if not transactions:
        return {"ok": True, "verifiedCount": 0, "errors": []}
    
    errors = []
    verified_count = 0
    
    for i, tx_data in enumerate(transactions):
        tx = Transaction(**tx_data)
        
        # Verify hash computation
        computed_hash = compute_hash(tx)
        if computed_hash != tx.currentHash:
            errors.append(f"Transaction {tx.id} has invalid hash")
            return {"ok": False, "failedAtId": tx.id, "verifiedCount": verified_count, "errors": errors}
        
        # Verify chain linkage
        if i > 0:
            prev_tx = Transaction(**transactions[i - 1])
            if tx.previousHash != prev_tx.currentHash:
                errors.append(f"Transaction {tx.id} has broken chain link")
                return {"ok": False, "failedAtId": tx.id, "verifiedCount": verified_count, "errors": errors}
        else:
            # Genesis transaction
            if tx.previousHash != "0":
                errors.append(f"Genesis transaction {tx.id} has invalid previousHash")
                return {"ok": False, "failedAtId": tx.id, "verifiedCount": verified_count, "errors": errors}
        
        verified_count += 1
    
    return {"ok": True, "verifiedCount": verified_count, "errors": errors if errors else None}

# Category routes
@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find().to_list(None)
    return [Category(**cat) for cat in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(category: Category):
    result = await db.categories.insert_one(category.dict())
    return category

# Budget routes
@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets():
    budgets = await db.budgets.find().to_list(None)
    return [Budget(**budget) for budget in budgets]

@api_router.post("/budgets", response_model=Budget)
async def create_budget(budget: Budget):
    result = await db.budgets.insert_one(budget.dict())
    return budget

# Bill routes
@api_router.get("/bills", response_model=List[Bill])
async def get_bills():
    bills = await db.bills.find().to_list(None)
    return [Bill(**bill) for bill in bills]

@api_router.post("/bills", response_model=Bill)
async def create_bill(bill: Bill):
    result = await db.bills.insert_one(bill.dict())
    return bill

# Payment routes
@api_router.post("/payments/create-order")
async def create_payment_order(order: PaymentOrder):
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": order.amount,
            "currency": order.currency,
            "receipt": order.receipt or str(uuid.uuid4()),
            "payment_capture": 1
        })
        
        # Store order in database
        await db.payment_orders.insert_one({
            "order_id": razorpay_order["id"],
            "amount": order.amount,
            "currency": order.currency,
            "status": "created",
            "created_at": datetime.utcnow()
        })
        
        return razorpay_order
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/payments/verify")
async def verify_payment(payment_data: dict):
    try:
        # Verify payment signature
        razorpay_client.utility.verify_payment_signature(payment_data)
        
        # Update order status
        await db.payment_orders.update_one(
            {"order_id": payment_data["razorpay_order_id"]},
            {"$set": {"status": "paid", "payment_id": payment_data["razorpay_payment_id"]}}
        )
        
        return {"status": "success", "message": "Payment verified successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {str(e)}")

@api_router.post("/subscription/create")
async def create_subscription(plan: SubscriptionPlan):
    try:
        subscription = razorpay_client.subscription.create({
            "plan_id": plan.plan_id,
            "customer_notify": 1,
            "quantity": 1,
            "total_count": 12 if plan.interval == "monthly" else 1
        })
        
        return subscription
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Analytics routes
@api_router.get("/analytics/summary")
async def get_analytics_summary():
    # Get transactions from last 30 days
    thirty_days_ago = int((datetime.utcnow() - timedelta(days=30)).timestamp() * 1000)
    
    transactions = await db.transactions.find({
        "timestamp": {"$gte": thirty_days_ago}
    }).to_list(None)
    
    total_income = sum(tx["amount"] for tx in transactions if tx["type"] == "income")
    total_expenses = sum(tx["amount"] for tx in transactions if tx["type"] == "expense")
    net_worth = total_income - total_expenses
    
    # Category breakdown
    category_breakdown = {}
    for tx in transactions:
        if tx["type"] == "expense":
            category_id = tx["categoryId"]
            category_breakdown[category_id] = category_breakdown.get(category_id, 0) + tx["amount"]
    
    return {
        "totalIncome": total_income,
        "totalExpenses": total_expenses,
        "netWorth": net_worth,
        "categoryBreakdown": category_breakdown,
        "transactionCount": len(transactions)
    }

# Include router in app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    logger.info("SpendWise API starting up...")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("SpendWise API shutting down...")
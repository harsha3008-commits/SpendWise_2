from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import logging
import uuid
import razorpay
from dotenv import load_dotenv
from pathlib import Path
import asyncio

# Import blockchain utilities
from utils.blockchain_utils import (
    SpendWiseBlockchain,
    compute_transaction_hash,
    verify_transaction_chain,
    create_new_transaction,
    get_daily_merkle_root,
    detect_chain_tampering
)

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

# Enhanced Pydantic Models
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
    nonce: int = 0

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
    walletAddress: Optional[str] = None

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
    plan_type: Optional[str] = "premium"

class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class SubscriptionPlan(BaseModel):
    plan_id: str
    amount: int
    interval: str = "monthly"

class SubscriptionState(BaseModel):
    plan: str = "free"  # free or premium
    expiresAt: Optional[int] = None
    receipt: Optional[str] = None
    lastVerifiedAt: Optional[int] = None
    features: List[str] = []

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: Optional[str] = None
    encryptionKeyHash: str
    createdAt: int = Field(default_factory=lambda: int(datetime.utcnow().timestamp() * 1000))
    lastActiveAt: int = Field(default_factory=lambda: int(datetime.utcnow().timestamp() * 1000))
    walletAddress: Optional[str] = None
    subscriptionState: SubscriptionState = Field(default_factory=SubscriptionState)

class BlockchainAnchor(BaseModel):
    date: str  # YYYY-MM-DD format
    merkleRoot: str
    transactionCount: int
    blockchainTxHash: Optional[str] = None
    anchored: bool = False
    createdAt: int = Field(default_factory=lambda: int(datetime.utcnow().timestamp() * 1000))

# Enhanced utility functions
async def get_last_transaction() -> Optional[Transaction]:
    """Get the most recent transaction by timestamp"""
    last_tx = await db.transactions.find_one(
        sort=[("timestamp", -1)]
    )
    return Transaction(**last_tx) if last_tx else None

async def update_budget_spent(category_id: str, amount: float, transaction_type: str):
    """Update budget spent amount when transaction is added/updated"""
    if transaction_type != "expense":
        return
    
    # Find budgets that include this category
    budgets = await db.budgets.find({"categoryIds": category_id, "isActive": True}).to_list(None)
    
    for budget_data in budgets:
        await db.budgets.update_one(
            {"id": budget_data["id"]},
            {"$inc": {"spent": amount}}
        )

async def calculate_monthly_stats(user_id: Optional[str] = None) -> Dict[str, Any]:
    """Calculate precomputed monthly statistics for performance"""
    current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month = (current_month + timedelta(days=32)).replace(day=1)
    
    month_start = int(current_month.timestamp() * 1000)
    month_end = int(next_month.timestamp() * 1000)
    
    # Get transactions for current month
    transactions = await db.transactions.find({
        "timestamp": {"$gte": month_start, "$lt": month_end}
    }).to_list(None)
    
    total_income = sum(tx["amount"] for tx in transactions if tx["type"] == "income")
    total_expenses = sum(tx["amount"] for tx in transactions if tx["type"] == "expense")
    
    # Category breakdown
    category_breakdown = {}
    for tx in transactions:
        if tx["type"] == "expense":
            cat_id = tx["categoryId"]
            category_breakdown[cat_id] = category_breakdown.get(cat_id, 0) + tx["amount"]
    
    return {
        "totalIncome": total_income,
        "totalExpenses": total_expenses,
        "netWorth": total_income - total_expenses,
        "categoryBreakdown": category_breakdown,
        "transactionCount": len(transactions),
        "monthStart": month_start,
        "monthEnd": month_end
    }

# API Routes

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "spendwise-api", "version": "1.0.0"}

# Enhanced Transaction routes
@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(skip: int = 0, limit: int = 100):
    transactions = await db.transactions.find().skip(skip).limit(limit).sort("timestamp", -1).to_list(limit)
    return [Transaction(**tx) for tx in transactions]

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, background_tasks: BackgroundTasks):
    # Get the last transaction for hash chaining
    last_tx = await get_last_transaction()
    
    # Create blockchain transaction
    tx_dict = transaction_data.dict()
    tx_dict["id"] = str(uuid.uuid4())
    
    if last_tx:
        blockchain_tx = create_new_transaction(tx_dict, last_tx.dict())
    else:
        blockchain_tx = create_new_transaction(tx_dict)
    
    # Create Transaction object
    transaction = Transaction(**blockchain_tx)
    
    # Save to database
    await db.transactions.insert_one(transaction.dict())
    
    # Update budget in background
    background_tasks.add_task(
        update_budget_spent, 
        transaction.categoryId, 
        transaction.amount, 
        transaction.type
    )
    
    return transaction

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return Transaction(**transaction)

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, updates: Dict[str, Any]):
    # Get existing transaction
    existing = await db.transactions.find_one({"id": transaction_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update transaction data
    updated_data = {**existing, **updates}
    updated_tx = Transaction(**updated_data)
    
    # Recompute hash
    updated_tx.currentHash = SpendWiseBlockchain.compute_hash(updated_tx.dict())
    
    # Save to database
    await db.transactions.update_one(
        {"id": transaction_id}, 
        {"$set": updated_tx.dict()}
    )
    
    # If this affects the chain, re-chain subsequent transactions
    # This is a simplified version - in production, you'd want more sophisticated handling
    
    return updated_tx

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted successfully"}

# Enhanced Ledger verification
@api_router.get("/ledger/verify")
async def verify_ledger():
    transactions = await db.transactions.find().sort("timestamp", 1).to_list(None)
    
    # Convert to format expected by blockchain utils
    blockchain_transactions = [Transaction(**tx).dict() for tx in transactions]
    
    verification_result = verify_transaction_chain(blockchain_transactions)
    return verification_result

@api_router.get("/ledger/tampering-check")
async def check_tampering():
    """Advanced tampering detection"""
    transactions = await db.transactions.find().to_list(None)
    blockchain_transactions = [Transaction(**tx).dict() for tx in transactions]
    
    tampering_result = detect_chain_tampering(blockchain_transactions)
    return tampering_result

@api_router.get("/ledger/merkle-root")
async def get_merkle_root(date: Optional[str] = None):
    """Get daily Merkle root for blockchain anchoring"""
    target_date = datetime.fromisoformat(date) if date else datetime.now()
    
    transactions = await db.transactions.find().to_list(None)
    blockchain_transactions = [Transaction(**tx).dict() for tx in transactions]
    
    merkle_root = get_daily_merkle_root(blockchain_transactions, target_date)
    
    return {
        "date": target_date.strftime("%Y-%m-%d"),
        "merkleRoot": merkle_root,
        "transactionCount": len([tx for tx in blockchain_transactions 
                               if datetime.fromtimestamp(tx["timestamp"] / 1000).date() == target_date.date()])
    }

@api_router.post("/ledger/anchor")
async def anchor_daily_merkle(anchor_data: BlockchainAnchor):
    """Store blockchain anchor information"""
    await db.blockchain_anchors.insert_one(anchor_data.dict())
    return {"message": "Merkle root anchored successfully", "data": anchor_data}

# Category routes
@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find().to_list(None)
    return [Category(**cat) for cat in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(category: Category):
    result = await db.categories.insert_one(category.dict())
    return category

# Budget routes with precomputed stats
@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets():
    budgets = await db.budgets.find().to_list(None)
    
    # Precompute spent amounts for performance
    for budget_data in budgets:
        current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_start_ts = int(current_month_start.timestamp() * 1000)
        
        # Calculate spent amount for current month
        spent_amount = 0
        async for tx in db.transactions.find({
            "categoryId": {"$in": budget_data["categoryIds"]},
            "type": "expense",
            "timestamp": {"$gte": month_start_ts}
        }):
            spent_amount += tx["amount"]
        
        budget_data["spent"] = spent_amount
    
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

# Enhanced Payment routes
@api_router.post("/payments/create-order")
async def create_payment_order(order: PaymentOrder):
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": order.amount,
            "currency": order.currency,
            "receipt": order.receipt or f"receipt_{int(datetime.now().timestamp())}",
            "payment_capture": 1,
            "notes": {
                "plan_type": order.plan_type,
                "created_via": "spendwise_app"
            }
        })
        
        # Store order in database
        order_data = {
            "order_id": razorpay_order["id"],
            "amount": order.amount,
            "currency": order.currency,
            "plan_type": order.plan_type,
            "status": "created",
            "created_at": datetime.utcnow(),
            "razorpay_data": razorpay_order
        }
        
        await db.payment_orders.insert_one(order_data)
        
        return razorpay_order
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/payments/verify")
async def verify_payment(payment_data: PaymentVerification):
    try:
        # Verify payment signature
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": payment_data.razorpay_order_id,
            "razorpay_payment_id": payment_data.razorpay_payment_id,
            "razorpay_signature": payment_data.razorpay_signature
        })
        
        # Update order status
        await db.payment_orders.update_one(
            {"order_id": payment_data.razorpay_order_id},
            {"$set": {
                "status": "paid",
                "payment_id": payment_data.razorpay_payment_id,
                "verified_at": datetime.utcnow()
            }}
        )
        
        # Get order details to determine subscription
        order = await db.payment_orders.find_one({"order_id": payment_data.razorpay_order_id})
        
        if order and order.get("plan_type") == "premium":
            # Activate premium subscription (30 days)
            expiry_date = datetime.now() + timedelta(days=30)
            subscription_data = {
                "plan": "premium",
                "expiresAt": int(expiry_date.timestamp() * 1000),
                "receipt": payment_data.razorpay_payment_id,
                "lastVerifiedAt": int(datetime.now().timestamp() * 1000),
                "features": [
                    "advanced_analytics",
                    "export_data", 
                    "blockchain_sync",
                    "recurring_detection",
                    "cashflow_forecast"
                ]
            }
            
            # Store subscription state (in production, link to user)
            await db.subscriptions.insert_one(subscription_data)
        
        return {
            "status": "success", 
            "message": "Payment verified successfully",
            "subscription_activated": order.get("plan_type") == "premium" if order else False
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {str(e)}")

@api_router.post("/subscription/create")
async def create_subscription(plan: SubscriptionPlan):
    try:
        subscription = razorpay_client.subscription.create({
            "plan_id": plan.plan_id,
            "customer_notify": 1,
            "quantity": 1,
            "total_count": 12 if plan.interval == "monthly" else 1,
            "notes": {
                "created_via": "spendwise_app"
            }
        })
        
        # Store subscription info
        await db.subscriptions.insert_one({
            "subscription_id": subscription["id"],
            "plan_id": plan.plan_id,
            "status": subscription["status"],
            "created_at": datetime.utcnow(),
            "razorpay_data": subscription
        })
        
        return subscription
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/subscription/status/{user_id}")
async def get_subscription_status(user_id: str):
    """Get current subscription status for a user"""
    subscription = await db.subscriptions.find_one(
        {"user_id": user_id}, 
        sort=[("created_at", -1)]
    )
    
    if not subscription:
        return SubscriptionState()
    
    # Check if subscription is still active
    expiry_timestamp = subscription.get("expiresAt", 0)
    current_timestamp = int(datetime.now().timestamp() * 1000)
    
    if expiry_timestamp < current_timestamp:
        # Subscription expired
        return SubscriptionState()
    
    return SubscriptionState(**subscription)

# Enhanced Analytics routes
@api_router.get("/analytics/summary")
async def get_analytics_summary():
    """Get precomputed monthly summary with performance optimizations"""
    stats = await calculate_monthly_stats()
    return stats

@api_router.get("/analytics/advanced")
async def get_advanced_analytics():
    """Premium analytics features"""
    # This would typically check subscription status first
    
    # Get last 6 months of data
    six_months_ago = datetime.now() - timedelta(days=180)
    since_timestamp = int(six_months_ago.timestamp() * 1000)
    
    transactions = await db.transactions.find({
        "timestamp": {"$gte": since_timestamp}
    }).to_list(None)
    
    # Recurring transaction detection
    recurring_transactions = {}
    merchant_frequency = {}
    
    for tx in transactions:
        merchant = tx.get("merchant", "Unknown")
        if merchant not in merchant_frequency:
            merchant_frequency[merchant] = []
        merchant_frequency[merchant].append(tx["timestamp"])
    
    # Detect recurring patterns (simplified)
    for merchant, timestamps in merchant_frequency.items():
        if len(timestamps) >= 3:
            # Check if timestamps are roughly monthly
            timestamps.sort()
            intervals = [timestamps[i] - timestamps[i-1] for i in range(1, len(timestamps))]
            avg_interval = sum(intervals) / len(intervals)
            
            # Roughly monthly (25-35 days)
            if 25 * 24 * 60 * 60 * 1000 <= avg_interval <= 35 * 24 * 60 * 60 * 1000:
                avg_amount = sum(tx["amount"] for tx in transactions if tx.get("merchant") == merchant) / len([tx for tx in transactions if tx.get("merchant") == merchant])
                recurring_transactions[merchant] = {
                    "frequency": "monthly",
                    "average_amount": avg_amount,
                    "transaction_count": len(timestamps)
                }
    
    return {
        "recurringTransactions": recurring_transactions,
        "totalRecurringFound": len(recurring_transactions),
        "analysisTimeRange": {
            "start": since_timestamp,
            "end": int(datetime.now().timestamp() * 1000)
        }
    }

# User routes
@api_router.post("/users", response_model=User)
async def create_user(user_data: Dict[str, Any]):
    user = User(**user_data)
    result = await db.users.insert_one(user.dict())
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# Webhook endpoint for Razorpay
@api_router.post("/webhook/razorpay")
async def razorpay_webhook(request_data: Dict[str, Any]):
    """Handle Razorpay webhooks for payment status updates"""
    try:
        event = request_data.get("event")
        payment_data = request_data.get("payload", {}).get("payment", {})
        
        if event == "payment.captured":
            # Payment successful
            order_id = payment_data.get("order_id")
            payment_id = payment_data.get("id")
            
            await db.payment_orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "status": "captured",
                    "payment_id": payment_id,
                    "captured_at": datetime.utcnow(),
                    "webhook_event": event
                }}
            )
        
        elif event == "payment.failed":
            # Payment failed
            order_id = payment_data.get("order_id")
            
            await db.payment_orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "status": "failed",
                    "failed_at": datetime.utcnow(),
                    "webhook_event": event,
                    "failure_reason": payment_data.get("error_description")
                }}
            )
        
        return {"status": "processed", "event": event}
    
    except Exception as e:
        logging.error(f"Webhook processing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

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
    logger.info("SpendWise API starting up with enhanced blockchain features...")
    
    # Create indexes for performance
    await db.transactions.create_index([("timestamp", -1)])
    await db.transactions.create_index([("categoryId", 1)])
    await db.transactions.create_index([("type", 1)])
    await db.payment_orders.create_index([("order_id", 1)])
    await db.subscriptions.create_index([("user_id", 1)])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("SpendWise API shutting down...")
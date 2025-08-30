from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Annotated
from datetime import datetime, timedelta
import os
import logging
import uuid
import hashlib
import hmac
import razorpay
from dotenv import load_dotenv
from pathlib import Path
import jwt
from passlib.context import CryptContext
import secrets
import asyncio
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

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

# Security Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not JWT_SECRET_KEY:
    # Generate a secure random key if not provided (for development only)
    JWT_SECRET_KEY = secrets.token_urlsafe(32)
    logging.warning("JWT_SECRET_KEY not found in environment, using generated key (not recommended for production)")

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DELTA = timedelta(hours=24)
JWT_REFRESH_EXPIRATION_DELTA = timedelta(days=30)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
argon2_hasher = PasswordHasher()

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

# Initialize MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Razorpay with validation
razorpay_key_id = os.environ.get('RAZORPAY_KEY_ID')
razorpay_key_secret = os.environ.get('RAZORPAY_KEY_SECRET')

if not razorpay_key_id or not razorpay_key_secret:
    logging.error("Razorpay credentials not found in environment variables")
    raise ValueError("Missing Razorpay credentials")

razorpay_client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))

# Create FastAPI app with enhanced security
app = FastAPI(
    title="SpendWise API",
    version="1.0.0",
    description="Privacy-first mobile finance API with blockchain verification",
    docs_url="/docs" if os.getenv("NODE_ENV") != "production" else None,
    redoc_url="/redoc" if os.getenv("NODE_ENV") != "production" else None
)

api_router = APIRouter(prefix="/api")

# Enhanced CORS middleware with whitelist
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8081",  # Expo dev server
    "https://secure-wallet-3.preview.emergentagent.com",
    # Add production domains here
]

if os.getenv("NODE_ENV") == "production":
    # In production, only allow specific domains
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
    ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Rate-Limit-Remaining"]
)

# Add rate limiting middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# JWT Bearer token scheme
security = HTTPBearer()

# Enhanced Pydantic Models with strict validation
class UserCreate(BaseModel):
    email: Optional[str] = Field(None, pattern=r'^[^@]+@[^@]+\.[^@]+$')
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain number')
        return v

class UserLogin(BaseModel):
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    password: str = Field(..., min_length=8)

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = Field(..., pattern=r'^(expense|income|transfer|bill)$')
    amount: float = Field(..., gt=0, le=10000000)  # Max 1 crore
    currency: str = Field("INR", pattern=r'^[A-Z]{3}$')
    categoryId: str = Field(..., min_length=1)
    accountId: Optional[str] = None
    note: Optional[str] = Field(None, max_length=500)
    merchant: Optional[str] = Field(None, max_length=200)
    tags: Optional[List[str]] = Field(default_factory=list)
    timestamp: int = Field(default_factory=lambda: int(datetime.utcnow().timestamp() * 1000))
    billDueAt: Optional[int] = None
    attachmentIds: Optional[List[str]] = Field(default_factory=list)
    previousHash: str = ""
    currentHash: str = ""
    version: int = 1
    walletAddress: Optional[str] = None
    blockchainTxHash: Optional[str] = None
    isRecurring: bool = False
    budgetId: Optional[str] = None
    isPaid: bool = False
    nonce: int = 0
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        if v > 10000000:  # 1 crore limit
            raise ValueError('Amount exceeds maximum limit')
        return round(v, 2)

class TransactionCreate(BaseModel):
    type: str = Field(..., regex=r'^(expense|income|transfer|bill)$')
    amount: float = Field(..., gt=0, le=10000000)
    currency: str = Field("INR", regex=r'^[A-Z]{3}$')
    categoryId: str = Field(..., min_length=1)
    accountId: Optional[str] = None
    note: Optional[str] = Field(None, max_length=500)
    merchant: Optional[str] = Field(None, max_length=200)
    tags: Optional[List[str]] = Field(default_factory=list)
    billDueAt: Optional[int] = None
    isRecurring: bool = False
    budgetId: Optional[str] = None
    walletAddress: Optional[str] = None

class PaymentOrder(BaseModel):
    amount: int = Field(..., gt=0, le=1000000000)  # Max 10 lakh rupees in paise
    currency: str = Field("INR", regex=r'^[A-Z]{3}$')
    receipt: Optional[str] = Field(None, max_length=40)
    plan_type: Optional[str] = Field("premium", regex=r'^(premium|basic)$')
    
    @validator('amount')
    def validate_amount_paise(cls, v):
        if v < 100:  # Minimum 1 rupee
            raise ValueError('Amount must be at least 100 paise (₹1)')
        return v

class PaymentVerification(BaseModel):
    razorpay_order_id: str = Field(..., regex=r'^order_[A-Za-z0-9]+$')
    razorpay_payment_id: str = Field(..., regex=r'^pay_[A-Za-z0-9]+$')
    razorpay_signature: str = Field(..., min_length=64, max_length=256)

class IdempotencyRequest(BaseModel):
    idempotency_key: str = Field(..., min_length=16, max_length=64)
    request_data: Dict[str, Any]

# JWT Token Models
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None

# Security Functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token with expiration"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + JWT_EXPIRATION_DELTA
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    """Create JWT refresh token with longer expiration"""
    to_encode = data.copy()
    expire = datetime.utcnow() + JWT_REFRESH_EXPIRATION_DELTA
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> TokenData:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        if payload.get("type") != token_type:
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        return TokenData(user_id=user_id, email=email)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current authenticated user"""
    token_data = verify_token(credentials.credentials)
    
    user = await db.users.find_one({"id": token_data.user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

def hash_password(password: str) -> str:
    """Hash password using Argon2"""
    return argon2_hasher.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against Argon2 hash"""
    try:
        argon2_hasher.verify(hashed_password, plain_password)
        return True
    except VerifyMismatchError:
        return False

def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay webhook/payment signature"""
    try:
        # Create the signature verification string
        message = f"{order_id}|{payment_id}"
        
        # Generate expected signature
        expected_signature = hmac.new(
            razorpay_key_secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Constant-time comparison to prevent timing attacks
        return hmac.compare_digest(expected_signature, signature)
    except Exception as e:
        logging.error(f"Signature verification error: {e}")
        return False

# Idempotency handling
async def check_idempotency(idempotency_key: str, request_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Check if request with idempotency key already exists"""
    existing = await db.idempotent_requests.find_one({"idempotency_key": idempotency_key})
    
    if existing:
        # Verify request data matches
        if existing.get("request_hash") == hashlib.sha256(str(request_data).encode()).hexdigest():
            return existing.get("response_data")
        else:
            raise HTTPException(status_code=422, detail="Idempotency key conflict: request data mismatch")
    
    return None

async def store_idempotent_response(idempotency_key: str, request_data: Dict[str, Any], response_data: Dict[str, Any]):
    """Store response for idempotency"""
    await db.idempotent_requests.insert_one({
        "idempotency_key": idempotency_key,
        "request_hash": hashlib.sha256(str(request_data).encode()).hexdigest(),
        "request_data": request_data,
        "response_data": response_data,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(hours=24)
    })

# Enhanced utility functions
async def get_last_transaction() -> Optional[Transaction]:
    """Get the most recent transaction by timestamp"""
    last_tx = await db.transactions.find_one(
        sort=[("timestamp", -1)]
    )
    return Transaction(**last_tx) if last_tx else None

# API Routes with enhanced security

# Health check with rate limiting
@api_router.get("/health")
@limiter.limit("60/minute")
async def health_check(request: Request):
    return {
        "status": "healthy", 
        "service": "spendwise-api", 
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

# Authentication endpoints
@api_router.post("/auth/register", response_model=Token)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already registered")
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create user
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "password_hash": hashed_password,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    await db.users.insert_one(user)
    
    # Create tokens
    access_token = create_access_token(data={"sub": user["id"], "email": user["email"]})
    refresh_token = create_refresh_token(data={"sub": user["id"], "email": user["email"]})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int(JWT_EXPIRATION_DELTA.total_seconds())
    )

@api_router.post("/auth/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, user_credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"email": user_credentials.email})
    if not user or not verify_password(user_credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]}, 
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Create tokens
    access_token = create_access_token(data={"sub": user["id"], "email": user["email"]})
    refresh_token = create_refresh_token(data={"sub": user["id"], "email": user["email"]})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int(JWT_EXPIRATION_DELTA.total_seconds())
    )

@api_router.post("/auth/refresh", response_model=Token)
@limiter.limit("20/minute")
async def refresh_token(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = verify_token(credentials.credentials, token_type="refresh")
    
    # Verify user still exists
    user = await db.users.find_one({"id": token_data.user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Create new tokens
    access_token = create_access_token(data={"sub": user["id"], "email": user["email"]})
    new_refresh_token = create_refresh_token(data={"sub": user["id"], "email": user["email"]})
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=int(JWT_EXPIRATION_DELTA.total_seconds())
    )

# Enhanced Transaction routes with authentication and rate limiting
@api_router.get("/transactions", response_model=List[Transaction])
@limiter.limit("100/minute")
async def get_transactions(
    request: Request,
    skip: int = 0, 
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    if limit > 100:
        limit = 100
    
    transactions = await db.transactions.find(
        {"user_id": current_user["id"]}
    ).skip(skip).limit(limit).sort("timestamp", -1).to_list(limit)
    
    return [Transaction(**tx) for tx in transactions]

@api_router.post("/transactions", response_model=Transaction)
@limiter.limit("30/minute")
async def create_transaction(
    request: Request,
    transaction_data: TransactionCreate,
    background_tasks: BackgroundTasks,
    idempotency_key: Annotated[str, Header()] = None,
    current_user: dict = Depends(get_current_user)
):
    # Handle idempotency
    if idempotency_key:
        existing_response = await check_idempotency(idempotency_key, transaction_data.dict())
        if existing_response:
            return Transaction(**existing_response)
    
    # Get the last transaction for hash chaining
    last_tx = await db.transactions.find_one(
        {"user_id": current_user["id"]},
        sort=[("timestamp", -1)]
    )
    
    # Create blockchain transaction
    tx_dict = transaction_data.dict()
    tx_dict["id"] = str(uuid.uuid4())
    tx_dict["user_id"] = current_user["id"]
    
    if last_tx:
        blockchain_tx = create_new_transaction(tx_dict, Transaction(**last_tx).dict())
    else:
        blockchain_tx = create_new_transaction(tx_dict)
    
    # Create Transaction object
    transaction = Transaction(**blockchain_tx)
    
    # Save to database
    result = await db.transactions.insert_one(transaction.dict())
    
    # Store idempotent response
    if idempotency_key:
        await store_idempotent_response(idempotency_key, transaction_data.dict(), transaction.dict())
    
    return transaction

# Enhanced Payment routes with signature verification
@api_router.post("/payments/create-order")
@limiter.limit("20/minute")
async def create_payment_order(
    request: Request,
    order: PaymentOrder,
    idempotency_key: Annotated[str, Header()] = None,
    current_user: dict = Depends(get_current_user)
):
    # Handle idempotency
    if idempotency_key:
        existing_response = await check_idempotency(idempotency_key, order.dict())
        if existing_response:
            return existing_response
    
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": order.amount,
            "currency": order.currency,
            "receipt": order.receipt or f"receipt_{int(datetime.now().timestamp())}",
            "payment_capture": 1,
            "notes": {
                "plan_type": order.plan_type,
                "user_id": current_user["id"],
                "created_via": "spendwise_app"
            }
        })
        
        # Store order in database with user association
        order_data = {
            "order_id": razorpay_order["id"],
            "user_id": current_user["id"],
            "amount": order.amount,
            "currency": order.currency,
            "plan_type": order.plan_type,
            "status": "created",
            "created_at": datetime.utcnow(),
            "razorpay_data": razorpay_order
        }
        
        await db.payment_orders.insert_one(order_data)
        
        # Store idempotent response
        if idempotency_key:
            await store_idempotent_response(idempotency_key, order.dict(), razorpay_order)
        
        return razorpay_order
    except Exception as e:
        logging.error(f"Payment order creation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/payments/verify")
@limiter.limit("10/minute")
async def verify_payment(
    request: Request,
    payment_data: PaymentVerification,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Server-side signature verification (CRITICAL)
        if not verify_razorpay_signature(
            payment_data.razorpay_order_id,
            payment_data.razorpay_payment_id, 
            payment_data.razorpay_signature
        ):
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Update order status
        order_update_result = await db.payment_orders.update_one(
            {
                "order_id": payment_data.razorpay_order_id,
                "user_id": current_user["id"]  # Ensure user owns this order
            },
            {"$set": {
                "status": "paid",
                "payment_id": payment_data.razorpay_payment_id,
                "verified_at": datetime.utcnow(),
                "signature_verified": True
            }}
        )
        
        if order_update_result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Payment order not found or unauthorized")
        
        # Get order details to determine subscription
        order = await db.payment_orders.find_one({"order_id": payment_data.razorpay_order_id})
        
        subscription_activated = False
        if order and order.get("plan_type") == "premium":
            # Activate premium subscription (30 days)
            expiry_date = datetime.now() + timedelta(days=30)
            subscription_data = {
                "user_id": current_user["id"],
                "plan": "premium",
                "expiresAt": int(expiry_date.timestamp() * 1000),
                "receipt": payment_data.razorpay_payment_id,
                "lastVerifiedAt": int(datetime.now().timestamp() * 1000),
                "payment_order_id": payment_data.razorpay_order_id,
                "features": [
                    "advanced_analytics",
                    "export_data", 
                    "blockchain_sync",
                    "recurring_detection",
                    "cashflow_forecast"
                ]
            }
            
            # Upsert subscription state
            await db.subscriptions.update_one(
                {"user_id": current_user["id"]},
                {"$set": subscription_data},
                upsert=True
            )
            subscription_activated = True
        
        return {
            "status": "success", 
            "message": "Payment verified successfully",
            "subscription_activated": subscription_activated,
            "payment_id": payment_data.razorpay_payment_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Payment verification failed: {e}")
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {str(e)}")

# Enhanced Webhook endpoint with signature verification
@api_router.post("/webhook/razorpay")
@limiter.limit("100/minute")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhooks with proper signature verification"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        signature = request.headers.get('X-Razorpay-Signature', '')
        
        if not signature:
            raise HTTPException(status_code=400, detail="Missing signature")
        
        # Verify webhook signature
        webhook_secret = os.environ.get('RAZORPAY_WEBHOOK_SECRET', '')
        if webhook_secret:
            expected_signature = hmac.new(
                webhook_secret.encode('utf-8'),
                body,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(expected_signature, signature):
                raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
        # Parse request data
        request_data = await request.json()
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
    
    except HTTPException:
        raise
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
    logger.info("SpendWise API starting up with enhanced security features...")
    
    # Create indexes for performance and security
    await db.transactions.create_index([("user_id", 1), ("timestamp", -1)])
    await db.transactions.create_index([("categoryId", 1)])
    await db.transactions.create_index([("type", 1)])
    await db.payment_orders.create_index([("order_id", 1)], unique=True)
    await db.payment_orders.create_index([("user_id", 1), ("created_at", -1)])
    await db.subscriptions.create_index([("user_id", 1)], unique=True)
    await db.users.create_index([("email", 1)], unique=True)
    await db.idempotent_requests.create_index([("idempotency_key", 1)], unique=True)
    await db.idempotent_requests.create_index([("expires_at", 1)], expireAfterSeconds=0)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("SpendWise API shutting down...")

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    
    if os.getenv("NODE_ENV") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response
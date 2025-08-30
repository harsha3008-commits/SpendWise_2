"""
SpendWise API - Pydantic Models for Request/Response Validation
Security Hardening: Enhanced input validation with strict field validation
"""

from pydantic import BaseModel, Field, validator, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid
import re

# Enums for constrained values
class TransactionType(str, Enum):
    EXPENSE = "expense"
    INCOME = "income"  
    TRANSFER = "transfer"
    BILL = "bill"

class Currency(str, Enum):
    INR = "INR"
    USD = "USD"
    EUR = "EUR"

class PlanType(str, Enum):
    BASIC = "basic"
    PREMIUM = "premium"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"

# User Authentication Models
class UserCreate(BaseModel):
    """User registration model with enhanced validation"""
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=128, description="Password (8-128 chars)")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")
    
    @validator('password')
    def validate_password_strength(cls, v):
        """Enforce strong password requirements"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('Password must contain at least one special character')
        return v
    
    @validator('full_name')
    def validate_full_name(cls, v):
        """Validate full name format"""
        if v and not re.match(r'^[a-zA-Z\s\'-\.]+$', v):
            raise ValueError('Full name contains invalid characters')
        return v

class UserLogin(BaseModel):
    """User login model"""
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=128, description="Password")

class UserUpdate(BaseModel):
    """User profile update model"""
    full_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    
    @validator('full_name')
    def validate_full_name(cls, v):
        if v and not re.match(r'^[a-zA-Z\s\'-\.]+$', v):
            raise ValueError('Full name contains invalid characters')
        return v

# Transaction Models  
class TransactionBase(BaseModel):
    """Base transaction model with common fields"""
    type: TransactionType = Field(..., description="Transaction type")
    amount: float = Field(..., gt=0, le=10000000, description="Amount (max 1 crore)")
    currency: Currency = Field(Currency.INR, description="Currency code")
    categoryId: str = Field(..., min_length=1, max_length=50, description="Category ID")
    accountId: Optional[str] = Field(None, max_length=50, description="Account ID")
    note: Optional[str] = Field(None, max_length=500, description="Transaction note")
    merchant: Optional[str] = Field(None, max_length=200, description="Merchant name")
    tags: Optional[List[str]] = Field(default_factory=list, max_items=10, description="Tags")
    billDueAt: Optional[int] = Field(None, ge=0, description="Bill due date timestamp")
    isRecurring: bool = Field(False, description="Is recurring transaction")
    budgetId: Optional[str] = Field(None, max_length=50, description="Budget ID")
    walletAddress: Optional[str] = Field(None, max_length=42, description="Wallet address")
    
    @validator('amount')
    def validate_amount(cls, v):
        """Validate amount precision and range"""
        if v <= 0:
            raise ValueError('Amount must be positive')
        if v > 10000000:  # 1 crore limit
            raise ValueError('Amount exceeds maximum limit')
        return round(v, 2)  # Ensure 2 decimal places
    
    @validator('tags')
    def validate_tags(cls, v):
        """Validate tags format"""
        if v:
            for tag in v:
                if not isinstance(tag, str) or len(tag) > 30:
                    raise ValueError('Each tag must be a string with max 30 characters')
                if not re.match(r'^[a-zA-Z0-9_-]+$', tag):
                    raise ValueError('Tags can only contain letters, numbers, underscore, and dash')
        return v
    
    @validator('walletAddress')
    def validate_wallet_address(cls, v):
        """Validate Ethereum wallet address format"""
        if v and not re.match(r'^0x[a-fA-F0-9]{40}$', v):
            raise ValueError('Invalid Ethereum wallet address format')
        return v

class TransactionCreate(TransactionBase):
    """Transaction creation model"""
    pass

class TransactionUpdate(BaseModel):
    """Transaction update model - partial updates allowed"""
    type: Optional[TransactionType] = None
    amount: Optional[float] = Field(None, gt=0, le=10000000)
    currency: Optional[Currency] = None
    categoryId: Optional[str] = Field(None, min_length=1, max_length=50)
    accountId: Optional[str] = Field(None, max_length=50)
    note: Optional[str] = Field(None, max_length=500)
    merchant: Optional[str] = Field(None, max_length=200)
    tags: Optional[List[str]] = Field(None, max_items=10)
    billDueAt: Optional[int] = Field(None, ge=0)
    isRecurring: Optional[bool] = None
    budgetId: Optional[str] = Field(None, max_length=50)
    isPaid: Optional[bool] = None

class Transaction(TransactionBase):
    """Complete transaction model with system fields"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="User ID who owns this transaction")
    timestamp: int = Field(default_factory=lambda: int(datetime.utcnow().timestamp() * 1000))
    attachmentIds: Optional[List[str]] = Field(default_factory=list)
    previousHash: str = Field("", description="Previous transaction hash for blockchain")
    currentHash: str = Field("", description="Current transaction hash")
    version: int = Field(1, description="Transaction version")
    blockchainTxHash: Optional[str] = Field(None, description="Blockchain transaction hash")
    isPaid: bool = Field(False, description="Payment status for bills")
    nonce: int = Field(0, description="Nonce for hash computation")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

# Category Models
class CategoryCreate(BaseModel):
    """Category creation model"""
    name: str = Field(..., min_length=1, max_length=50, description="Category name")
    type: TransactionType = Field(..., description="Category type")
    color: str = Field(..., pattern=r'^#[0-9A-Fa-f]{6}$', description="Hex color code")
    icon: Optional[str] = Field(None, max_length=50, description="Icon name")
    description: Optional[str] = Field(None, max_length=200, description="Category description")
    
    @validator('name')
    def validate_category_name(cls, v):
        """Validate category name format"""
        if not re.match(r'^[a-zA-Z0-9\s\'-&]+$', v):
            raise ValueError('Category name contains invalid characters')
        return v.strip()

class Category(CategoryCreate):
    """Complete category model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="User ID who owns this category")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    isActive: bool = Field(True, description="Is category active")

# Budget Models
class BudgetCreate(BaseModel):
    """Budget creation model"""
    name: str = Field(..., min_length=1, max_length=100, description="Budget name")
    categoryId: str = Field(..., min_length=1, max_length=50, description="Category ID")
    amount: float = Field(..., gt=0, le=10000000, description="Budget amount")
    period: str = Field(..., pattern=r'^(weekly|monthly|yearly)$', description="Budget period")
    startDate: int = Field(..., ge=0, description="Start date timestamp")
    endDate: int = Field(..., ge=0, description="End date timestamp")
    alertThreshold: Optional[float] = Field(80.0, ge=0, le=100, description="Alert threshold %")
    
    @validator('endDate')
    def validate_date_range(cls, v, values):
        """Validate end date is after start date"""
        if 'startDate' in values and v <= values['startDate']:
            raise ValueError('End date must be after start date')
        return v

class Budget(BudgetCreate):
    """Complete budget model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="User ID who owns this budget")
    spent: float = Field(0.0, ge=0, description="Amount spent")
    remaining: float = Field(0.0, description="Amount remaining")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    isActive: bool = Field(True, description="Is budget active")

# Bill Models
class BillCreate(BaseModel):
    """Bill creation model"""
    name: str = Field(..., min_length=1, max_length=100, description="Bill name")
    amount: float = Field(..., gt=0, le=10000000, description="Bill amount")
    currency: Currency = Field(Currency.INR, description="Currency")
    categoryId: str = Field(..., min_length=1, max_length=50, description="Category ID")
    dueDate: int = Field(..., ge=0, description="Due date timestamp")
    isRecurring: bool = Field(False, description="Is recurring bill")
    recurringPeriod: Optional[str] = Field(None, pattern=r'^(weekly|monthly|quarterly|yearly)$')
    reminder: Optional[int] = Field(None, ge=0, le=30, description="Reminder days before due")
    notes: Optional[str] = Field(None, max_length=500, description="Bill notes")
    
    @validator('recurringPeriod')
    def validate_recurring_period(cls, v, values):
        """Validate recurring period is set when bill is recurring"""
        if values.get('isRecurring') and not v:
            raise ValueError('Recurring period must be specified for recurring bills')
        return v

class Bill(BillCreate):
    """Complete bill model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="User ID who owns this bill")
    isPaid: bool = Field(False, description="Payment status")
    paidAt: Optional[datetime] = Field(None, description="Payment timestamp")
    transactionId: Optional[str] = Field(None, description="Associated transaction ID")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    lastReminded: Optional[datetime] = Field(None, description="Last reminder sent")

# Payment Models
class PaymentOrderCreate(BaseModel):
    """Payment order creation model"""
    amount: int = Field(..., gt=99, le=1000000000, description="Amount in paise (min ₹1)")
    currency: Currency = Field(Currency.INR, description="Currency code")
    receipt: Optional[str] = Field(None, max_length=40, description="Receipt identifier")
    plan_type: PlanType = Field(PlanType.PREMIUM, description="Subscription plan type")
    
    @validator('amount')
    def validate_amount_paise(cls, v):
        """Validate amount in paise"""
        if v < 100:  # Minimum 1 rupee
            raise ValueError('Amount must be at least 100 paise (₹1)')
        return v
    
    @validator('receipt')
    def validate_receipt(cls, v):
        """Validate receipt format"""
        if v and not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Receipt can only contain alphanumeric characters, underscore, and dash')
        return v

class PaymentVerification(BaseModel):
    """Payment verification model"""
    razorpay_order_id: str = Field(..., pattern=r'^order_[A-Za-z0-9]+$', description="Razorpay order ID")
    razorpay_payment_id: str = Field(..., pattern=r'^pay_[A-Za-z0-9]+$', description="Razorpay payment ID")
    razorpay_signature: str = Field(..., min_length=64, max_length=256, description="Payment signature")

class PaymentOrder(BaseModel):
    """Payment order response model"""
    id: str
    entity: str
    amount: int
    amount_paid: int
    amount_due: int
    currency: str
    receipt: Optional[str]
    status: str
    created_at: int

# Subscription Models
class SubscriptionCreate(BaseModel):
    """Subscription creation model"""
    plan: PlanType = Field(..., description="Subscription plan")
    payment_order_id: str = Field(..., description="Associated payment order ID")
    
class Subscription(BaseModel):
    """Complete subscription model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="User ID")
    plan: PlanType = Field(..., description="Subscription plan")
    status: SubscriptionStatus = Field(SubscriptionStatus.ACTIVE, description="Subscription status")
    expiresAt: int = Field(..., ge=0, description="Expiry timestamp")
    receipt: str = Field(..., description="Payment receipt/ID")
    lastVerifiedAt: int = Field(..., description="Last verification timestamp")
    payment_order_id: str = Field(..., description="Payment order ID")
    features: List[str] = Field(default_factory=list, description="Available features")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

# Analytics Models
class DateRange(BaseModel):
    """Date range for analytics"""
    start_date: int = Field(..., ge=0, description="Start date timestamp")
    end_date: int = Field(..., ge=0, description="End date timestamp")
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        """Validate end date is after start date"""
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v

class AnalyticsRequest(BaseModel):
    """Analytics request model"""
    date_range: Optional[DateRange] = None
    category_ids: Optional[List[str]] = Field(None, max_items=50)
    transaction_types: Optional[List[TransactionType]] = None
    include_predictions: bool = Field(False, description="Include AI predictions")

# Utility Models
class IdempotencyRequest(BaseModel):
    """Idempotency request wrapper"""
    idempotency_key: str = Field(..., min_length=16, max_length=64, description="Unique idempotency key")
    request_data: Dict[str, Any] = Field(..., description="Request payload")
    
    @validator('idempotency_key')
    def validate_idempotency_key(cls, v):
        """Validate idempotency key format"""
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Idempotency key can only contain alphanumeric characters, underscore, and dash')
        return v

# JWT Models
class Token(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    """JWT token payload data"""
    user_id: Optional[str] = None
    email: Optional[str] = None

# Response Models
class APIResponse(BaseModel):
    """Standard API response wrapper"""
    status: str = Field(..., pattern=r'^(success|error)$')
    message: str
    data: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None

class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""
    items: List[Any]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    per_page: int = Field(..., ge=1, le=100)
    has_next: bool
    has_prev: bool

# Webhook Models
class RazorpayWebhook(BaseModel):
    """Razorpay webhook payload"""
    entity: str
    account_id: str
    event: str
    contains: List[str]
    payload: Dict[str, Any]
    created_at: int

# Blockchain Models  
class LedgerVerificationRequest(BaseModel):
    """Ledger verification request"""
    user_id: Optional[str] = None
    start_date: Optional[int] = Field(None, ge=0)
    end_date: Optional[int] = Field(None, ge=0)
    include_hash_details: bool = Field(False, description="Include detailed hash information")

class BlockchainAnchorRequest(BaseModel):
    """Blockchain anchor request"""
    transaction_ids: List[str] = Field(..., min_items=1, max_items=100)
    network: str = Field("polygon", pattern=r'^(polygon|ethereum|arbitrum)$')
    wallet_address: str = Field(..., pattern=r'^0x[a-fA-F0-9]{40}$')

# File Upload Models
class FileUpload(BaseModel):
    """File upload metadata"""
    filename: str = Field(..., max_length=255)
    content_type: str = Field(..., max_length=100)
    size: int = Field(..., gt=0, le=5242880)  # Max 5MB
    
    @validator('filename')
    def validate_filename(cls, v):
        """Validate filename format and extension"""
        if not re.match(r'^[a-zA-Z0-9._-]+$', v):
            raise ValueError('Filename contains invalid characters')
        
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.pdf', '.csv', '.xlsx']
        if not any(v.lower().endswith(ext) for ext in allowed_extensions):
            raise ValueError('File type not allowed')
        
        return v
    
    @validator('content_type')
    def validate_content_type(cls, v):
        """Validate content type"""
        allowed_types = [
            'image/jpeg', 'image/png', 'application/pdf', 
            'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]
        if v not in allowed_types:
            raise ValueError('Content type not allowed')
        return v

# Export Models
class ExportRequest(BaseModel):
    """Data export request"""
    format: str = Field(..., pattern=r'^(csv|xlsx|pdf|json)$')
    date_range: Optional[DateRange] = None
    include_attachments: bool = Field(False, description="Include file attachments")
    categories: Optional[List[str]] = Field(None, max_items=50)
    
class ExportStatus(BaseModel):
    """Export status response"""
    export_id: str
    status: str = Field(..., pattern=r'^(pending|processing|completed|failed)$')
    progress: int = Field(..., ge=0, le=100)
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None
#!/usr/bin/env python3
"""
SpendWise Backend API Test Suite
Tests all backend endpoints including blockchain-style transaction chaining
"""

import requests
import json
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Configuration
BASE_URL = "https://fintrack-app-20.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class SpendWiseAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.test_results = []
        self.auth_token = None
        self.refresh_token = None
        self.test_user_email = f"testuser_{int(time.time())}@spendwise.com"
        self.test_user_password = "TestPass123!"
        self.created_resources = {
            'transactions': [],
            'categories': [],
            'budgets': [],
            'bills': [],
            'users': []
        }
    
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_data': response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, use_auth: bool = False) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        headers = self.headers.copy()
        
        # Add authentication header if requested and token is available
        if use_auth and self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, f"Unsupported method: {method}", 400
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return response.status_code < 400, response_data, response.status_code
        except requests.exceptions.RequestException as e:
            return False, str(e), 0

    def compute_expected_hash(self, tx_data: Dict) -> str:
        """Compute expected hash for transaction verification"""
        hash_input = f"{tx_data['id']}|{tx_data['amount']}|{tx_data['currency']}|{tx_data['categoryId']}|{tx_data['timestamp']}|{tx_data.get('billDueAt', '')}|{tx_data['previousHash']}"
        return hashlib.sha256(hash_input.encode()).hexdigest()

    # ===== AUTHENTICATION TESTS =====
    
    def test_user_registration(self):
        """Test user registration with JWT authentication"""
        user_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        success, data, status_code = self.make_request("POST", "/auth/register", user_data)
        
        if success and isinstance(data, dict) and "access_token" in data:
            self.auth_token = data["access_token"]
            self.refresh_token = data["refresh_token"]
            self.log_test("User Registration", True, f"User registered successfully with JWT tokens")
            return True
        else:
            self.log_test("User Registration", False, f"Registration failed. Status: {status_code}", data)
            return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        login_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        success, data, status_code = self.make_request("POST", "/auth/login", login_data)
        
        if success and isinstance(data, dict) and "access_token" in data:
            self.auth_token = data["access_token"]
            self.refresh_token = data["refresh_token"]
            self.log_test("User Login", True, f"Login successful with JWT tokens")
            return True
        else:
            self.log_test("User Login", False, f"Login failed. Status: {status_code}", data)
            return False

    def test_token_refresh(self):
        """Test JWT token refresh functionality"""
        if not self.refresh_token:
            self.log_test("Token Refresh", False, "No refresh token available")
            return False
        
        # Use refresh token in Authorization header
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {self.refresh_token}"
        
        try:
            response = requests.post(f"{self.base_url}/auth/refresh", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.auth_token = data["access_token"]
                    self.refresh_token = data["refresh_token"]
                    self.log_test("Token Refresh", True, "Token refreshed successfully")
                    return True
            
            self.log_test("Token Refresh", False, f"Token refresh failed. Status: {response.status_code}")
            return False
        except Exception as e:
            self.log_test("Token Refresh", False, f"Token refresh error: {str(e)}")
            return False

    def test_invalid_token_rejection(self):
        """Test that invalid tokens are properly rejected"""
        # Save current token
        original_token = self.auth_token
        
        # Use invalid token
        self.auth_token = "invalid_token_12345"
        
        success, data, status_code = self.make_request("GET", "/transactions", use_auth=True)
        
        # Restore original token
        self.auth_token = original_token
        
        if status_code == 401:
            self.log_test("Invalid Token Rejection", True, "Invalid token correctly rejected with 401")
        else:
            self.log_test("Invalid Token Rejection", False, f"Expected 401, got {status_code}")

    def test_unauthorized_access_protection(self):
        """Test that endpoints require authentication"""
        # Save current token
        original_token = self.auth_token
        
        # Remove token
        self.auth_token = None
        
        success, data, status_code = self.make_request("GET", "/transactions", use_auth=True)
        
        # Restore original token
        self.auth_token = original_token
        
        if status_code in [401, 403]:
            self.log_test("Unauthorized Access Protection", True, f"Unauthorized access correctly blocked with {status_code}")
        else:
            self.log_test("Unauthorized Access Protection", False, f"Expected 401/403, got {status_code}")

    # ===== AI ANALYSIS TESTS =====
    
    def test_ai_expense_analysis(self):
        """Test AI-powered expense analysis endpoint"""
        if not self.auth_token:
            self.log_test("AI Expense Analysis", False, "No authentication token available")
            return
        
        # First create some test transactions for analysis
        self.create_sample_transactions_for_ai()
        
        analysis_data = {
            "user_id": "test-user-id",  # This should be extracted from JWT in real implementation
            "analysis_type": "spending_patterns",
            "time_period": "current_month"
        }
        
        success, data, status_code = self.make_request("POST", "/ai/analyze", analysis_data, use_auth=True)
        
        if success and isinstance(data, dict):
            required_fields = ["success", "analysis_type", "insights", "recommendations", "summary"]
            if all(field in data for field in required_fields):
                self.log_test("AI Expense Analysis", True, f"AI analysis completed with {len(data.get('insights', []))} insights")
            else:
                missing_fields = [field for field in required_fields if field not in data]
                self.log_test("AI Expense Analysis", False, f"Missing required fields: {missing_fields}")
        else:
            self.log_test("AI Expense Analysis", False, f"AI analysis failed. Status: {status_code}", data)

    def test_ai_budget_suggestions(self):
        """Test AI budget suggestions analysis"""
        if not self.auth_token:
            self.log_test("AI Budget Suggestions", False, "No authentication token available")
            return
        
        analysis_data = {
            "user_id": "test-user-id",
            "analysis_type": "budget_suggestions",
            "time_period": "current_month"
        }
        
        success, data, status_code = self.make_request("POST", "/ai/analyze", analysis_data, use_auth=True)
        
        if success and isinstance(data, dict) and data.get("success"):
            self.log_test("AI Budget Suggestions", True, f"Budget suggestions generated successfully")
        else:
            self.log_test("AI Budget Suggestions", False, f"Budget suggestions failed. Status: {status_code}", data)

    def test_ai_quick_insights(self):
        """Test quick AI insights for dashboard"""
        if not self.auth_token:
            self.log_test("AI Quick Insights", False, "No authentication token available")
            return
        
        success, data, status_code = self.make_request("GET", "/ai/quick-insights", use_auth=True)
        
        if success and isinstance(data, dict) and "insights" in data:
            insights = data["insights"]
            if isinstance(insights, list) and len(insights) > 0:
                self.log_test("AI Quick Insights", True, f"Retrieved {len(insights)} quick insights")
            else:
                self.log_test("AI Quick Insights", True, "No insights available (expected for new user)")
        else:
            self.log_test("AI Quick Insights", False, f"Quick insights failed. Status: {status_code}", data)

    # ===== PREMIUM FEATURES TESTS =====
    
    def test_premium_status_check(self):
        """Test premium subscription status endpoint"""
        if not self.auth_token:
            self.log_test("Premium Status Check", False, "No authentication token available")
            return
        
        success, data, status_code = self.make_request("GET", "/premium/status", use_auth=True)
        
        if success and isinstance(data, dict):
            required_fields = ["isPremium", "plan", "features"]
            if all(field in data for field in required_fields):
                self.log_test("Premium Status Check", True, f"Premium status: {data.get('plan', 'unknown')}")
            else:
                missing_fields = [field for field in required_fields if field not in data]
                self.log_test("Premium Status Check", False, f"Missing required fields: {missing_fields}")
        else:
            self.log_test("Premium Status Check", False, f"Premium status check failed. Status: {status_code}", data)

    def test_premium_upgrade(self):
        """Test premium upgrade functionality"""
        if not self.auth_token:
            self.log_test("Premium Upgrade", False, "No authentication token available")
            return
        
        success, data, status_code = self.make_request("POST", "/premium/upgrade", use_auth=True)
        
        if success and isinstance(data, dict):
            if data.get("success") and data.get("isPremium"):
                self.log_test("Premium Upgrade", True, "Premium upgrade successful")
            else:
                self.log_test("Premium Upgrade", False, "Premium upgrade response invalid", data)
        else:
            self.log_test("Premium Upgrade", False, f"Premium upgrade failed. Status: {status_code}", data)

    def test_monthly_report_generation(self):
        """Test monthly financial report generation"""
        if not self.auth_token:
            self.log_test("Monthly Report Generation", False, "No authentication token available")
            return
        
        success, data, status_code = self.make_request("GET", "/analytics/monthly-report", use_auth=True)
        
        if success and isinstance(data, dict):
            required_fields = ["success", "totalIncome", "totalExpenses", "netSavings", "healthScore"]
            if all(field in data for field in required_fields):
                self.log_test("Monthly Report Generation", True, f"Monthly report generated with health score: {data.get('healthScore', 'N/A')}")
            else:
                missing_fields = [field for field in required_fields if field not in data]
                self.log_test("Monthly Report Generation", False, f"Missing required fields: {missing_fields}")
        else:
            self.log_test("Monthly Report Generation", False, f"Monthly report failed. Status: {status_code}", data)

    def test_rate_limiting_on_ai_endpoints(self):
        """Test rate limiting on AI analysis endpoints"""
        if not self.auth_token:
            self.log_test("Rate Limiting on AI Endpoints", False, "No authentication token available")
            return
        
        analysis_data = {
            "user_id": "test-user-id",
            "analysis_type": "spending_patterns",
            "time_period": "current_month"
        }
        
        # Make multiple rapid requests to test rate limiting
        rate_limited = False
        for i in range(12):  # Exceed the 10/minute limit
            success, data, status_code = self.make_request("POST", "/ai/analyze", analysis_data, use_auth=True)
            if status_code == 429:  # Too Many Requests
                rate_limited = True
                break
            time.sleep(0.1)  # Small delay between requests
        
        if rate_limited:
            self.log_test("Rate Limiting on AI Endpoints", True, "Rate limiting working correctly (429 status)")
        else:
            self.log_test("Rate Limiting on AI Endpoints", False, "Rate limiting not triggered or not working")

    def create_sample_transactions_for_ai(self):
        """Create sample transactions for AI analysis testing"""
        if not self.auth_token:
            return
        
        # Create a category first
        category_data = {
            "name": "AI Test Food",
            "icon": "🍔",
            "color": "#FF5722",
            "type": "expense"
        }
        
        success, cat_data, _ = self.make_request("POST", "/categories", category_data, use_auth=True)
        if not success:
            return
        
        category_id = cat_data.get("id")
        if not category_id:
            return
        
        # Create sample transactions
        sample_transactions = [
            {"type": "expense", "amount": 250.0, "categoryId": category_id, "note": "Lunch at restaurant"},
            {"type": "expense", "amount": 150.0, "categoryId": category_id, "note": "Grocery shopping"},
            {"type": "income", "amount": 5000.0, "categoryId": category_id, "note": "Salary payment"},
            {"type": "expense", "amount": 80.0, "categoryId": category_id, "note": "Coffee and snacks"}
        ]
        
        for tx_data in sample_transactions:
            tx_data["currency"] = "INR"
            self.make_request("POST", "/transactions", tx_data, use_auth=True)

    def test_health_check(self):
        """Test health check endpoint"""
        success, data, status_code = self.make_request("GET", "/health")
        
        if success and isinstance(data, dict) and data.get("status") == "healthy":
            self.log_test("Health Check", True, f"Service is healthy: {data}")
        else:
            self.log_test("Health Check", False, f"Health check failed. Status: {status_code}", data)

    def test_create_category(self) -> str:
        """Create a test category and return its ID"""
        category_data = {
            "name": "Test Groceries",
            "icon": "🛒",
            "color": "#4CAF50",
            "type": "expense",
            "budgetMonthly": 5000.0,
            "isDefault": False
        }
        
        success, data, status_code = self.make_request("POST", "/categories", category_data, use_auth=True)
        
        if success and isinstance(data, dict) and "id" in data:
            category_id = data["id"]
            self.created_resources['categories'].append(category_id)
            self.log_test("Create Category", True, f"Created category with ID: {category_id}")
            return category_id
        else:
            self.log_test("Create Category", False, f"Failed to create category. Status: {status_code}", data)
            return None

    def test_get_categories(self):
        """Test getting all categories"""
        success, data, status_code = self.make_request("GET", "/categories", use_auth=True)
        
        if success and isinstance(data, list):
            self.log_test("Get Categories", True, f"Retrieved {len(data)} categories")
        else:
            self.log_test("Get Categories", False, f"Failed to get categories. Status: {status_code}", data)

    def test_create_transaction(self, category_id: str) -> str:
        """Create a test transaction and return its ID"""
        transaction_data = {
            "type": "expense",
            "amount": 150.75,
            "currency": "INR",
            "categoryId": category_id,
            "note": "Weekly grocery shopping",
            "merchant": "SuperMart",
            "tags": ["groceries", "weekly"],
            "isRecurring": False
        }
        
        success, data, status_code = self.make_request("POST", "/transactions", transaction_data, use_auth=True)
        
        if success and isinstance(data, dict) and "id" in data:
            transaction_id = data["id"]
            self.created_resources['transactions'].append(transaction_id)
            
            # Verify blockchain properties
            if "previousHash" in data and "currentHash" in data:
                # For first transaction, previousHash should be "0"
                expected_prev_hash = "0"  # Assuming this is the first transaction
                if data["previousHash"] == expected_prev_hash:
                    # Verify hash computation
                    expected_hash = self.compute_expected_hash(data)
                    if data["currentHash"] == expected_hash:
                        self.log_test("Create Transaction", True, f"Created transaction with valid blockchain hash: {transaction_id}")
                    else:
                        self.log_test("Create Transaction", False, f"Transaction hash mismatch. Expected: {expected_hash}, Got: {data['currentHash']}")
                else:
                    self.log_test("Create Transaction", False, f"Invalid previousHash. Expected: {expected_prev_hash}, Got: {data['previousHash']}")
            else:
                self.log_test("Create Transaction", False, "Transaction missing blockchain hash fields")
            
            return transaction_id
        else:
            self.log_test("Create Transaction", False, f"Failed to create transaction. Status: {status_code}", data)
            return None

    def test_create_second_transaction(self, category_id: str, first_tx_hash: str) -> str:
        """Create a second transaction to test hash chaining"""
        transaction_data = {
            "type": "income",
            "amount": 5000.0,
            "currency": "INR",
            "categoryId": category_id,
            "note": "Salary payment",
            "isRecurring": True
        }
        
        success, data, status_code = self.make_request("POST", "/transactions", transaction_data)
        
        if success and isinstance(data, dict) and "id" in data:
            transaction_id = data["id"]
            self.created_resources['transactions'].append(transaction_id)
            
            # Verify hash chaining
            if data["previousHash"] == first_tx_hash:
                expected_hash = self.compute_expected_hash(data)
                if data["currentHash"] == expected_hash:
                    self.log_test("Create Second Transaction (Hash Chain)", True, f"Hash chaining verified for transaction: {transaction_id}")
                else:
                    self.log_test("Create Second Transaction (Hash Chain)", False, f"Hash computation failed for chained transaction")
            else:
                self.log_test("Create Second Transaction (Hash Chain)", False, f"Hash chain broken. Expected previousHash: {first_tx_hash}, Got: {data['previousHash']}")
            
            return transaction_id
        else:
            self.log_test("Create Second Transaction (Hash Chain)", False, f"Failed to create second transaction. Status: {status_code}", data)
            return None

    def test_get_transactions(self):
        """Test getting all transactions"""
        success, data, status_code = self.make_request("GET", "/transactions", use_auth=True)
        
        if success and isinstance(data, list):
            self.log_test("Get Transactions", True, f"Retrieved {len(data)} transactions")
            return data
        else:
            self.log_test("Get Transactions", False, f"Failed to get transactions. Status: {status_code}", data)
            return []

    def test_get_single_transaction(self, transaction_id: str):
        """Test getting a single transaction by ID"""
        success, data, status_code = self.make_request("GET", f"/transactions/{transaction_id}", use_auth=True)
        
        if success and isinstance(data, dict) and data.get("id") == transaction_id:
            self.log_test("Get Single Transaction", True, f"Retrieved transaction: {transaction_id}")
        else:
            self.log_test("Get Single Transaction", False, f"Failed to get transaction {transaction_id}. Status: {status_code}", data)

    def test_update_transaction(self, transaction_id: str):
        """Test updating a transaction"""
        update_data = {
            "amount": 200.0,
            "note": "Updated grocery shopping amount"
        }
        
        success, data, status_code = self.make_request("PUT", f"/transactions/{transaction_id}", update_data, use_auth=True)
        
        if success and isinstance(data, dict):
            # Verify hash was recomputed
            expected_hash = self.compute_expected_hash(data)
            if data["currentHash"] == expected_hash:
                self.log_test("Update Transaction", True, f"Transaction updated with recomputed hash: {transaction_id}")
            else:
                self.log_test("Update Transaction", False, f"Hash not properly recomputed after update")
        else:
            self.log_test("Update Transaction", False, f"Failed to update transaction {transaction_id}. Status: {status_code}", data)

    def test_ledger_verification(self):
        """Test ledger verification endpoint"""
        success, data, status_code = self.make_request("GET", "/ledger/verify", use_auth=True)
        
        if success and isinstance(data, dict):
            if data.get("ok") == True:
                self.log_test("Ledger Verification", True, f"Ledger verified successfully. Verified {data.get('verifiedCount', 0)} transactions")
            else:
                self.log_test("Ledger Verification", False, f"Ledger verification failed: {data.get('errors', 'Unknown error')}")
        else:
            self.log_test("Ledger Verification", False, f"Failed to verify ledger. Status: {status_code}", data)

    def test_create_budget(self, category_id: str) -> str:
        """Create a test budget"""
        start_date = int(datetime.now().timestamp() * 1000)
        end_date = int((datetime.now() + timedelta(days=30)).timestamp() * 1000)
        
        budget_data = {
            "name": "Monthly Grocery Budget",
            "categoryIds": [category_id],
            "amount": 8000.0,
            "period": "monthly",
            "startDate": start_date,
            "endDate": end_date,
            "isActive": True,
            "notifications": True
        }
        
        success, data, status_code = self.make_request("POST", "/budgets", budget_data, use_auth=True)
        
        if success and isinstance(data, dict) and "id" in data:
            budget_id = data["id"]
            self.created_resources['budgets'].append(budget_id)
            self.log_test("Create Budget", True, f"Created budget with ID: {budget_id}")
            return budget_id
        else:
            self.log_test("Create Budget", False, f"Failed to create budget. Status: {status_code}", data)
            return None

    def test_get_budgets(self):
        """Test getting all budgets"""
        success, data, status_code = self.make_request("GET", "/budgets", use_auth=True)
        
        if success and isinstance(data, list):
            self.log_test("Get Budgets", True, f"Retrieved {len(data)} budgets")
        else:
            self.log_test("Get Budgets", False, f"Failed to get budgets. Status: {status_code}", data)

    def test_create_bill(self, category_id: str) -> str:
        """Create a test bill"""
        due_date = int((datetime.now() + timedelta(days=15)).timestamp() * 1000)
        
        bill_data = {
            "name": "Electricity Bill",
            "amount": 2500.0,
            "dueDate": due_date,
            "categoryId": category_id,
            "isRecurring": True,
            "isPaid": False,
            "reminderDays": [7, 3, 1]
        }
        
        success, data, status_code = self.make_request("POST", "/bills", bill_data, use_auth=True)
        
        if success and isinstance(data, dict) and "id" in data:
            bill_id = data["id"]
            self.created_resources['bills'].append(bill_id)
            self.log_test("Create Bill", True, f"Created bill with ID: {bill_id}")
            return bill_id
        else:
            self.log_test("Create Bill", False, f"Failed to create bill. Status: {status_code}", data)
            return None

    def test_get_bills(self):
        """Test getting all bills"""
        success, data, status_code = self.make_request("GET", "/bills", use_auth=True)
        
        if success and isinstance(data, list):
            self.log_test("Get Bills", True, f"Retrieved {len(data)} bills")
        else:
            self.log_test("Get Bills", False, f"Failed to get bills. Status: {status_code}", data)

    def test_create_payment_order(self):
        """Test creating a Razorpay payment order"""
        order_data = {
            "amount": 50000,  # Amount in paise (500 INR)
            "currency": "INR",
            "receipt": f"receipt_{int(time.time())}"
        }
        
        success, data, status_code = self.make_request("POST", "/payments/create-order", order_data, use_auth=True)
        
        if success and isinstance(data, dict) and "id" in data:
            self.log_test("Create Payment Order", True, f"Created Razorpay order: {data['id']}")
            return data
        else:
            self.log_test("Create Payment Order", False, f"Failed to create payment order. Status: {status_code}", data)
            return None

    def test_analytics_summary(self):
        """Test analytics summary endpoint"""
        success, data, status_code = self.make_request("GET", "/analytics/summary", use_auth=True)
        
        if success and isinstance(data, dict):
            required_fields = ["totalIncome", "totalExpenses", "netWorth", "categoryBreakdown", "transactionCount"]
            if all(field in data for field in required_fields):
                self.log_test("Analytics Summary", True, f"Analytics data retrieved successfully")
            else:
                missing_fields = [field for field in required_fields if field not in data]
                self.log_test("Analytics Summary", False, f"Missing required fields: {missing_fields}")
        else:
            self.log_test("Analytics Summary", False, f"Failed to get analytics summary. Status: {status_code}", data)

    def test_delete_transaction(self, transaction_id: str):
        """Test deleting a transaction"""
        success, data, status_code = self.make_request("DELETE", f"/transactions/{transaction_id}", use_auth=True)
        
        if success:
            self.log_test("Delete Transaction", True, f"Successfully deleted transaction: {transaction_id}")
        else:
            self.log_test("Delete Transaction", False, f"Failed to delete transaction {transaction_id}. Status: {status_code}", data)

    def test_error_cases(self):
        """Test various error scenarios"""
        # Test getting non-existent transaction
        success, data, status_code = self.make_request("GET", "/transactions/non-existent-id")
        if status_code == 404:
            self.log_test("Error Handling - Non-existent Transaction", True, "Correctly returned 404 for non-existent transaction")
        else:
            self.log_test("Error Handling - Non-existent Transaction", False, f"Expected 404, got {status_code}")

        # Test creating transaction with invalid data
        invalid_data = {"type": "invalid_type", "amount": "not_a_number"}
        success, data, status_code = self.make_request("POST", "/transactions", invalid_data)
        if status_code >= 400:
            self.log_test("Error Handling - Invalid Transaction Data", True, "Correctly rejected invalid transaction data")
        else:
            self.log_test("Error Handling - Invalid Transaction Data", False, f"Should have rejected invalid data, got {status_code}")

    def run_all_tests(self):
        """Run the complete test suite including Premium Features"""
        print("🚀 Starting SpendWise Premium Features Backend API Test Suite")
        print("=" * 70)
        
        # Basic health check (no auth required)
        self.test_health_check()
        
        # ===== AUTHENTICATION FLOW TESTS =====
        print("\n🔐 TESTING AUTHENTICATION SYSTEM")
        print("-" * 50)
        
        # Test user registration
        if not self.test_user_registration():
            print("❌ Cannot continue tests without successful registration")
            return
        
        # Test user login
        self.test_user_login()
        
        # Test token refresh
        self.test_token_refresh()
        
        # Test security features
        self.test_invalid_token_rejection()
        self.test_unauthorized_access_protection()
        
        # ===== PREMIUM FEATURES TESTS =====
        print("\n💎 TESTING PREMIUM FEATURES")
        print("-" * 50)
        
        # Test premium status management
        self.test_premium_status_check()
        self.test_premium_upgrade()
        
        # Test monthly report generation
        self.test_monthly_report_generation()
        
        # ===== AI ANALYSIS TESTS =====
        print("\n🤖 TESTING AI ANALYSIS ENDPOINTS")
        print("-" * 50)
        
        # Test AI analysis features
        self.test_ai_expense_analysis()
        self.test_ai_budget_suggestions()
        self.test_ai_quick_insights()
        
        # Test rate limiting on AI endpoints
        self.test_rate_limiting_on_ai_endpoints()
        
        # ===== CORE FUNCTIONALITY TESTS (with authentication) =====
        print("\n⚙️ TESTING CORE FUNCTIONALITY WITH AUTHENTICATION")
        print("-" * 50)
        
        # Create test category first (needed for other tests)
        category_id = self.test_create_category()
        if not category_id:
            print("❌ Cannot continue transaction tests without a valid category")
        else:
            # Test category operations
            self.test_get_categories()
            
            # Test transaction operations with blockchain verification
            first_tx_id = self.test_create_transaction(category_id)
            if first_tx_id:
                # Get the first transaction to get its hash for chaining
                transactions = self.test_get_transactions()
                first_tx_hash = None
                if transactions:
                    for tx in transactions:
                        if tx["id"] == first_tx_id:
                            first_tx_hash = tx["currentHash"]
                            break
                
                if first_tx_hash:
                    # Create second transaction to test chaining
                    second_tx_id = self.test_create_second_transaction(category_id, first_tx_hash)
                
                # Test other transaction operations
                self.test_get_single_transaction(first_tx_id)
                self.test_update_transaction(first_tx_id)
            
            # Test ledger verification
            self.test_ledger_verification()
            
            # Test budget operations
            budget_id = self.test_create_budget(category_id)
            self.test_get_budgets()
            
            # Test bill operations
            bill_id = self.test_create_bill(category_id)
            self.test_get_bills()
        
        # ===== PAYMENT INTEGRATION TESTS =====
        print("\n💳 TESTING PAYMENT INTEGRATION")
        print("-" * 50)
        
        # Test payment operations
        payment_order = self.test_create_payment_order()
        
        # Test analytics
        self.test_analytics_summary()
        
        # ===== ERROR HANDLING TESTS =====
        print("\n🚨 TESTING ERROR HANDLING")
        print("-" * 50)
        
        # Test error handling
        self.test_error_cases()
        
        # Clean up - delete created transaction
        if 'first_tx_id' in locals() and first_tx_id:
            self.test_delete_transaction(first_tx_id)
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    tester = SpendWiseAPITester()
    tester.run_all_tests()
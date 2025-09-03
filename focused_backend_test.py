#!/usr/bin/env python3
"""
SpendWise Focused Backend API Test Suite
Tests enhanced transaction functionality and user management endpoints with available APIs
"""

import requests
import json
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Configuration
BASE_URL = "https://privacyfin.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class FocusedSpendWiseAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.test_results = []
        self.auth_token = None
        self.refresh_token = None
        self.user_id = None
        # Use realistic test data
        self.test_user_email = f"alex.martinez_{int(time.time())}@gmail.com"
        self.test_user_password = "SecurePass2024!"
        self.created_resources = {
            'transactions': [],
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

    def make_request(self, method: str, endpoint: str, data: Dict = None, use_auth: bool = False, headers_override: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        headers = headers_override if headers_override else self.headers.copy()
        
        # Add authentication header if requested and token is available
        if use_auth and self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=15)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=15)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=15)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=15)
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

    # ===== AUTHENTICATION SETUP =====
    
    def setup_authentication(self):
        """Setup authentication for testing"""
        print("🔐 Setting up authentication...")
        
        # Register test user
        user_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        success, data, status_code = self.make_request("POST", "/auth/register", user_data)
        
        if success and isinstance(data, dict) and "access_token" in data:
            self.auth_token = data["access_token"]
            self.refresh_token = data["refresh_token"]
            
            # Extract user_id from token payload (for testing purposes)
            import jwt
            try:
                payload = jwt.decode(self.auth_token, options={"verify_signature": False})
                self.user_id = payload.get("sub")
            except:
                pass
            
            self.log_test("Authentication Setup", True, f"User registered and authenticated successfully")
            return True
        else:
            self.log_test("Authentication Setup", False, f"Failed to setup authentication. Status: {status_code}", data)
            return False

    # ===== ENHANCED TRANSACTION CRUD TESTS =====
    
    def test_create_transaction_with_enhanced_format(self) -> str:
        """Test creating transaction with enhanced format and blockchain hash chaining"""
        # Use a simple category ID since we don't have category endpoints
        category_id = "dining-restaurants"
        
        transaction_data = {
            "type": "expense",
            "amount": 1250.50,
            "currency": "INR",
            "categoryId": category_id,
            "note": "Dinner at The Olive Garden with family",
            "merchant": "The Olive Garden Restaurant",
            "tags": ["dining", "family", "weekend"],
            "isRecurring": False,
            "walletAddress": "0x742d35Cc6634C0532925a3b8D4C2C4e4C4C4C4C4"
        }
        
        success, data, status_code = self.make_request("POST", "/transactions", transaction_data, use_auth=True)
        
        if success and isinstance(data, dict) and "id" in data:
            transaction_id = data["id"]
            self.created_resources['transactions'].append(transaction_id)
            
            # Verify enhanced transaction format
            required_fields = ["id", "type", "amount", "currency", "categoryId", "note", "merchant", "tags", 
                             "timestamp", "previousHash", "currentHash", "version"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                # Verify blockchain hash chaining
                if "previousHash" in data and "currentHash" in data:
                    # For first transaction, previousHash should be "0" or empty
                    if data["previousHash"] in ["0", ""]:
                        # Verify hash computation
                        expected_hash = self.compute_expected_hash(data)
                        if data["currentHash"] == expected_hash:
                            self.log_test("Create Transaction - Enhanced Format", True, 
                                        f"Transaction created with valid blockchain hash: {transaction_id}")
                        else:
                            self.log_test("Create Transaction - Enhanced Format", False, 
                                        f"Hash computation mismatch. Expected: {expected_hash}, Got: {data['currentHash']}")
                    else:
                        self.log_test("Create Transaction - Enhanced Format", True, 
                                    f"Transaction created with chained hash: {transaction_id}")
                else:
                    self.log_test("Create Transaction - Enhanced Format", False, 
                                "Transaction missing blockchain hash fields")
            else:
                self.log_test("Create Transaction - Enhanced Format", False, 
                            f"Missing required fields: {missing_fields}")
            
            return transaction_id
        else:
            self.log_test("Create Transaction - Enhanced Format", False, 
                        f"Failed to create transaction. Status: {status_code}", data)
            return None

    def test_create_chained_transaction(self, previous_tx_hash: str) -> str:
        """Test creating a second transaction to verify blockchain hash chaining"""
        category_id = "salary-income"
        
        transaction_data = {
            "type": "income",
            "amount": 75000.0,
            "currency": "INR",
            "categoryId": category_id,
            "note": "Monthly salary from TechCorp Solutions",
            "merchant": "TechCorp Solutions Pvt Ltd",
            "tags": ["salary", "monthly", "income"],
            "isRecurring": True
        }
        
        success, data, status_code = self.make_request("POST", "/transactions", transaction_data, use_auth=True)
        
        if success and isinstance(data, dict) and "id" in data:
            transaction_id = data["id"]
            self.created_resources['transactions'].append(transaction_id)
            
            # Verify hash chaining
            if data.get("previousHash") == previous_tx_hash:
                expected_hash = self.compute_expected_hash(data)
                if data["currentHash"] == expected_hash:
                    self.log_test("Create Chained Transaction", True, 
                                f"Blockchain hash chaining verified for transaction: {transaction_id}")
                else:
                    self.log_test("Create Chained Transaction", False, 
                                f"Hash computation failed for chained transaction")
            else:
                self.log_test("Create Chained Transaction", False, 
                            f"Hash chain broken. Expected previousHash: {previous_tx_hash}, Got: {data.get('previousHash')}")
            
            return transaction_id
        else:
            self.log_test("Create Chained Transaction", False, 
                        f"Failed to create chained transaction. Status: {status_code}", data)
            return None

    def test_get_user_transactions(self):
        """Test retrieving transactions for authenticated user"""
        success, data, status_code = self.make_request("GET", "/transactions", use_auth=True)
        
        if success and isinstance(data, list):
            # Verify all transactions belong to authenticated user (if user_id is included in response)
            self.log_test("Get User Transactions", True, 
                        f"Retrieved {len(data)} user-specific transactions")
            return data
        else:
            self.log_test("Get User Transactions", False, 
                        f"Failed to get transactions. Status: {status_code}", data)
        return []

    def test_transaction_authentication_required(self):
        """Test that transaction operations require proper JWT authentication"""
        # Save current token
        original_token = self.auth_token
        
        # Test without token
        self.auth_token = None
        success, data, status_code = self.make_request("GET", "/transactions", use_auth=True)
        
        if status_code in [401, 403]:
            self.log_test("Transaction Authentication Required", True, 
                        f"Unauthorized access correctly blocked with {status_code}")
        else:
            self.log_test("Transaction Authentication Required", False, 
                        f"Expected 401/403, got {status_code}")
        
        # Test with invalid token
        self.auth_token = "invalid_jwt_token_12345"
        success, data, status_code = self.make_request("GET", "/transactions", use_auth=True)
        
        if status_code == 401:
            self.log_test("Transaction Invalid Token Rejection", True, 
                        "Invalid token correctly rejected with 401")
        else:
            self.log_test("Transaction Invalid Token Rejection", False, 
                        f"Expected 401, got {status_code}")
        
        # Restore original token
        self.auth_token = original_token

    def test_transaction_with_idempotency(self):
        """Test transaction creation with idempotency key"""
        category_id = "groceries"
        idempotency_key = f"test-idempotency-{int(time.time())}"
        
        transaction_data = {
            "type": "expense",
            "amount": 450.75,
            "currency": "INR",
            "categoryId": category_id,
            "note": "Weekly grocery shopping at BigBazaar",
            "merchant": "BigBazaar",
            "tags": ["groceries", "weekly", "essentials"]
        }
        
        # Add idempotency key to headers
        headers_with_idempotency = self.headers.copy()
        headers_with_idempotency["Authorization"] = f"Bearer {self.auth_token}"
        headers_with_idempotency["Idempotency-Key"] = idempotency_key
        
        # First request
        success1, data1, status_code1 = self.make_request("POST", "/transactions", transaction_data, 
                                                         headers_override=headers_with_idempotency)
        
        if success1:
            # Second request with same idempotency key should return same result
            success2, data2, status_code2 = self.make_request("POST", "/transactions", transaction_data, 
                                                             headers_override=headers_with_idempotency)
            
            if success2 and data1.get("id") == data2.get("id"):
                self.log_test("Transaction Idempotency", True, 
                            f"Idempotency working correctly - same transaction ID returned: {data1.get('id')}")
            else:
                self.log_test("Transaction Idempotency", False, 
                            f"Idempotency failed - different responses or IDs")
        else:
            self.log_test("Transaction Idempotency", False, 
                        f"First transaction creation failed. Status: {status_code1}", data1)

    # ===== USER MANAGEMENT ENDPOINT TESTS =====
    
    def test_get_user_profile(self):
        """Test GET /api/users/{id} endpoint"""
        if not self.user_id:
            self.log_test("Get User Profile", False, "No user_id available")
            return
        
        success, data, status_code = self.make_request("GET", f"/users/{self.user_id}", use_auth=True)
        
        if success and isinstance(data, dict):
            required_fields = ["id", "email", "created_at", "is_active"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                # Verify sensitive data is not exposed
                sensitive_fields = ["password", "password_hash"]
                exposed_sensitive = [field for field in sensitive_fields if field in data]
                
                if not exposed_sensitive:
                    self.log_test("Get User Profile", True, 
                                f"User profile retrieved successfully for user: {data['id']}")
                else:
                    self.log_test("Get User Profile", False, 
                                f"Sensitive fields exposed: {exposed_sensitive}")
            else:
                self.log_test("Get User Profile", False, 
                            f"Missing required fields: {missing_fields}")
        else:
            self.log_test("Get User Profile", False, 
                        f"Failed to get user profile. Status: {status_code}", data)

    def test_update_user_profile(self):
        """Test PUT /api/users/{id} endpoint"""
        if not self.user_id:
            self.log_test("Update User Profile", False, "No user_id available")
            return
        
        update_data = {
            "full_name": "Alex Martinez",
            "email": f"alex.martinez.updated_{int(time.time())}@gmail.com"
        }
        
        success, data, status_code = self.make_request("PUT", f"/users/{self.user_id}", update_data, use_auth=True)
        
        if success and isinstance(data, dict):
            if data.get("full_name") == update_data["full_name"] and data.get("email") == update_data["email"]:
                self.log_test("Update User Profile", True, 
                            f"User profile updated successfully")
            else:
                self.log_test("Update User Profile", False, 
                            "Profile update data mismatch")
        else:
            self.log_test("Update User Profile", False, 
                        f"Failed to update user profile. Status: {status_code}", data)

    def test_change_user_password(self):
        """Test PUT /api/users/{id}/password endpoint"""
        if not self.user_id:
            self.log_test("Change User Password", False, "No user_id available")
            return
        
        new_password = "NewSecurePass2024!"
        password_data = {
            "current_password": self.test_user_password,
            "new_password": new_password
        }
        
        success, data, status_code = self.make_request("PUT", f"/users/{self.user_id}/password", password_data, use_auth=True)
        
        if success and isinstance(data, dict):
            if data.get("success") == True:
                # Update password for future tests
                self.test_user_password = new_password
                self.log_test("Change User Password", True, 
                            "Password changed successfully")
            else:
                self.log_test("Change User Password", False, 
                            "Password change response invalid")
        else:
            self.log_test("Change User Password", False, 
                        f"Failed to change password. Status: {status_code}", data)

    def test_user_access_control(self):
        """Test that users can only access their own data"""
        if not self.user_id:
            self.log_test("User Access Control", False, "No user_id available")
            return
        
        # Try to access another user's profile (using a fake ID)
        fake_user_id = "fake-user-id-12345"
        success, data, status_code = self.make_request("GET", f"/users/{fake_user_id}", use_auth=True)
        
        if status_code == 403:
            self.log_test("User Access Control", True, 
                        "Access to other user's data correctly denied with 403")
        elif status_code == 404:
            self.log_test("User Access Control", True, 
                        "Non-existent user correctly returned 404")
        else:
            self.log_test("User Access Control", False, 
                        f"Expected 403 or 404, got {status_code}")

    # ===== PREMIUM FEATURES TESTS =====
    
    def test_ai_analysis_endpoint(self):
        """Test AI analysis endpoint with Emergent LLM integration"""
        analysis_data = {
            "user_id": self.user_id,
            "analysis_type": "spending_patterns",
            "time_period": "current_month"
        }
        
        success, data, status_code = self.make_request("POST", "/ai/analyze", analysis_data, use_auth=True)
        
        if success and isinstance(data, dict):
            required_fields = ["success", "analysis_type", "insights", "recommendations", "summary"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                insights_count = len(data.get("insights", []))
                recommendations_count = len(data.get("recommendations", []))
                self.log_test("AI Analysis Endpoint", True, 
                            f"AI analysis completed with {insights_count} insights and {recommendations_count} recommendations")
            else:
                self.log_test("AI Analysis Endpoint", False, 
                            f"Missing required fields: {missing_fields}")
        else:
            self.log_test("AI Analysis Endpoint", False, 
                        f"AI analysis failed. Status: {status_code}", data)

    def test_monthly_report_endpoint(self):
        """Test monthly report generation endpoint"""
        success, data, status_code = self.make_request("GET", "/analytics/monthly-report", use_auth=True)
        
        if success and isinstance(data, dict):
            required_fields = ["success", "totalIncome", "totalExpenses", "netSavings", "healthScore"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                health_score = data.get("healthScore", 0)
                net_savings = data.get("netSavings", 0)
                self.log_test("Monthly Report Endpoint", True, 
                            f"Monthly report generated with health score: {health_score}, net savings: ₹{net_savings}")
            else:
                self.log_test("Monthly Report Endpoint", False, 
                            f"Missing required fields: {missing_fields}")
        else:
            self.log_test("Monthly Report Endpoint", False, 
                        f"Monthly report failed. Status: {status_code}", data)

    def test_premium_status_and_upgrade(self):
        """Test premium status check and upgrade functionality"""
        # Test premium status check
        success, data, status_code = self.make_request("GET", "/premium/status", use_auth=True)
        
        if success and isinstance(data, dict):
            required_fields = ["isPremium", "plan", "features"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                self.log_test("Premium Status Check", True, 
                            f"Premium status: {data.get('plan', 'unknown')}")
            else:
                self.log_test("Premium Status Check", False, 
                            f"Missing required fields: {missing_fields}")
        else:
            self.log_test("Premium Status Check", False, 
                        f"Premium status check failed. Status: {status_code}", data)
        
        # Test premium upgrade
        success, data, status_code = self.make_request("POST", "/premium/upgrade", use_auth=True)
        
        if success and isinstance(data, dict):
            if data.get("success") and data.get("isPremium"):
                self.log_test("Premium Upgrade", True, "Premium upgrade successful")
            else:
                self.log_test("Premium Upgrade", False, "Premium upgrade response invalid", data)
        else:
            self.log_test("Premium Upgrade", False, f"Premium upgrade failed. Status: {status_code}", data)

    # ===== PAYMENT INTEGRATION TESTS =====
    
    def test_payment_order_creation(self):
        """Test Razorpay payment order creation with authentication"""
        order_data = {
            "amount": 99900,  # Amount in paise (999 INR for premium subscription)
            "currency": "INR",
            "receipt": f"premium_upgrade_{int(time.time())}",
            "plan_type": "premium"
        }
        
        success, data, status_code = self.make_request("POST", "/payments/create-order", order_data, use_auth=True)
        
        if success and isinstance(data, dict) and "id" in data:
            order_id = data["id"]
            self.log_test("Payment Order Creation", True, 
                        f"Razorpay payment order created successfully: {order_id}")
            return data
        else:
            self.log_test("Payment Order Creation", False, 
                        f"Failed to create payment order. Status: {status_code}", data)
            return None

    # ===== ERROR HANDLING AND VALIDATION TESTS =====
    
    def test_input_validation(self):
        """Test input validation and error handling"""
        # Test invalid transaction data
        invalid_transaction = {
            "type": "invalid_type",
            "amount": -100,  # Negative amount
            "currency": "INVALID",  # Invalid currency
            "categoryId": ""  # Empty category
        }
        
        success, data, status_code = self.make_request("POST", "/transactions", invalid_transaction, use_auth=True)
        
        if status_code >= 400:
            self.log_test("Input Validation - Invalid Transaction", True, 
                        f"Invalid transaction data correctly rejected with {status_code}")
        else:
            self.log_test("Input Validation - Invalid Transaction", False, 
                        f"Should have rejected invalid data, got {status_code}")
        
        # Test invalid email format in user update
        invalid_user_update = {
            "email": "invalid-email-format"
        }
        
        success, data, status_code = self.make_request("PUT", f"/users/{self.user_id}", invalid_user_update, use_auth=True)
        
        if status_code >= 400:
            self.log_test("Input Validation - Invalid Email", True, 
                        f"Invalid email format correctly rejected with {status_code}")
        else:
            self.log_test("Input Validation - Invalid Email", False, 
                        f"Should have rejected invalid email, got {status_code}")

    def run_focused_tests(self):
        """Run the focused test suite for enhanced transaction functionality and user management"""
        print("🚀 Starting SpendWise Focused Backend API Test Suite")
        print("=" * 80)
        
        # Setup authentication
        if not self.setup_authentication():
            print("❌ Cannot continue tests without authentication")
            return
        
        # ===== ENHANCED TRANSACTION CRUD TESTS =====
        print("\n💰 TESTING ENHANCED TRANSACTION FUNCTIONALITY")
        print("-" * 60)
        
        # Test enhanced transaction creation with blockchain hash chaining
        first_tx_id = self.test_create_transaction_with_enhanced_format()
        
        if first_tx_id:
            # Get first transaction hash for chaining test
            transactions = self.test_get_user_transactions()
            first_tx_hash = None
            if transactions:
                for tx in transactions:
                    if tx["id"] == first_tx_id:
                        first_tx_hash = tx["currentHash"]
                        break
            
            # Test blockchain hash chaining
            if first_tx_hash:
                self.test_create_chained_transaction(first_tx_hash)
        
        # Test authentication integration
        self.test_transaction_authentication_required()
        
        # Test idempotency
        self.test_transaction_with_idempotency()
        
        # ===== USER MANAGEMENT ENDPOINT TESTS =====
        print("\n👤 TESTING USER MANAGEMENT ENDPOINTS")
        print("-" * 60)
        
        self.test_get_user_profile()
        self.test_update_user_profile()
        self.test_change_user_password()
        self.test_user_access_control()
        
        # ===== PREMIUM FEATURES TESTS =====
        print("\n💎 TESTING PREMIUM FEATURES")
        print("-" * 60)
        
        self.test_ai_analysis_endpoint()
        self.test_monthly_report_endpoint()
        self.test_premium_status_and_upgrade()
        
        # ===== PAYMENT INTEGRATION TESTS =====
        print("\n💳 TESTING PAYMENT INTEGRATION")
        print("-" * 60)
        
        self.test_payment_order_creation()
        
        # ===== SECURITY AND VALIDATION TESTS =====
        print("\n🔒 TESTING SECURITY AND VALIDATION")
        print("-" * 60)
        
        self.test_input_validation()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 FOCUSED TEST RESULTS SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result['success'])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        # Categorize results
        transaction_tests = [r for r in self.test_results if 'transaction' in r['test'].lower()]
        user_mgmt_tests = [r for r in self.test_results if 'user' in r['test'].lower() or 'profile' in r['test'].lower() or 'password' in r['test'].lower()]
        premium_tests = [r for r in self.test_results if 'ai' in r['test'].lower() or 'premium' in r['test'].lower() or 'monthly' in r['test'].lower()]
        payment_tests = [r for r in self.test_results if 'payment' in r['test'].lower()]
        
        print(f"\n📈 Transaction Tests: {sum(1 for r in transaction_tests if r['success'])}/{len(transaction_tests)} passed")
        print(f"👤 User Management Tests: {sum(1 for r in user_mgmt_tests if r['success'])}/{len(user_mgmt_tests)} passed")
        print(f"💎 Premium Feature Tests: {sum(1 for r in premium_tests if r['success'])}/{len(premium_tests)} passed")
        print(f"💳 Payment Tests: {sum(1 for r in payment_tests if r['success'])}/{len(payment_tests)} passed")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = FocusedSpendWiseAPITester()
    tester.run_focused_tests()
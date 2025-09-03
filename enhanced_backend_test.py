#!/usr/bin/env python3
"""
SpendWise Enhanced Backend API Test Suite
Tests enhanced transaction functionality and user management endpoints
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

class EnhancedSpendWiseAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.test_results = []
        self.auth_token = None
        self.refresh_token = None
        self.user_id = None
        # Use realistic test data
        self.test_user_email = f"sarah.johnson_{int(time.time())}@gmail.com"
        self.test_user_password = "SecurePass2024!"
        self.created_resources = {
            'transactions': [],
            'categories': [],
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
    
    def test_create_category_for_transactions(self) -> str:
        """Create a category for transaction testing"""
        category_data = {
            "name": "Dining & Restaurants",
            "icon": "🍽️",
            "color": "#FF6B35",
            "type": "expense",
            "budgetMonthly": 8000.0,
            "isDefault": False
        }
        
        success, data, status_code = self.make_request("POST", "/categories", category_data, use_auth=True)
        
        if success and isinstance(data, dict) and "id" in data:
            category_id = data["id"]
            self.created_resources['categories'].append(category_id)
            self.log_test("Create Category for Transactions", True, f"Created category: {category_id}")
            return category_id
        else:
            self.log_test("Create Category for Transactions", False, f"Failed to create category. Status: {status_code}", data)
            return None

    def test_create_transaction_with_enhanced_format(self, category_id: str) -> str:
        """Test creating transaction with enhanced format and blockchain hash chaining"""
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
                             "timestamp", "previousHash", "currentHash", "version", "user_id"]
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

    def test_create_chained_transaction(self, category_id: str, previous_tx_hash: str) -> str:
        """Test creating a second transaction to verify blockchain hash chaining"""
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
            # Verify all transactions belong to authenticated user
            user_transactions = [tx for tx in data if tx.get("user_id") == self.user_id]
            if len(user_transactions) == len(data):
                self.log_test("Get User Transactions", True, 
                            f"Retrieved {len(data)} user-specific transactions")
                return data
            else:
                self.log_test("Get User Transactions", False, 
                            f"Retrieved transactions from other users. Total: {len(data)}, User's: {len(user_transactions)}")
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
            "full_name": "Sarah Johnson",
            "email": f"sarah.johnson.updated_{int(time.time())}@gmail.com"
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

    def test_rate_limiting(self):
        """Test rate limiting on protected endpoints"""
        # Test rate limiting on AI analysis endpoint
        analysis_data = {
            "user_id": self.user_id,
            "analysis_type": "spending_patterns",
            "time_period": "current_month"
        }
        
        rate_limited = False
        for i in range(12):  # Exceed the 10/minute limit
            success, data, status_code = self.make_request("POST", "/ai/analyze", analysis_data, use_auth=True)
            if status_code == 429:  # Too Many Requests
                rate_limited = True
                break
            time.sleep(0.1)
        
        if rate_limited:
            self.log_test("Rate Limiting", True, "Rate limiting working correctly (429 status)")
        else:
            self.log_test("Rate Limiting", False, "Rate limiting not triggered")

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

    def test_data_erase_endpoint(self):
        """Test DELETE /api/users/erase-data endpoint"""
        # Note: This test should be run last as it will delete all user data
        success, data, status_code = self.make_request("DELETE", "/users/erase-data", use_auth=True)
        
        if success and isinstance(data, dict):
            if data.get("success") == True:
                self.log_test("Data Erase Endpoint", True, 
                            "User data erased successfully")
            else:
                self.log_test("Data Erase Endpoint", False, 
                            "Data erase response invalid")
        else:
            self.log_test("Data Erase Endpoint", False, 
                        f"Failed to erase user data. Status: {status_code}", data)

    def run_enhanced_tests(self):
        """Run the enhanced test suite focusing on transaction functionality and user management"""
        print("🚀 Starting SpendWise Enhanced Backend API Test Suite")
        print("=" * 80)
        
        # Setup authentication
        if not self.setup_authentication():
            print("❌ Cannot continue tests without authentication")
            return
        
        # ===== ENHANCED TRANSACTION CRUD TESTS =====
        print("\n💰 TESTING ENHANCED TRANSACTION FUNCTIONALITY")
        print("-" * 60)
        
        # Create category for transactions
        category_id = self.test_create_category_for_transactions()
        if category_id:
            # Test enhanced transaction creation with blockchain hash chaining
            first_tx_id = self.test_create_transaction_with_enhanced_format(category_id)
            
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
                    self.test_create_chained_transaction(category_id, first_tx_hash)
        
        # Test authentication integration
        self.test_transaction_authentication_required()
        
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
        
        # ===== SECURITY AND VALIDATION TESTS =====
        print("\n🔒 TESTING SECURITY AND VALIDATION")
        print("-" * 60)
        
        self.test_rate_limiting()
        self.test_input_validation()
        
        # ===== DATA ERASE TEST (RUN LAST) =====
        print("\n🗑️ TESTING DATA ERASE (FINAL TEST)")
        print("-" * 60)
        
        # Note: This should be the last test as it deletes all user data
        # self.test_data_erase_endpoint()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 ENHANCED TEST RESULTS SUMMARY")
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
        
        print(f"\n📈 Transaction Tests: {sum(1 for r in transaction_tests if r['success'])}/{len(transaction_tests)} passed")
        print(f"👤 User Management Tests: {sum(1 for r in user_mgmt_tests if r['success'])}/{len(user_mgmt_tests)} passed")
        print(f"💎 Premium Feature Tests: {sum(1 for r in premium_tests if r['success'])}/{len(premium_tests)} passed")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = EnhancedSpendWiseAPITester()
    tester.run_enhanced_tests()
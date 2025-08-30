#!/usr/bin/env python3
"""
SpendWise Backend Security Test Suite
Comprehensive testing of enhanced security features including JWT authentication,
rate limiting, input validation, payment security, and access control.
"""

import requests
import json
import time
import hashlib
import hmac
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

# Configuration
BASE_URL = "https://secure-wallet-3.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class SpendWiseSecurityTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.test_results = []
        self.auth_tokens = {}
        self.test_users = []
        self.created_resources = {
            'users': [],
            'transactions': [],
            'payment_orders': []
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

    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, timeout: int = 10) -> tuple:
        """Make HTTP request and return (success, response_data, status_code, headers)"""
        url = f"{self.base_url}{endpoint}"
        request_headers = {**self.headers}
        if headers:
            request_headers.update(headers)
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=request_headers, timeout=timeout)
            elif method.upper() == "POST":
                response = requests.post(url, headers=request_headers, json=data, timeout=timeout)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=request_headers, json=data, timeout=timeout)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=request_headers, timeout=timeout)
            else:
                return False, f"Unsupported method: {method}", 400, {}
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return response.status_code < 400, response_data, response.status_code, dict(response.headers)
        except requests.exceptions.RequestException as e:
            return False, str(e), 0, {}

    def generate_test_user_data(self, suffix: str = None) -> Dict:
        """Generate test user data with strong password"""
        if not suffix:
            suffix = str(int(time.time()))
        
        return {
            "email": f"testuser{suffix}@spendwise.com",
            "password": "SecurePass123!"  # Meets all requirements: 8+ chars, upper, lower, digit
        }

    # ========== AUTHENTICATION & JWT SECURITY TESTS ==========
    
    def test_user_registration_security(self):
        """Test user registration with security validations"""
        # Test valid registration
        user_data = self.generate_test_user_data("reg1")
        success, response, status_code, headers = self.make_request("POST", "/auth/register", user_data)
        
        if success and status_code == 200:
            # Verify JWT token structure
            if "access_token" in response and "refresh_token" in response:
                self.auth_tokens["test_user"] = {
                    "access_token": response["access_token"],
                    "refresh_token": response["refresh_token"]
                }
                self.test_users.append(user_data["email"])
                self.log_test("User Registration - Valid Data", True, 
                            f"User registered successfully with JWT tokens")
            else:
                self.log_test("User Registration - Valid Data", False, 
                            "Missing JWT tokens in response", response)
        else:
            self.log_test("User Registration - Valid Data", False, 
                        f"Registration failed. Status: {status_code}", response)

        # Test weak password validation
        weak_password_data = {
            "email": "weakpass@test.com",
            "password": "weak"  # Too short, no uppercase, no digits
        }
        success, response, status_code, headers = self.make_request("POST", "/auth/register", weak_password_data)
        
        if not success and status_code == 422:
            self.log_test("Password Validation - Weak Password", True, 
                        "Correctly rejected weak password")
        else:
            self.log_test("Password Validation - Weak Password", False, 
                        f"Should reject weak password. Status: {status_code}", response)

        # Test invalid email format
        invalid_email_data = {
            "email": "invalid-email",
            "password": "SecurePass123!"
        }
        success, response, status_code, headers = self.make_request("POST", "/auth/register", invalid_email_data)
        
        if not success and status_code == 422:
            self.log_test("Email Validation - Invalid Format", True, 
                        "Correctly rejected invalid email format")
        else:
            self.log_test("Email Validation - Invalid Format", False, 
                        f"Should reject invalid email. Status: {status_code}", response)

    def test_user_login_security(self):
        """Test user login with security features"""
        if not self.test_users:
            self.log_test("User Login - No Test User", False, "No test user available for login test")
            return

        # Test valid login
        login_data = {
            "email": self.test_users[0],
            "password": "SecurePass123!"
        }
        success, response, status_code, headers = self.make_request("POST", "/auth/login", login_data)
        
        if success and "access_token" in response:
            self.log_test("User Login - Valid Credentials", True, 
                        "Login successful with JWT tokens")
        else:
            self.log_test("User Login - Valid Credentials", False, 
                        f"Login failed. Status: {status_code}", response)

        # Test invalid credentials
        invalid_login_data = {
            "email": self.test_users[0],
            "password": "WrongPassword123!"
        }
        success, response, status_code, headers = self.make_request("POST", "/auth/login", invalid_login_data)
        
        if not success and status_code == 401:
            self.log_test("User Login - Invalid Credentials", True, 
                        "Correctly rejected invalid credentials")
        else:
            self.log_test("User Login - Invalid Credentials", False, 
                        f"Should reject invalid credentials. Status: {status_code}", response)

    def test_jwt_token_refresh(self):
        """Test JWT refresh token functionality"""
        if "test_user" not in self.auth_tokens:
            self.log_test("JWT Refresh - No Token", False, "No refresh token available for test")
            return

        refresh_token = self.auth_tokens["test_user"]["refresh_token"]
        auth_headers = {"Authorization": f"Bearer {refresh_token}"}
        
        success, response, status_code, headers = self.make_request("POST", "/auth/refresh", 
                                                                  headers=auth_headers)
        
        if success and "access_token" in response:
            # Update stored tokens
            self.auth_tokens["test_user"]["access_token"] = response["access_token"]
            self.auth_tokens["test_user"]["refresh_token"] = response["refresh_token"]
            self.log_test("JWT Refresh Token", True, "Successfully refreshed JWT tokens")
        else:
            self.log_test("JWT Refresh Token", False, 
                        f"Token refresh failed. Status: {status_code}", response)

    def test_jwt_token_expiry_handling(self):
        """Test JWT token expiry and validation"""
        # Test with invalid/expired token
        invalid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token"
        auth_headers = {"Authorization": f"Bearer {invalid_token}"}
        
        success, response, status_code, headers = self.make_request("GET", "/transactions", 
                                                                  headers=auth_headers)
        
        if not success and status_code == 401:
            self.log_test("JWT Token Validation - Invalid Token", True, 
                        "Correctly rejected invalid JWT token")
        else:
            self.log_test("JWT Token Validation - Invalid Token", False, 
                        f"Should reject invalid token. Status: {status_code}", response)

    # ========== RATE LIMITING TESTS ==========
    
    def test_auth_rate_limiting(self):
        """Test rate limiting on authentication endpoints"""
        # Test registration rate limiting (5/min)
        registration_attempts = []
        for i in range(7):  # Exceed limit of 5
            user_data = self.generate_test_user_data(f"rate{i}")
            start_time = time.time()
            success, response, status_code, headers = self.make_request("POST", "/auth/register", user_data)
            end_time = time.time()
            
            registration_attempts.append({
                'attempt': i + 1,
                'success': success,
                'status_code': status_code,
                'response_time': end_time - start_time
            })
            
            if i < 6:  # Don't sleep after last attempt
                time.sleep(1)  # Small delay between requests

        # Check if rate limiting kicked in
        rate_limited = any(attempt['status_code'] == 429 for attempt in registration_attempts[5:])
        
        if rate_limited:
            self.log_test("Rate Limiting - Registration", True, 
                        "Registration rate limiting working correctly")
        else:
            self.log_test("Rate Limiting - Registration", False, 
                        "Registration rate limiting not working", registration_attempts)

    def test_health_check_rate_limiting(self):
        """Test rate limiting on health check endpoint (60/min)"""
        # Make rapid requests to health endpoint
        health_attempts = []
        for i in range(5):  # Test a few requests quickly
            start_time = time.time()
            success, response, status_code, headers = self.make_request("GET", "/health")
            end_time = time.time()
            
            health_attempts.append({
                'attempt': i + 1,
                'success': success,
                'status_code': status_code,
                'response_time': end_time - start_time
            })

        # Health endpoint should handle these requests (within 60/min limit)
        all_successful = all(attempt['success'] for attempt in health_attempts)
        
        if all_successful:
            self.log_test("Rate Limiting - Health Check", True, 
                        "Health check rate limiting allows normal usage")
        else:
            self.log_test("Rate Limiting - Health Check", False, 
                        "Health check rate limiting too restrictive", health_attempts)

    # ========== INPUT VALIDATION TESTS ==========
    
    def test_transaction_input_validation(self):
        """Test enhanced input validation for transactions"""
        if "test_user" not in self.auth_tokens:
            self.log_test("Transaction Validation - No Auth", False, "No authenticated user for test")
            return

        auth_headers = {"Authorization": f"Bearer {self.auth_tokens['test_user']['access_token']}"}

        # Test invalid transaction type
        invalid_type_data = {
            "type": "invalid_type",  # Should only accept: expense, income, transfer, bill
            "amount": 100.0,
            "currency": "INR",
            "categoryId": "test-category"
        }
        success, response, status_code, headers = self.make_request("POST", "/transactions", 
                                                                  invalid_type_data, auth_headers)
        
        if not success and status_code == 422:
            self.log_test("Input Validation - Invalid Transaction Type", True, 
                        "Correctly rejected invalid transaction type")
        else:
            self.log_test("Input Validation - Invalid Transaction Type", False, 
                        f"Should reject invalid type. Status: {status_code}", response)

        # Test invalid amount (negative)
        invalid_amount_data = {
            "type": "expense",
            "amount": -100.0,  # Should be positive
            "currency": "INR",
            "categoryId": "test-category"
        }
        success, response, status_code, headers = self.make_request("POST", "/transactions", 
                                                                  invalid_amount_data, auth_headers)
        
        if not success and status_code == 422:
            self.log_test("Input Validation - Negative Amount", True, 
                        "Correctly rejected negative amount")
        else:
            self.log_test("Input Validation - Negative Amount", False, 
                        f"Should reject negative amount. Status: {status_code}", response)

        # Test invalid currency format
        invalid_currency_data = {
            "type": "expense",
            "amount": 100.0,
            "currency": "INVALID",  # Should be 3-letter code
            "categoryId": "test-category"
        }
        success, response, status_code, headers = self.make_request("POST", "/transactions", 
                                                                  invalid_currency_data, auth_headers)
        
        if not success and status_code == 422:
            self.log_test("Input Validation - Invalid Currency", True, 
                        "Correctly rejected invalid currency format")
        else:
            self.log_test("Input Validation - Invalid Currency", False, 
                        f"Should reject invalid currency. Status: {status_code}", response)

        # Test amount exceeding maximum limit
        excessive_amount_data = {
            "type": "expense",
            "amount": 20000000.0,  # Exceeds 1 crore limit
            "currency": "INR",
            "categoryId": "test-category"
        }
        success, response, status_code, headers = self.make_request("POST", "/transactions", 
                                                                  excessive_amount_data, auth_headers)
        
        if not success and status_code == 422:
            self.log_test("Input Validation - Excessive Amount", True, 
                        "Correctly rejected excessive amount")
        else:
            self.log_test("Input Validation - Excessive Amount", False, 
                        f"Should reject excessive amount. Status: {status_code}", response)

    def test_payment_input_validation(self):
        """Test payment order input validation"""
        if "test_user" not in self.auth_tokens:
            self.log_test("Payment Validation - No Auth", False, "No authenticated user for test")
            return

        auth_headers = {"Authorization": f"Bearer {self.auth_tokens['test_user']['access_token']}"}

        # Test invalid amount (too small)
        invalid_payment_data = {
            "amount": 50,  # Less than minimum 100 paise (₹1)
            "currency": "INR",
            "plan_type": "premium"
        }
        success, response, status_code, headers = self.make_request("POST", "/payments/create-order", 
                                                                  invalid_payment_data, auth_headers)
        
        if not success and status_code == 422:
            self.log_test("Payment Validation - Minimum Amount", True, 
                        "Correctly rejected amount below minimum")
        else:
            self.log_test("Payment Validation - Minimum Amount", False, 
                        f"Should reject low amount. Status: {status_code}", response)

        # Test invalid plan type
        invalid_plan_data = {
            "amount": 19900,
            "currency": "INR",
            "plan_type": "invalid_plan"  # Should only accept: premium, basic
        }
        success, response, status_code, headers = self.make_request("POST", "/payments/create-order", 
                                                                  invalid_plan_data, auth_headers)
        
        if not success and status_code == 422:
            self.log_test("Payment Validation - Invalid Plan Type", True, 
                        "Correctly rejected invalid plan type")
        else:
            self.log_test("Payment Validation - Invalid Plan Type", False, 
                        f"Should reject invalid plan. Status: {status_code}", response)

    # ========== PAYMENT SECURITY TESTS ==========
    
    def test_payment_signature_verification(self):
        """Test server-side Razorpay signature verification"""
        if "test_user" not in self.auth_tokens:
            self.log_test("Payment Security - No Auth", False, "No authenticated user for test")
            return

        auth_headers = {"Authorization": f"Bearer {self.auth_tokens['test_user']['access_token']}"}

        # Test with invalid signature
        invalid_verification_data = {
            "razorpay_order_id": "order_test123456789",
            "razorpay_payment_id": "pay_test123456789",
            "razorpay_signature": "invalid_signature_should_fail"
        }
        success, response, status_code, headers = self.make_request("POST", "/payments/verify", 
                                                                  invalid_verification_data, auth_headers)
        
        if not success and status_code == 400:
            self.log_test("Payment Security - Invalid Signature", True, 
                        "Correctly rejected invalid payment signature")
        else:
            self.log_test("Payment Security - Invalid Signature", False, 
                        f"Should reject invalid signature. Status: {status_code}", response)

        # Test signature verification format validation
        malformed_verification_data = {
            "razorpay_order_id": "invalid_order_format",  # Should start with 'order_'
            "razorpay_payment_id": "invalid_payment_format",  # Should start with 'pay_'
            "razorpay_signature": "short"  # Should be 64-256 chars
        }
        success, response, status_code, headers = self.make_request("POST", "/payments/verify", 
                                                                  malformed_verification_data, auth_headers)
        
        if not success and status_code == 422:
            self.log_test("Payment Security - Format Validation", True, 
                        "Correctly rejected malformed payment data")
        else:
            self.log_test("Payment Security - Format Validation", False, 
                        f"Should reject malformed data. Status: {status_code}", response)

    def test_idempotency_handling(self):
        """Test idempotency key handling for payments"""
        if "test_user" not in self.auth_tokens:
            self.log_test("Idempotency - No Auth", False, "No authenticated user for test")
            return

        auth_headers = {"Authorization": f"Bearer {self.auth_tokens['test_user']['access_token']}"}
        idempotency_key = f"test_key_{int(time.time())}"
        
        payment_data = {
            "amount": 19900,
            "currency": "INR",
            "plan_type": "premium"
        }
        
        # Add idempotency key to headers
        headers_with_idempotency = {**auth_headers, "Idempotency-Key": idempotency_key}
        
        # First request
        success1, response1, status1, _ = self.make_request("POST", "/payments/create-order", 
                                                          payment_data, headers_with_idempotency)
        
        # Second request with same idempotency key
        success2, response2, status2, _ = self.make_request("POST", "/payments/create-order", 
                                                          payment_data, headers_with_idempotency)
        
        if success1 and success2:
            # Both should succeed, but second should return cached response
            if response1.get("id") == response2.get("id"):
                self.log_test("Idempotency Handling", True, 
                            "Idempotency key correctly returned cached response")
            else:
                self.log_test("Idempotency Handling", False, 
                            "Idempotency key should return same response")
        else:
            self.log_test("Idempotency Handling", False, 
                        f"Idempotency test failed. Status1: {status1}, Status2: {status2}")

    # ========== SECURITY HEADERS TESTS ==========
    
    def test_security_headers(self):
        """Test security headers in responses"""
        success, response, status_code, headers = self.make_request("GET", "/health")
        
        expected_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'self'"
        }
        
        missing_headers = []
        for header_name, expected_value in expected_headers.items():
            if header_name not in headers:
                missing_headers.append(header_name)
            elif headers[header_name] != expected_value:
                missing_headers.append(f"{header_name} (wrong value)")
        
        if not missing_headers:
            self.log_test("Security Headers", True, "All required security headers present")
        else:
            self.log_test("Security Headers", False, 
                        f"Missing/incorrect headers: {missing_headers}")

    # ========== ACCESS CONTROL TESTS ==========
    
    def test_user_data_isolation(self):
        """Test that users can only access their own data"""
        # Create two test users
        user1_data = self.generate_test_user_data("isolation1")
        user2_data = self.generate_test_user_data("isolation2")
        
        # Register both users
        success1, response1, _, _ = self.make_request("POST", "/auth/register", user1_data)
        success2, response2, _, _ = self.make_request("POST", "/auth/register", user2_data)
        
        if not (success1 and success2):
            self.log_test("Data Isolation - User Creation", False, "Failed to create test users")
            return
        
        user1_token = response1["access_token"]
        user2_token = response2["access_token"]
        
        # User1 creates a transaction
        user1_headers = {"Authorization": f"Bearer {user1_token}"}
        transaction_data = {
            "type": "expense",
            "amount": 100.0,
            "currency": "INR",
            "categoryId": "test-category-isolation"
        }
        
        success, tx_response, _, _ = self.make_request("POST", "/transactions", 
                                                     transaction_data, user1_headers)
        
        if not success:
            self.log_test("Data Isolation - Transaction Creation", False, 
                        "Failed to create transaction for isolation test")
            return
        
        # User2 tries to access User1's transactions
        user2_headers = {"Authorization": f"Bearer {user2_token}"}
        success, user2_transactions, status_code, _ = self.make_request("GET", "/transactions", 
                                                                       headers=user2_headers)
        
        if success:
            # User2 should not see User1's transactions
            user1_tx_ids = [tx_response["id"]] if "id" in tx_response else []
            user2_tx_ids = [tx["id"] for tx in user2_transactions if isinstance(user2_transactions, list)]
            
            isolation_maintained = not any(tx_id in user2_tx_ids for tx_id in user1_tx_ids)
            
            if isolation_maintained:
                self.log_test("Data Isolation - User Transactions", True, 
                            "Users can only access their own transactions")
            else:
                self.log_test("Data Isolation - User Transactions", False, 
                            "Data isolation breach: User can see other user's data")
        else:
            self.log_test("Data Isolation - User Transactions", False, 
                        f"Failed to test isolation. Status: {status_code}")

    def test_unauthorized_access(self):
        """Test access to protected endpoints without authentication"""
        protected_endpoints = [
            ("GET", "/transactions"),
            ("POST", "/transactions"),
            ("POST", "/payments/create-order"),
            ("POST", "/payments/verify")
        ]
        
        unauthorized_count = 0
        for method, endpoint in protected_endpoints:
            success, response, status_code, _ = self.make_request(method, endpoint)
            
            if not success and status_code == 401:
                unauthorized_count += 1
        
        if unauthorized_count == len(protected_endpoints):
            self.log_test("Unauthorized Access Protection", True, 
                        "All protected endpoints require authentication")
        else:
            self.log_test("Unauthorized Access Protection", False, 
                        f"Only {unauthorized_count}/{len(protected_endpoints)} endpoints protected")

    # ========== CORS TESTS ==========
    
    def test_cors_configuration(self):
        """Test CORS configuration and whitelist"""
        # Test preflight request
        cors_headers = {
            "Origin": "https://secure-wallet-3.preview.emergentagent.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type,Authorization"
        }
        
        success, response, status_code, headers = self.make_request("OPTIONS", "/health", 
                                                                  headers=cors_headers)
        
        # Check CORS headers in response
        cors_origin = headers.get("Access-Control-Allow-Origin")
        cors_methods = headers.get("Access-Control-Allow-Methods")
        cors_headers_allowed = headers.get("Access-Control-Allow-Headers")
        
        if cors_origin and cors_methods:
            self.log_test("CORS Configuration", True, 
                        f"CORS properly configured. Origin: {cors_origin}")
        else:
            self.log_test("CORS Configuration", False, 
                        "CORS headers missing or incorrect", headers)

    # ========== MAIN TEST RUNNER ==========
    
    def run_security_tests(self):
        """Run comprehensive security test suite"""
        print("🔒 Starting SpendWise Security Test Suite")
        print("=" * 70)
        
        # Authentication & JWT Security Tests
        print("\n🔐 AUTHENTICATION & JWT SECURITY TESTS")
        print("-" * 50)
        self.test_user_registration_security()
        self.test_user_login_security()
        self.test_jwt_token_refresh()
        self.test_jwt_token_expiry_handling()
        
        # Rate Limiting Tests
        print("\n⏱️  RATE LIMITING TESTS")
        print("-" * 50)
        self.test_auth_rate_limiting()
        self.test_health_check_rate_limiting()
        
        # Input Validation Tests
        print("\n✅ INPUT VALIDATION TESTS")
        print("-" * 50)
        self.test_transaction_input_validation()
        self.test_payment_input_validation()
        
        # Payment Security Tests
        print("\n💳 PAYMENT SECURITY TESTS")
        print("-" * 50)
        self.test_payment_signature_verification()
        self.test_idempotency_handling()
        
        # Security Headers Tests
        print("\n🛡️  SECURITY HEADERS TESTS")
        print("-" * 50)
        self.test_security_headers()
        
        # Access Control Tests
        print("\n🔒 ACCESS CONTROL TESTS")
        print("-" * 50)
        self.test_user_data_isolation()
        self.test_unauthorized_access()
        
        # CORS Tests
        print("\n🌐 CORS TESTS")
        print("-" * 50)
        self.test_cors_configuration()
        
        # Print comprehensive summary
        self.print_security_summary()

    def print_security_summary(self):
        """Print detailed security test results summary"""
        print("\n" + "=" * 70)
        print("🔒 SECURITY TEST RESULTS SUMMARY")
        print("=" * 70)
        
        # Categorize results
        categories = {
            "Authentication & JWT": [],
            "Rate Limiting": [],
            "Input Validation": [],
            "Payment Security": [],
            "Security Headers": [],
            "Access Control": [],
            "CORS": []
        }
        
        for result in self.test_results:
            test_name = result['test']
            if any(keyword in test_name for keyword in ["Registration", "Login", "JWT", "Token"]):
                categories["Authentication & JWT"].append(result)
            elif "Rate Limiting" in test_name:
                categories["Rate Limiting"].append(result)
            elif "Validation" in test_name:
                categories["Input Validation"].append(result)
            elif any(keyword in test_name for keyword in ["Payment", "Signature", "Idempotency"]):
                categories["Payment Security"].append(result)
            elif "Security Headers" in test_name:
                categories["Security Headers"].append(result)
            elif any(keyword in test_name for keyword in ["Isolation", "Unauthorized", "Access"]):
                categories["Access Control"].append(result)
            elif "CORS" in test_name:
                categories["CORS"].append(result)
        
        total_passed = sum(1 for result in self.test_results if result['success'])
        total_failed = len(self.test_results) - total_passed
        
        print(f"📊 Overall Results:")
        print(f"   Total Tests: {len(self.test_results)}")
        print(f"   ✅ Passed: {total_passed}")
        print(f"   ❌ Failed: {total_failed}")
        print(f"   Success Rate: {(total_passed/len(self.test_results)*100):.1f}%")
        
        print(f"\n📋 Results by Category:")
        for category, results in categories.items():
            if results:
                passed = sum(1 for r in results if r['success'])
                total = len(results)
                print(f"   {category}: {passed}/{total} passed")
        
        # Show critical failures
        critical_failures = [r for r in self.test_results if not r['success'] and 
                           any(keyword in r['test'] for keyword in 
                               ["Authentication", "Payment Security", "Access Control"])]
        
        if critical_failures:
            print(f"\n🚨 CRITICAL SECURITY FAILURES:")
            for failure in critical_failures:
                print(f"   • {failure['test']}: {failure['details']}")
        
        # Show all failures for debugging
        if total_failed > 0:
            print(f"\n🔍 ALL FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result['details']}")
        
        print("\n" + "=" * 70)
        
        # Security assessment
        if total_failed == 0:
            print("🎉 EXCELLENT: All security tests passed!")
            print("✅ SpendWise backend security is properly implemented")
        elif len(critical_failures) == 0:
            print("✅ GOOD: Core security features working, minor issues found")
        else:
            print("⚠️  WARNING: Critical security issues detected!")
            print("🔧 Please address critical failures before production deployment")

if __name__ == "__main__":
    tester = SpendWiseSecurityTester()
    tester.run_security_tests()
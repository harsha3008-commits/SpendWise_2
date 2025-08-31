#!/usr/bin/env python3
"""
Final SpendWise Security Test Suite
Comprehensive testing with proper cleanup and unique user generation
"""

import requests
import json
import time
import uuid
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

# Configuration
BASE_URL = "https://privacyfin.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class FinalSecurityTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.test_results = []
        self.auth_tokens = {}
        self.test_users = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code, headers)"""
        url = f"{self.base_url}{endpoint}"
        request_headers = {**self.headers}
        if headers:
            request_headers.update(headers)
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=request_headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, headers=request_headers, json=data, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=request_headers, json=data, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=request_headers, timeout=10)
            elif method.upper() == "OPTIONS":
                response = requests.options(url, headers=request_headers, timeout=10)
            else:
                return False, f"Unsupported method: {method}", 400, {}
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return response.status_code < 400, response_data, response.status_code, dict(response.headers)
        except requests.exceptions.RequestException as e:
            return False, str(e), 0, {}

    def generate_unique_user_data(self) -> Dict:
        """Generate unique test user data"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "email": f"sectest_{unique_id}@spendwise.test",
            "password": "SecurePass123!"
        }

    def test_complete_auth_flow(self):
        """Test complete authentication flow"""
        print("🔐 TESTING COMPLETE AUTHENTICATION FLOW")
        print("-" * 50)
        
        # 1. Test user registration
        user_data = self.generate_unique_user_data()
        success, response, status_code, _ = self.make_request("POST", "/auth/register", user_data)
        
        if success and "access_token" in response:
            self.auth_tokens["main_user"] = {
                "access_token": response["access_token"],
                "refresh_token": response["refresh_token"],
                "email": user_data["email"]
            }
            self.log_test("User Registration", True, "Successfully registered with JWT tokens")
            
            # 2. Test login with same credentials
            login_data = {"email": user_data["email"], "password": user_data["password"]}
            success, login_response, status_code, _ = self.make_request("POST", "/auth/login", login_data)
            
            if success and "access_token" in login_response:
                self.log_test("User Login", True, "Successfully logged in")
                
                # 3. Test token refresh
                refresh_token = response["refresh_token"]
                auth_headers = {"Authorization": f"Bearer {refresh_token}"}
                success, refresh_response, status_code, _ = self.make_request("POST", "/auth/refresh", headers=auth_headers)
                
                if success and "access_token" in refresh_response:
                    # Update tokens
                    self.auth_tokens["main_user"]["access_token"] = refresh_response["access_token"]
                    self.auth_tokens["main_user"]["refresh_token"] = refresh_response["refresh_token"]
                    self.log_test("JWT Token Refresh", True, "Successfully refreshed tokens")
                else:
                    self.log_test("JWT Token Refresh", False, f"Token refresh failed: {status_code}")
            else:
                self.log_test("User Login", False, f"Login failed: {status_code}")
        else:
            self.log_test("User Registration", False, f"Registration failed: {status_code}")

        # 4. Test invalid token handling
        invalid_headers = {"Authorization": "Bearer invalid_token_12345"}
        success, response, status_code, _ = self.make_request("GET", "/transactions", headers=invalid_headers)
        
        if not success and status_code == 401:
            self.log_test("Invalid Token Rejection", True, "Correctly rejected invalid token")
        else:
            self.log_test("Invalid Token Rejection", False, f"Should reject invalid token: {status_code}")

        # 5. Test no token handling
        success, response, status_code, _ = self.make_request("GET", "/transactions")
        
        if not success and status_code == 403:
            self.log_test("No Token Rejection", True, "Correctly rejected request without token")
        else:
            self.log_test("No Token Rejection", False, f"Should reject request without token: {status_code}")

    def test_input_validation_comprehensive(self):
        """Test comprehensive input validation"""
        print("✅ TESTING INPUT VALIDATION")
        print("-" * 50)
        
        # Test password validation
        weak_passwords = [
            "weak",  # Too short
            "weakpassword",  # No uppercase, no digits
            "WEAKPASSWORD",  # No lowercase, no digits
            "WeakPassword",  # No digits
            "WeakPass1"  # Less than 8 characters
        ]
        
        passed_validations = 0
        for i, weak_password in enumerate(weak_passwords):
            user_data = {
                "email": f"weaktest{i}@test.com",
                "password": weak_password
            }
            success, response, status_code, _ = self.make_request("POST", "/auth/register", user_data)
            
            if not success and status_code == 422:
                passed_validations += 1
        
        if passed_validations == len(weak_passwords):
            self.log_test("Password Validation", True, f"All {len(weak_passwords)} weak passwords rejected")
        else:
            self.log_test("Password Validation", False, f"Only {passed_validations}/{len(weak_passwords)} weak passwords rejected")

        # Test email validation
        invalid_emails = ["invalid", "invalid@", "@invalid.com", "invalid.com"]
        passed_email_validations = 0
        
        for i, invalid_email in enumerate(invalid_emails):
            user_data = {
                "email": invalid_email,
                "password": "SecurePass123!"
            }
            success, response, status_code, _ = self.make_request("POST", "/auth/register", user_data)
            
            if not success and status_code == 422:
                passed_email_validations += 1
        
        if passed_email_validations == len(invalid_emails):
            self.log_test("Email Validation", True, f"All {len(invalid_emails)} invalid emails rejected")
        else:
            self.log_test("Email Validation", False, f"Only {passed_email_validations}/{len(invalid_emails)} invalid emails rejected")

        # Test transaction validation (if we have auth)
        if "main_user" in self.auth_tokens:
            auth_headers = {"Authorization": f"Bearer {self.auth_tokens['main_user']['access_token']}"}
            
            # Test invalid transaction data
            invalid_transactions = [
                {"type": "invalid", "amount": 100, "currency": "INR", "categoryId": "test"},  # Invalid type
                {"type": "expense", "amount": -100, "currency": "INR", "categoryId": "test"},  # Negative amount
                {"type": "expense", "amount": 20000000, "currency": "INR", "categoryId": "test"},  # Excessive amount
                {"type": "expense", "amount": 100, "currency": "INVALID", "categoryId": "test"},  # Invalid currency
            ]
            
            passed_tx_validations = 0
            for invalid_tx in invalid_transactions:
                success, response, status_code, _ = self.make_request("POST", "/transactions", invalid_tx, auth_headers)
                if not success and status_code == 422:
                    passed_tx_validations += 1
            
            if passed_tx_validations == len(invalid_transactions):
                self.log_test("Transaction Validation", True, f"All {len(invalid_transactions)} invalid transactions rejected")
            else:
                self.log_test("Transaction Validation", False, f"Only {passed_tx_validations}/{len(invalid_transactions)} invalid transactions rejected")

    def test_payment_security(self):
        """Test payment security features"""
        print("💳 TESTING PAYMENT SECURITY")
        print("-" * 50)
        
        if "main_user" not in self.auth_tokens:
            self.log_test("Payment Security", False, "No authenticated user available")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_tokens['main_user']['access_token']}"}
        
        # Test valid payment order creation
        valid_payment = {
            "amount": 19900,  # ₹199 in paise
            "currency": "INR",
            "plan_type": "premium"
        }
        
        success, response, status_code, _ = self.make_request("POST", "/payments/create-order", valid_payment, auth_headers)
        
        if success and "id" in response:
            order_id = response["id"]
            self.log_test("Payment Order Creation", True, f"Successfully created payment order: {order_id}")
            
            # Test payment verification with invalid signature
            invalid_verification = {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": "pay_test123456789012345678901234567890",  # Valid format
                "razorpay_signature": "a" * 64  # Valid length but invalid signature
            }
            
            success, response, status_code, _ = self.make_request("POST", "/payments/verify", invalid_verification, auth_headers)
            
            if not success and status_code == 400:
                self.log_test("Payment Signature Verification", True, "Correctly rejected invalid signature")
            else:
                self.log_test("Payment Signature Verification", False, f"Should reject invalid signature: {status_code}")
        else:
            self.log_test("Payment Order Creation", False, f"Failed to create payment order: {status_code}")

        # Test invalid payment amounts
        invalid_payments = [
            {"amount": 50, "currency": "INR", "plan_type": "premium"},  # Below minimum
            {"amount": 1000000001, "currency": "INR", "plan_type": "premium"},  # Above maximum
        ]
        
        passed_payment_validations = 0
        for invalid_payment in invalid_payments:
            success, response, status_code, _ = self.make_request("POST", "/payments/create-order", invalid_payment, auth_headers)
            if not success and status_code == 422:
                passed_payment_validations += 1
        
        if passed_payment_validations == len(invalid_payments):
            self.log_test("Payment Amount Validation", True, "All invalid payment amounts rejected")
        else:
            self.log_test("Payment Amount Validation", False, f"Only {passed_payment_validations}/{len(invalid_payments)} invalid amounts rejected")

    def test_security_headers(self):
        """Test security headers"""
        print("🛡️ TESTING SECURITY HEADERS")
        print("-" * 50)
        
        success, response, status_code, headers = self.make_request("GET", "/health")
        
        required_headers = {
            "x-content-type-options": "nosniff",
            "x-frame-options": "DENY", 
            "x-xss-protection": "1; mode=block",
            "referrer-policy": "strict-origin-when-cross-origin",
            "content-security-policy": "default-src 'self'"
        }
        
        missing_headers = []
        for header_name, expected_value in required_headers.items():
            if header_name not in headers:
                missing_headers.append(header_name)
            elif headers[header_name] != expected_value:
                missing_headers.append(f"{header_name} (wrong value: {headers[header_name]})")
        
        if not missing_headers:
            self.log_test("Security Headers", True, "All required security headers present and correct")
        else:
            self.log_test("Security Headers", False, f"Issues with headers: {missing_headers}")

    def test_access_control(self):
        """Test access control and data isolation"""
        print("🔒 TESTING ACCESS CONTROL")
        print("-" * 50)
        
        # Create two different users
        user1_data = self.generate_unique_user_data()
        user2_data = self.generate_unique_user_data()
        
        # Register both users
        success1, response1, _, _ = self.make_request("POST", "/auth/register", user1_data)
        success2, response2, _, _ = self.make_request("POST", "/auth/register", user2_data)
        
        if success1 and success2:
            user1_token = response1["access_token"]
            user2_token = response2["access_token"]
            
            user1_headers = {"Authorization": f"Bearer {user1_token}"}
            user2_headers = {"Authorization": f"Bearer {user2_token}"}
            
            # User1 creates a transaction
            transaction_data = {
                "type": "expense",
                "amount": 100.0,
                "currency": "INR",
                "categoryId": "isolation-test-category"
            }
            
            success, tx_response, _, _ = self.make_request("POST", "/transactions", transaction_data, user1_headers)
            
            if success:
                # User2 tries to access transactions (should only see their own, which is none)
                success, user2_transactions, _, _ = self.make_request("GET", "/transactions", headers=user2_headers)
                
                if success and isinstance(user2_transactions, list):
                    # User2 should not see User1's transaction
                    user1_tx_id = tx_response.get("id")
                    user2_tx_ids = [tx.get("id") for tx in user2_transactions]
                    
                    if user1_tx_id not in user2_tx_ids:
                        self.log_test("Data Isolation", True, "Users can only access their own data")
                    else:
                        self.log_test("Data Isolation", False, "Data isolation breach detected")
                else:
                    self.log_test("Data Isolation", False, "Failed to test data isolation")
            else:
                self.log_test("Data Isolation", False, "Failed to create test transaction")
        else:
            self.log_test("Data Isolation", False, "Failed to create test users for isolation test")

        # Test unauthorized access
        protected_endpoints = [
            ("GET", "/transactions"),
            ("POST", "/transactions"),
            ("POST", "/payments/create-order"),
        ]
        
        unauthorized_rejections = 0
        for method, endpoint in protected_endpoints:
            success, response, status_code, _ = self.make_request(method, endpoint)
            if not success and status_code in [401, 403]:
                unauthorized_rejections += 1
        
        if unauthorized_rejections == len(protected_endpoints):
            self.log_test("Unauthorized Access Protection", True, "All protected endpoints require authentication")
        else:
            self.log_test("Unauthorized Access Protection", False, f"Only {unauthorized_rejections}/{len(protected_endpoints)} endpoints properly protected")

    def test_cors_configuration(self):
        """Test CORS configuration"""
        print("🌐 TESTING CORS CONFIGURATION")
        print("-" * 50)
        
        # Test preflight request
        cors_headers = {
            "Origin": "https://privacyfin.preview.emergentagent.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type,Authorization"
        }
        
        success, response, status_code, headers = self.make_request("OPTIONS", "/health", headers=cors_headers)
        
        # Check for CORS headers
        cors_origin = headers.get("access-control-allow-origin")
        cors_methods = headers.get("access-control-allow-methods")
        
        if cors_origin or cors_methods:
            self.log_test("CORS Configuration", True, f"CORS headers present: Origin={cors_origin}, Methods={cors_methods}")
        else:
            # Try a regular request to see if CORS headers are in normal responses
            success, response, status_code, headers = self.make_request("GET", "/health")
            cors_origin = headers.get("access-control-allow-origin")
            
            if cors_origin:
                self.log_test("CORS Configuration", True, f"CORS configured in regular responses: {cors_origin}")
            else:
                self.log_test("CORS Configuration", False, "No CORS headers found")

    def run_comprehensive_security_tests(self):
        """Run all security tests"""
        print("🔒 SPENDWISE COMPREHENSIVE SECURITY TEST SUITE")
        print("=" * 70)
        
        self.test_complete_auth_flow()
        self.test_input_validation_comprehensive()
        self.test_payment_security()
        self.test_security_headers()
        self.test_access_control()
        self.test_cors_configuration()
        
        self.print_final_summary()

    def print_final_summary(self):
        """Print final comprehensive summary"""
        print("\n" + "=" * 70)
        print("🔒 FINAL SECURITY TEST SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"📊 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {passed_tests}")
        print(f"   ❌ Failed: {failed_tests}")
        print(f"   Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        # Categorize results
        auth_tests = [r for r in self.test_results if any(keyword in r['test'] for keyword in ['Registration', 'Login', 'Token', 'Refresh'])]
        validation_tests = [r for r in self.test_results if 'Validation' in r['test']]
        payment_tests = [r for r in self.test_results if any(keyword in r['test'] for keyword in ['Payment', 'Signature'])]
        security_tests = [r for r in self.test_results if any(keyword in r['test'] for keyword in ['Headers', 'CORS', 'Access', 'Isolation'])]
        
        print(f"\n📋 RESULTS BY CATEGORY:")
        categories = [
            ("Authentication & JWT", auth_tests),
            ("Input Validation", validation_tests), 
            ("Payment Security", payment_tests),
            ("Security & Access Control", security_tests)
        ]
        
        for category_name, category_tests in categories:
            if category_tests:
                category_passed = sum(1 for t in category_tests if t['success'])
                category_total = len(category_tests)
                print(f"   {category_name}: {category_passed}/{category_total} passed")
        
        # Show critical failures
        critical_failures = [r for r in self.test_results if not r['success'] and 
                           any(keyword in r['test'] for keyword in 
                               ['Registration', 'Login', 'Token', 'Payment', 'Signature', 'Access', 'Isolation'])]
        
        if critical_failures:
            print(f"\n🚨 CRITICAL SECURITY ISSUES:")
            for failure in critical_failures:
                print(f"   • {failure['test']}: {failure['details']}")
        
        # Show all failures
        if failed_tests > 0:
            print(f"\n🔍 ALL FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result['details']}")
        
        print("\n" + "=" * 70)
        
        # Final assessment
        if failed_tests == 0:
            print("🎉 EXCELLENT: All security tests passed!")
            print("✅ SpendWise backend security is fully implemented and working")
        elif len(critical_failures) == 0:
            print("✅ GOOD: Core security features working properly")
            print("⚠️  Minor issues found but no critical security vulnerabilities")
        elif len(critical_failures) <= 2:
            print("⚠️  WARNING: Some security issues detected")
            print("🔧 Please address the critical failures listed above")
        else:
            print("🚨 CRITICAL: Multiple security vulnerabilities detected!")
            print("🛑 Immediate attention required before production deployment")

if __name__ == "__main__":
    tester = FinalSecurityTester()
    tester.run_comprehensive_security_tests()
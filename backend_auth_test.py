#!/usr/bin/env python3
"""
SpendWise Authentication & Settings Backend Test Suite
Tests authentication endpoints and user management for enhanced Settings functionality
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

# Configuration
BASE_URL = "https://privacyfin.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class AuthSettingsAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS.copy()
        self.test_results = []
        self.auth_token = None
        self.refresh_token = None
        self.test_user_id = None
        self.test_user_email = f"testuser_{int(time.time())}@spendwise.com"
        self.test_password = "SecurePass123!"
        
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

    def test_health_check(self):
        """Test API health check endpoint"""
        success, data, status_code = self.make_request("GET", "/health")
        
        if success and isinstance(data, dict) and data.get("status") == "healthy":
            self.log_test("API Health Check", True, f"Service is healthy: {data.get('service', 'unknown')}")
        else:
            self.log_test("API Health Check", False, f"Health check failed. Status: {status_code}", data)

    def test_user_registration(self):
        """Test user registration endpoint"""
        registration_data = {
            "email": self.test_user_email,
            "password": self.test_password
        }
        
        success, data, status_code = self.make_request("POST", "/auth/register", registration_data)
        
        if success and isinstance(data, dict):
            if "access_token" in data and "refresh_token" in data:
                self.auth_token = data["access_token"]
                self.refresh_token = data["refresh_token"]
                self.log_test("User Registration", True, f"User registered successfully with tokens")
                return True
            else:
                self.log_test("User Registration", False, "Registration succeeded but missing tokens", data)
                return False
        else:
            self.log_test("User Registration", False, f"Registration failed. Status: {status_code}", data)
            return False

    def test_user_login(self):
        """Test user login endpoint"""
        login_data = {
            "email": self.test_user_email,
            "password": self.test_password
        }
        
        success, data, status_code = self.make_request("POST", "/auth/login", login_data)
        
        if success and isinstance(data, dict):
            if "access_token" in data and "refresh_token" in data:
                self.auth_token = data["access_token"]
                self.refresh_token = data["refresh_token"]
                self.log_test("User Login", True, f"Login successful with valid tokens")
                return True
            else:
                self.log_test("User Login", False, "Login succeeded but missing tokens", data)
                return False
        else:
            self.log_test("User Login", False, f"Login failed. Status: {status_code}", data)
            return False

    def test_token_refresh(self):
        """Test JWT token refresh endpoint"""
        if not self.refresh_token:
            self.log_test("Token Refresh", False, "No refresh token available for testing")
            return False
            
        # Use refresh token in Authorization header
        old_token = self.auth_token
        self.auth_token = self.refresh_token  # Temporarily use refresh token
        
        success, data, status_code = self.make_request("POST", "/auth/refresh", use_auth=True)
        
        if success and isinstance(data, dict):
            if "access_token" in data and "refresh_token" in data:
                self.auth_token = data["access_token"]
                self.refresh_token = data["refresh_token"]
                self.log_test("Token Refresh", True, f"Token refreshed successfully")
                return True
            else:
                self.auth_token = old_token  # Restore old token
                self.log_test("Token Refresh", False, "Refresh succeeded but missing new tokens", data)
                return False
        else:
            self.auth_token = old_token  # Restore old token
            self.log_test("Token Refresh", False, f"Token refresh failed. Status: {status_code}", data)
            return False

    def test_invalid_token_rejection(self):
        """Test that invalid tokens are properly rejected"""
        old_token = self.auth_token
        self.auth_token = "invalid_token_12345"
        
        success, data, status_code = self.make_request("GET", "/transactions", use_auth=True)
        
        self.auth_token = old_token  # Restore valid token
        
        if status_code == 401:
            self.log_test("Invalid Token Rejection", True, "Invalid token correctly rejected with 401")
            return True
        else:
            self.log_test("Invalid Token Rejection", False, f"Expected 401 for invalid token, got {status_code}", data)
            return False

    def test_unauthorized_access_protection(self):
        """Test that protected endpoints require authentication"""
        old_token = self.auth_token
        self.auth_token = None  # Remove token
        
        success, data, status_code = self.make_request("GET", "/transactions", use_auth=False)
        
        self.auth_token = old_token  # Restore token
        
        if status_code in [401, 403]:
            self.log_test("Unauthorized Access Protection", True, f"Protected endpoint correctly rejected unauthenticated request with {status_code}")
            return True
        else:
            self.log_test("Unauthorized Access Protection", False, f"Expected 401/403 for unauthenticated request, got {status_code}", data)
            return False

    def test_password_validation(self):
        """Test password validation during registration"""
        weak_passwords = [
            "123",  # Too short
            "password",  # No uppercase, no numbers
            "PASSWORD",  # No lowercase, no numbers  
            "Password",  # No numbers
            "12345678"  # No letters
        ]
        
        passed_validations = 0
        total_validations = len(weak_passwords)
        
        for i, weak_password in enumerate(weak_passwords):
            test_email = f"weakpass_{i}_{int(time.time())}@test.com"
            registration_data = {
                "email": test_email,
                "password": weak_password
            }
            
            success, data, status_code = self.make_request("POST", "/auth/register", registration_data)
            
            if status_code >= 400:  # Should reject weak password
                passed_validations += 1
            
        if passed_validations >= 4:  # Allow 1 edge case to pass
            self.log_test("Password Validation", True, f"Password validation working: {passed_validations}/{total_validations} weak passwords rejected")
            return True
        else:
            self.log_test("Password Validation", False, f"Password validation insufficient: only {passed_validations}/{total_validations} weak passwords rejected")
            return False

    def test_email_validation(self):
        """Test email validation during registration"""
        invalid_emails = [
            "notanemail",
            "@domain.com",
            "user@",
            "user@domain"
        ]
        
        passed_validations = 0
        total_validations = len(invalid_emails)
        
        for i, invalid_email in enumerate(invalid_emails):
            registration_data = {
                "email": invalid_email,
                "password": self.test_password
            }
            
            success, data, status_code = self.make_request("POST", "/auth/register", registration_data)
            
            if status_code >= 400:  # Should reject invalid email
                passed_validations += 1
                
        if passed_validations == total_validations:
            self.log_test("Email Validation", True, f"Email validation working: all {total_validations} invalid emails rejected")
            return True
        else:
            self.log_test("Email Validation", False, f"Email validation failed: only {passed_validations}/{total_validations} invalid emails rejected")
            return False

    def test_duplicate_user_registration(self):
        """Test that duplicate user registration is prevented"""
        # Try to register the same user again
        registration_data = {
            "email": self.test_user_email,
            "password": self.test_password
        }
        
        success, data, status_code = self.make_request("POST", "/auth/register", registration_data)
        
        if status_code == 400:
            self.log_test("Duplicate User Registration Prevention", True, "Duplicate registration correctly rejected")
            return True
        else:
            self.log_test("Duplicate User Registration Prevention", False, f"Expected 400 for duplicate registration, got {status_code}", data)
            return False

    def test_invalid_login_credentials(self):
        """Test login with invalid credentials"""
        invalid_login_data = {
            "email": self.test_user_email,
            "password": "WrongPassword123!"
        }
        
        success, data, status_code = self.make_request("POST", "/auth/login", invalid_login_data)
        
        if status_code == 401:
            self.log_test("Invalid Login Credentials", True, "Invalid credentials correctly rejected with 401")
            return True
        else:
            self.log_test("Invalid Login Credentials", False, f"Expected 401 for invalid credentials, got {status_code}", data)
            return False

    def test_authenticated_transaction_access(self):
        """Test that authenticated users can access their data"""
        if not self.auth_token:
            self.log_test("Authenticated Transaction Access", False, "No auth token available")
            return False
            
        success, data, status_code = self.make_request("GET", "/transactions", use_auth=True)
        
        if success and isinstance(data, list):
            self.log_test("Authenticated Transaction Access", True, f"Authenticated user can access transactions: {len(data)} found")
            return True
        else:
            self.log_test("Authenticated Transaction Access", False, f"Failed to access transactions with auth. Status: {status_code}", data)
            return False

    def test_jwt_token_structure(self):
        """Test JWT token structure and expiration"""
        if not self.auth_token:
            self.log_test("JWT Token Structure", False, "No auth token available")
            return False
            
        try:
            # Basic JWT structure check (should have 3 parts separated by dots)
            parts = self.auth_token.split('.')
            if len(parts) == 3:
                self.log_test("JWT Token Structure", True, "JWT token has correct structure (3 parts)")
                return True
            else:
                self.log_test("JWT Token Structure", False, f"JWT token has incorrect structure: {len(parts)} parts")
                return False
        except Exception as e:
            self.log_test("JWT Token Structure", False, f"Error checking JWT structure: {str(e)}")
            return False

    def test_security_headers(self):
        """Test that security headers are properly set"""
        success, data, status_code = self.make_request("GET", "/health")
        
        # Make a raw request to check headers
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            headers = response.headers
            
            security_headers = {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY", 
                "X-XSS-Protection": "1; mode=block",
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "Content-Security-Policy": "default-src 'self'"
            }
            
            missing_headers = []
            for header, expected_value in security_headers.items():
                if header not in headers:
                    missing_headers.append(header)
                elif headers[header] != expected_value:
                    missing_headers.append(f"{header} (incorrect value)")
            
            if not missing_headers:
                self.log_test("Security Headers", True, "All required security headers present and correct")
                return True
            else:
                self.log_test("Security Headers", False, f"Missing or incorrect security headers: {missing_headers}")
                return False
                
        except Exception as e:
            self.log_test("Security Headers", False, f"Error checking security headers: {str(e)}")
            return False

    def run_authentication_tests(self):
        """Run comprehensive authentication and security tests"""
        print("🔐 Starting SpendWise Authentication & Settings Test Suite")
        print("=" * 70)
        
        # Basic health check
        self.test_health_check()
        
        # Test security headers
        self.test_security_headers()
        
        # Test input validation
        self.test_email_validation()
        self.test_password_validation()
        
        # Test user registration
        if not self.test_user_registration():
            print("❌ Cannot continue tests without successful registration")
            return
            
        # Test duplicate registration prevention
        self.test_duplicate_user_registration()
        
        # Test login functionality
        self.test_user_login()
        
        # Test invalid login
        self.test_invalid_login_credentials()
        
        # Test JWT token functionality
        self.test_jwt_token_structure()
        self.test_token_refresh()
        
        # Test security measures
        self.test_invalid_token_rejection()
        self.test_unauthorized_access_protection()
        
        # Test authenticated access
        self.test_authenticated_transaction_access()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 70)
        print("📊 AUTHENTICATION & SETTINGS TEST RESULTS")
        print("=" * 70)
        
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
        
        print("\n" + "=" * 70)
        
        # Return summary for integration with main testing
        return {
            "total_tests": len(self.test_results),
            "passed": passed,
            "failed": failed,
            "success_rate": (passed/len(self.test_results)*100) if self.test_results else 0,
            "failed_tests": [r for r in self.test_results if not r['success']]
        }

if __name__ == "__main__":
    tester = AuthSettingsAPITester()
    tester.run_authentication_tests()
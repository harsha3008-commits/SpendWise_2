#!/usr/bin/env python3
"""
SpendWise Comprehensive Backend Test Suite
Tests authentication system and user management endpoints for enhanced Settings functionality
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

# Configuration
BASE_URL = "https://privacyfin.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class ComprehensiveAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS.copy()
        self.test_results = []
        self.auth_token = None
        self.refresh_token = None
        self.test_user_id = None
        self.test_user_email = f"comprehensive_{int(time.time())}@spendwise.com"
        self.test_password = "ComprehensiveTest123!"
        
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

    # ========== AUTHENTICATION TESTS ==========
    
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
                self.log_test("User Registration", True, f"User registered successfully with JWT tokens")
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
                self.log_test("User Login", True, f"Login successful with valid JWT tokens")
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
            
        old_token = self.auth_token
        self.auth_token = self.refresh_token
        
        success, data, status_code = self.make_request("POST", "/auth/refresh", use_auth=True)
        
        if success and isinstance(data, dict):
            if "access_token" in data and "refresh_token" in data:
                self.auth_token = data["access_token"]
                self.refresh_token = data["refresh_token"]
                self.log_test("Token Refresh", True, f"JWT token refreshed successfully")
                return True
            else:
                self.auth_token = old_token
                self.log_test("Token Refresh", False, "Refresh succeeded but missing new tokens", data)
                return False
        else:
            self.auth_token = old_token
            self.log_test("Token Refresh", False, f"Token refresh failed. Status: {status_code}", data)
            return False

    def test_jwt_security(self):
        """Test JWT token security features"""
        # Test invalid token rejection
        old_token = self.auth_token
        self.auth_token = "invalid_jwt_token_12345"
        
        success, data, status_code = self.make_request("GET", "/transactions", use_auth=True)
        
        self.auth_token = old_token
        
        if status_code == 401:
            self.log_test("JWT Security - Invalid Token Rejection", True, "Invalid JWT token correctly rejected with 401")
        else:
            self.log_test("JWT Security - Invalid Token Rejection", False, f"Expected 401 for invalid token, got {status_code}", data)

        # Test unauthorized access protection
        self.auth_token = None
        success, data, status_code = self.make_request("GET", "/transactions", use_auth=False)
        self.auth_token = old_token
        
        if status_code in [401, 403]:
            self.log_test("JWT Security - Unauthorized Access Protection", True, f"Unauthenticated request correctly rejected with {status_code}")
        else:
            self.log_test("JWT Security - Unauthorized Access Protection", False, f"Expected 401/403 for unauthenticated request, got {status_code}", data)

    # ========== USER MANAGEMENT TESTS (FOR SETTINGS) ==========
    
    def test_get_user_profile(self):
        """Test GET /api/users/{id} - get user profile for settings"""
        if not self.test_user_id:
            self.test_user_id = "test-user-id"
            
        success, data, status_code = self.make_request("GET", f"/users/{self.test_user_id}", use_auth=True)
        
        if success and isinstance(data, dict):
            expected_fields = ["id", "email", "created_at"]
            if all(field in data for field in expected_fields):
                self.log_test("Get User Profile (Settings)", True, f"User profile endpoint working for settings screen")
                return True
            else:
                missing_fields = [field for field in expected_fields if field not in data]
                self.log_test("Get User Profile (Settings)", False, f"Missing profile fields: {missing_fields}", data)
                return False
        elif status_code == 404:
            self.log_test("Get User Profile (Settings)", False, "❌ CRITICAL: GET /api/users/{id} endpoint not implemented - required for Settings screen", data)
            return False
        else:
            self.log_test("Get User Profile (Settings)", False, f"Failed to get user profile. Status: {status_code}", data)
            return False

    def test_update_user_profile(self):
        """Test PUT /api/users/{id} - update user profile (name, email)"""
        if not self.test_user_id:
            self.test_user_id = "test-user-id"
            
        update_data = {
            "name": "Updated Settings User",
            "email": f"updated_{self.test_user_email}"
        }
        
        success, data, status_code = self.make_request("PUT", f"/users/{self.test_user_id}", update_data, use_auth=True)
        
        if success and isinstance(data, dict):
            if data.get("name") == update_data["name"] or data.get("email") == update_data["email"]:
                self.log_test("Update User Profile (Settings)", True, f"Profile update endpoint working for settings screen")
                return True
            else:
                self.log_test("Update User Profile (Settings)", False, "Profile update didn't reflect changes", data)
                return False
        elif status_code == 404:
            self.log_test("Update User Profile (Settings)", False, "❌ CRITICAL: PUT /api/users/{id} endpoint not implemented - required for Settings profile editing", data)
            return False
        else:
            self.log_test("Update User Profile (Settings)", False, f"Failed to update user profile. Status: {status_code}", data)
            return False

    def test_change_password(self):
        """Test PUT /api/users/{id}/password - change password"""
        if not self.test_user_id:
            self.test_user_id = "test-user-id"
            
        password_data = {
            "current_password": self.test_password,
            "new_password": "NewSettingsPass123!"
        }
        
        success, data, status_code = self.make_request("PUT", f"/users/{self.test_user_id}/password", password_data, use_auth=True)
        
        if success:
            self.log_test("Change Password (Settings)", True, f"Password change endpoint working for settings screen")
            return True
        elif status_code == 404:
            self.log_test("Change Password (Settings)", False, "❌ CRITICAL: PUT /api/users/{id}/password endpoint not implemented - required for Settings password change", data)
            return False
        else:
            self.log_test("Change Password (Settings)", False, f"Failed to change password. Status: {status_code}", data)
            return False

    # ========== ENHANCED SECURITY TESTS ==========
    
    def test_password_validation(self):
        """Test strong password requirements"""
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
            
            if status_code >= 400:
                passed_validations += 1
            
        if passed_validations >= 4:
            self.log_test("Strong Password Requirements", True, f"Password validation enforced: {passed_validations}/{total_validations} weak passwords rejected")
            return True
        else:
            self.log_test("Strong Password Requirements", False, f"Insufficient password validation: only {passed_validations}/{total_validations} weak passwords rejected")
            return False

    def test_security_headers(self):
        """Test security headers implementation"""
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
                self.log_test("Security Headers", True, "All required security headers properly implemented")
                return True
            else:
                self.log_test("Security Headers", False, f"Missing or incorrect security headers: {missing_headers}")
                return False
                
        except Exception as e:
            self.log_test("Security Headers", False, f"Error checking security headers: {str(e)}")
            return False

    def run_comprehensive_tests(self):
        """Run comprehensive authentication and settings tests"""
        print("🔐 Starting SpendWise Comprehensive Backend Test Suite")
        print("Testing Authentication System & User Management for Enhanced Settings")
        print("=" * 80)
        
        # ========== PHASE 1: AUTHENTICATION TESTS ==========
        print("\n🔑 PHASE 1: AUTHENTICATION SYSTEM TESTS")
        print("-" * 50)
        
        self.test_health_check()
        self.test_security_headers()
        self.test_password_validation()
        
        if not self.test_user_registration():
            print("❌ Cannot continue tests without successful registration")
            return self.print_summary()
            
        self.test_user_login()
        self.test_token_refresh()
        self.test_jwt_security()
        
        # ========== PHASE 2: USER MANAGEMENT TESTS (FOR SETTINGS) ==========
        print("\n⚙️  PHASE 2: USER MANAGEMENT ENDPOINTS (FOR SETTINGS)")
        print("-" * 50)
        
        self.test_get_user_profile()
        self.test_update_user_profile()
        self.test_change_password()
        
        # Print summary
        return self.print_summary()

    def print_summary(self):
        """Print comprehensive test results summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE BACKEND TEST RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result['success'])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        # Categorize results
        auth_tests = [r for r in self.test_results if any(keyword in r['test'].lower() for keyword in ['registration', 'login', 'token', 'jwt', 'auth', 'security', 'password', 'health'])]
        settings_tests = [r for r in self.test_results if 'settings' in r['test'].lower() or 'profile' in r['test'].lower()]
        
        auth_passed = sum(1 for r in auth_tests if r['success'])
        settings_passed = sum(1 for r in settings_tests if r['success'])
        
        print(f"\n📈 BREAKDOWN BY CATEGORY:")
        print(f"🔑 Authentication System: {auth_passed}/{len(auth_tests)} passed ({(auth_passed/len(auth_tests)*100):.1f}%)")
        print(f"⚙️  Settings Endpoints: {settings_passed}/{len(settings_tests)} passed ({(settings_passed/len(settings_tests)*100):.1f}%)")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)
        
        return {
            "total_tests": len(self.test_results),
            "passed": passed,
            "failed": failed,
            "success_rate": (passed/len(self.test_results)*100) if self.test_results else 0,
            "auth_tests": {"passed": auth_passed, "total": len(auth_tests)},
            "settings_tests": {"passed": settings_passed, "total": len(settings_tests)},
            "failed_tests": [r for r in self.test_results if not r['success']]
        }

if __name__ == "__main__":
    tester = ComprehensiveAPITester()
    tester.run_comprehensive_tests()
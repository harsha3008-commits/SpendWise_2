#!/usr/bin/env python3
"""
SpendWise Settings Backend Test Suite
Tests user management endpoints required for enhanced Settings functionality
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

# Configuration
BASE_URL = "https://privacyfin.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class SettingsAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS.copy()
        self.test_results = []
        self.auth_token = None
        self.test_user_id = None
        self.test_user_email = f"settingsuser_{int(time.time())}@spendwise.com"
        self.test_password = "SettingsPass123!"
        
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

    def setup_test_user(self):
        """Create and authenticate a test user for settings tests"""
        # Register user
        registration_data = {
            "email": self.test_user_email,
            "password": self.test_password
        }
        
        success, data, status_code = self.make_request("POST", "/auth/register", registration_data)
        
        if success and isinstance(data, dict) and "access_token" in data:
            self.auth_token = data["access_token"]
            print(f"✅ Test user created and authenticated: {self.test_user_email}")
            return True
        else:
            print(f"❌ Failed to create test user: {data}")
            return False

    def test_get_user_profile(self):
        """Test GET /api/users/{id} - get user profile for settings"""
        if not self.test_user_id:
            # Try to extract user ID from JWT token or use a test ID
            self.test_user_id = "test-user-id"
            
        success, data, status_code = self.make_request("GET", f"/users/{self.test_user_id}", use_auth=True)
        
        if success and isinstance(data, dict):
            expected_fields = ["id", "email", "created_at"]
            if all(field in data for field in expected_fields):
                self.log_test("Get User Profile", True, f"User profile retrieved successfully")
                return True
            else:
                missing_fields = [field for field in expected_fields if field not in data]
                self.log_test("Get User Profile", False, f"Missing profile fields: {missing_fields}", data)
                return False
        elif status_code == 404:
            self.log_test("Get User Profile", False, "GET /api/users/{id} endpoint not implemented", data)
            return False
        else:
            self.log_test("Get User Profile", False, f"Failed to get user profile. Status: {status_code}", data)
            return False

    def test_update_user_profile(self):
        """Test PUT /api/users/{id} - update user profile (name, email)"""
        if not self.test_user_id:
            self.test_user_id = "test-user-id"
            
        update_data = {
            "name": "Updated Test User",
            "email": f"updated_{self.test_user_email}"
        }
        
        success, data, status_code = self.make_request("PUT", f"/users/{self.test_user_id}", update_data, use_auth=True)
        
        if success and isinstance(data, dict):
            if data.get("name") == update_data["name"] or data.get("email") == update_data["email"]:
                self.log_test("Update User Profile", True, f"User profile updated successfully")
                return True
            else:
                self.log_test("Update User Profile", False, "Profile update didn't reflect changes", data)
                return False
        elif status_code == 404:
            self.log_test("Update User Profile", False, "PUT /api/users/{id} endpoint not implemented", data)
            return False
        else:
            self.log_test("Update User Profile", False, f"Failed to update user profile. Status: {status_code}", data)
            return False

    def test_change_password(self):
        """Test PUT /api/users/{id}/password - change password"""
        if not self.test_user_id:
            self.test_user_id = "test-user-id"
            
        password_data = {
            "current_password": self.test_password,
            "new_password": "NewSecurePass123!"
        }
        
        success, data, status_code = self.make_request("PUT", f"/users/{self.test_user_id}/password", password_data, use_auth=True)
        
        if success:
            self.log_test("Change Password", True, f"Password changed successfully")
            return True
        elif status_code == 404:
            self.log_test("Change Password", False, "PUT /api/users/{id}/password endpoint not implemented", data)
            return False
        else:
            self.log_test("Change Password", False, f"Failed to change password. Status: {status_code}", data)
            return False

    def test_password_change_validation(self):
        """Test password change with invalid current password"""
        if not self.test_user_id:
            self.test_user_id = "test-user-id"
            
        invalid_password_data = {
            "current_password": "WrongCurrentPassword",
            "new_password": "NewSecurePass123!"
        }
        
        success, data, status_code = self.make_request("PUT", f"/users/{self.test_user_id}/password", invalid_password_data, use_auth=True)
        
        if status_code == 401 or status_code == 400:
            self.log_test("Password Change Validation", True, f"Invalid current password correctly rejected with {status_code}")
            return True
        elif status_code == 404:
            self.log_test("Password Change Validation", False, "PUT /api/users/{id}/password endpoint not implemented", data)
            return False
        else:
            self.log_test("Password Change Validation", False, f"Should reject invalid current password, got {status_code}", data)
            return False

    def test_user_data_isolation(self):
        """Test that users can only access their own data"""
        # Try to access another user's profile
        other_user_id = "other-user-id-12345"
        
        success, data, status_code = self.make_request("GET", f"/users/{other_user_id}", use_auth=True)
        
        if status_code in [403, 404]:
            self.log_test("User Data Isolation", True, f"Access to other user's data correctly denied with {status_code}")
            return True
        elif status_code == 404 and "not implemented" in str(data).lower():
            self.log_test("User Data Isolation", False, "Cannot test - user endpoints not implemented", data)
            return False
        else:
            self.log_test("User Data Isolation", False, f"Should deny access to other user's data, got {status_code}", data)
            return False

    def test_settings_related_endpoints(self):
        """Test additional endpoints that might be needed for settings"""
        
        # Test if there are any user preference endpoints
        endpoints_to_test = [
            "/users/preferences",
            "/users/settings", 
            "/users/profile",
            "/settings/profile",
            "/settings/password"
        ]
        
        found_endpoints = []
        
        for endpoint in endpoints_to_test:
            success, data, status_code = self.make_request("GET", endpoint, use_auth=True)
            if status_code != 404:
                found_endpoints.append(f"{endpoint} (status: {status_code})")
        
        if found_endpoints:
            self.log_test("Additional Settings Endpoints", True, f"Found alternative endpoints: {found_endpoints}")
            return True
        else:
            self.log_test("Additional Settings Endpoints", False, "No alternative settings endpoints found")
            return False

    def run_settings_tests(self):
        """Run comprehensive settings functionality tests"""
        print("⚙️  Starting SpendWise Settings Backend Test Suite")
        print("=" * 70)
        
        # Setup test user
        if not self.setup_test_user():
            print("❌ Cannot continue tests without authenticated user")
            return
        
        # Test user management endpoints required for settings
        self.test_get_user_profile()
        self.test_update_user_profile()
        self.test_change_password()
        self.test_password_change_validation()
        self.test_user_data_isolation()
        
        # Test for alternative settings endpoints
        self.test_settings_related_endpoints()
        
        # Print summary
        return self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 70)
        print("📊 SETTINGS BACKEND TEST RESULTS")
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
    tester = SettingsAPITester()
    tester.run_settings_tests()
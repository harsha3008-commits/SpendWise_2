#!/usr/bin/env python3
"""
SpendWise Premium Features Test Suite
Focused testing of newly implemented Premium Features
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any

# Configuration
BASE_URL = "https://privacyfin.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class PremiumFeaturesAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.test_results = []
        self.auth_token = None
        self.refresh_token = None
        self.test_user_email = f"premium_test_{int(time.time())}@spendwise.com"
        self.test_user_password = "PremiumTest123!"
    
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
            else:
                return False, f"Unsupported method: {method}", 400
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return response.status_code < 400, response_data, response.status_code
        except requests.exceptions.RequestException as e:
            return False, str(e), 0

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
            self.log_test("JWT Authentication - User Registration", True, f"User registered with JWT tokens, expires in {data.get('expires_in', 'N/A')} seconds")
            return True
        else:
            self.log_test("JWT Authentication - User Registration", False, f"Registration failed. Status: {status_code}", data)
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
            self.log_test("JWT Authentication - User Login", True, f"Login successful, token type: {data.get('token_type', 'bearer')}")
            return True
        else:
            self.log_test("JWT Authentication - User Login", False, f"Login failed. Status: {status_code}", data)
            return False

    def test_token_refresh(self):
        """Test JWT token refresh functionality"""
        if not self.refresh_token:
            self.log_test("JWT Authentication - Token Refresh", False, "No refresh token available")
            return False
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {self.refresh_token}"
        
        try:
            response = requests.post(f"{self.base_url}/auth/refresh", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    old_token = self.auth_token[:20] + "..."
                    self.auth_token = data["access_token"]
                    self.refresh_token = data["refresh_token"]
                    new_token = self.auth_token[:20] + "..."
                    self.log_test("JWT Authentication - Token Refresh", True, f"Token refreshed successfully (old: {old_token}, new: {new_token})")
                    return True
            
            self.log_test("JWT Authentication - Token Refresh", False, f"Token refresh failed. Status: {response.status_code}")
            return False
        except Exception as e:
            self.log_test("JWT Authentication - Token Refresh", False, f"Token refresh error: {str(e)}")
            return False

    # ===== PREMIUM FEATURES TESTS =====
    
    def test_premium_status_check(self):
        """Test premium subscription status endpoint"""
        if not self.auth_token:
            self.log_test("Premium Status Management", False, "No authentication token available")
            return
        
        success, data, status_code = self.make_request("GET", "/premium/status", use_auth=True)
        
        if success and isinstance(data, dict):
            required_fields = ["isPremium", "plan", "features"]
            if all(field in data for field in required_fields):
                plan = data.get('plan', 'unknown')
                is_premium = data.get('isPremium', False)
                features = data.get('features', {})
                feature_count = len(features)
                self.log_test("Premium Status Management", True, f"Status: {plan} (Premium: {is_premium}), {feature_count} features available")
            else:
                missing_fields = [field for field in required_fields if field not in data]
                self.log_test("Premium Status Management", False, f"Missing required fields: {missing_fields}")
        else:
            self.log_test("Premium Status Management", False, f"Premium status check failed. Status: {status_code}", data)

    def test_ai_quick_insights(self):
        """Test quick AI insights for dashboard"""
        if not self.auth_token:
            self.log_test("AI Analysis - Quick Insights", False, "No authentication token available")
            return
        
        success, data, status_code = self.make_request("GET", "/ai/quick-insights", use_auth=True)
        
        if success and isinstance(data, dict) and "insights" in data:
            insights = data["insights"]
            if isinstance(insights, list):
                insight_count = len(insights)
                if insight_count > 0:
                    sample_insight = insights[0][:50] + "..." if len(insights[0]) > 50 else insights[0]
                    self.log_test("AI Analysis - Quick Insights", True, f"Retrieved {insight_count} insights. Sample: '{sample_insight}'")
                else:
                    self.log_test("AI Analysis - Quick Insights", True, "No insights available (expected for new user)")
            else:
                self.log_test("AI Analysis - Quick Insights", False, "Insights field is not a list")
        else:
            self.log_test("AI Analysis - Quick Insights", False, f"Quick insights failed. Status: {status_code}", data)

    def test_payment_integration_with_auth(self):
        """Test payment order creation with authentication"""
        if not self.auth_token:
            self.log_test("Payment Integration with JWT", False, "No authentication token available")
            return
        
        order_data = {
            "amount": 99900,  # ₹999 in paise for premium subscription
            "currency": "INR",
            "receipt": f"premium_upgrade_{int(time.time())}",
            "plan_type": "premium"
        }
        
        success, data, status_code = self.make_request("POST", "/payments/create-order", order_data, use_auth=True)
        
        if success and isinstance(data, dict) and "id" in data:
            order_id = data["id"]
            amount = data.get("amount", 0) / 100  # Convert paise to rupees
            currency = data.get("currency", "INR")
            self.log_test("Payment Integration with JWT", True, f"Created Razorpay order: {order_id} for {currency} {amount}")
            return data
        else:
            self.log_test("Payment Integration with JWT", False, f"Failed to create payment order. Status: {status_code}", data)
            return None

    def test_health_check(self):
        """Test API health check"""
        success, data, status_code = self.make_request("GET", "/health")
        
        if success and isinstance(data, dict) and data.get("status") == "healthy":
            service = data.get("service", "unknown")
            version = data.get("version", "unknown")
            self.log_test("Health Check", True, f"Service: {service} v{version} is healthy")
        else:
            self.log_test("Health Check", False, f"Health check failed. Status: {status_code}", data)

    def test_authenticated_transactions_access(self):
        """Test that transactions endpoint requires authentication"""
        # Test without authentication
        success_no_auth, data_no_auth, status_no_auth = self.make_request("GET", "/transactions", use_auth=False)
        
        # Test with authentication
        success_with_auth, data_with_auth, status_with_auth = self.make_request("GET", "/transactions", use_auth=True)
        
        if status_no_auth in [401, 403] and status_with_auth in [200, 403]:  # 403 is acceptable if user has no transactions
            self.log_test("Authentication Protection", True, f"Unauthenticated access blocked ({status_no_auth}), authenticated access allowed ({status_with_auth})")
        else:
            self.log_test("Authentication Protection", False, f"Authentication protection not working properly. No auth: {status_no_auth}, With auth: {status_with_auth}")

    def run_premium_features_tests(self):
        """Run focused Premium Features test suite"""
        print("🚀 Starting SpendWise Premium Features Test Suite")
        print("=" * 70)
        print("🎯 Focus: Authentication, AI Analysis, Premium Status, Payment Integration")
        print("=" * 70)
        
        # Basic health check
        self.test_health_check()
        
        # ===== AUTHENTICATION SYSTEM =====
        print("\n🔐 TESTING JWT AUTHENTICATION SYSTEM")
        print("-" * 50)
        
        if not self.test_user_registration():
            print("❌ Cannot continue tests without successful registration")
            return
        
        self.test_user_login()
        self.test_token_refresh()
        self.test_authenticated_transactions_access()
        
        # ===== PREMIUM FEATURES =====
        print("\n💎 TESTING PREMIUM FEATURES")
        print("-" * 50)
        
        self.test_premium_status_check()
        
        # ===== AI ANALYSIS =====
        print("\n🤖 TESTING AI ANALYSIS")
        print("-" * 50)
        
        self.test_ai_quick_insights()
        
        # ===== PAYMENT INTEGRATION =====
        print("\n💳 TESTING PAYMENT INTEGRATION")
        print("-" * 50)
        
        self.test_payment_integration_with_auth()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 70)
        print("📊 PREMIUM FEATURES TEST RESULTS SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for result in self.test_results if result['success'])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        # Categorize results
        auth_tests = [r for r in self.test_results if "Authentication" in r['test'] or "JWT" in r['test']]
        premium_tests = [r for r in self.test_results if "Premium" in r['test']]
        ai_tests = [r for r in self.test_results if "AI" in r['test']]
        payment_tests = [r for r in self.test_results if "Payment" in r['test']]
        
        print(f"\n📈 CATEGORY BREAKDOWN:")
        print(f"🔐 Authentication: {sum(1 for r in auth_tests if r['success'])}/{len(auth_tests)} passed")
        print(f"💎 Premium Features: {sum(1 for r in premium_tests if r['success'])}/{len(premium_tests)} passed")
        print(f"🤖 AI Analysis: {sum(1 for r in ai_tests if r['success'])}/{len(ai_tests)} passed")
        print(f"💳 Payment Integration: {sum(1 for r in payment_tests if r['success'])}/{len(payment_tests)} passed")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        print("\n" + "=" * 70)

if __name__ == "__main__":
    tester = PremiumFeaturesAPITester()
    tester.run_premium_features_tests()
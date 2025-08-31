#!/usr/bin/env python3
"""
SpendWise Comprehensive Premium Features Test Suite
Tests all Premium Features including AI Analysis, Monthly Reports, and Premium Status
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any

# Configuration
BASE_URL = "https://fintrack-app-20.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class ComprehensivePremiumTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.test_results = []
        self.auth_token = None
        self.refresh_token = None
        self.user_id = None
        self.test_user_email = f"comprehensive_test_{int(time.time())}@spendwise.com"
        self.test_user_password = "ComprehensiveTest123!"
    
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

    def setup_authentication(self):
        """Setup authentication and get user ID"""
        print("🔐 SETTING UP AUTHENTICATION")
        print("-" * 50)
        
        # Register user
        user_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        success, data, status_code = self.make_request("POST", "/auth/register", user_data)
        
        if success and isinstance(data, dict) and "access_token" in data:
            self.auth_token = data["access_token"]
            self.refresh_token = data["refresh_token"]
            
            # Decode JWT to get user ID (simple extraction for testing)
            import base64
            try:
                # JWT payload is the middle part
                payload_part = self.auth_token.split('.')[1]
                # Add padding if needed
                payload_part += '=' * (4 - len(payload_part) % 4)
                payload = json.loads(base64.b64decode(payload_part))
                self.user_id = payload.get('sub')
                
                self.log_test("Authentication Setup", True, f"User registered and authenticated. User ID: {self.user_id}")
                return True
            except Exception as e:
                self.log_test("Authentication Setup", False, f"Failed to extract user ID: {str(e)}")
                return False
        else:
            self.log_test("Authentication Setup", False, f"Registration failed. Status: {status_code}", data)
            return False

    def test_health_check(self):
        """Test API health check"""
        success, data, status_code = self.make_request("GET", "/health")
        
        if success and isinstance(data, dict) and data.get("status") == "healthy":
            service = data.get("service", "unknown")
            version = data.get("version", "unknown")
            self.log_test("Health Check", True, f"Service: {service} v{version} is healthy")
        else:
            self.log_test("Health Check", False, f"Health check failed. Status: {status_code}", data)

    def test_premium_status_management(self):
        """Test premium subscription status management"""
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

    def test_premium_upgrade(self):
        """Test premium upgrade functionality"""
        if not self.auth_token:
            self.log_test("Premium Upgrade Functionality", False, "No authentication token available")
            return
        
        success, data, status_code = self.make_request("POST", "/premium/upgrade", use_auth=True)
        
        if success and isinstance(data, dict):
            if data.get("success") and data.get("isPremium"):
                features = data.get("features", {})
                feature_list = list(features.keys()) if isinstance(features, dict) else []
                self.log_test("Premium Upgrade Functionality", True, f"Premium upgrade successful. Features: {', '.join(feature_list)}")
            else:
                self.log_test("Premium Upgrade Functionality", False, "Premium upgrade response invalid", data)
        else:
            self.log_test("Premium Upgrade Functionality", False, f"Premium upgrade failed. Status: {status_code}", data)

    def test_monthly_report_generation(self):
        """Test monthly financial report generation"""
        if not self.auth_token:
            self.log_test("Monthly Report Generation", False, "No authentication token available")
            return
        
        success, data, status_code = self.make_request("GET", "/analytics/monthly-report", use_auth=True)
        
        if success and isinstance(data, dict):
            required_fields = ["success", "totalIncome", "totalExpenses", "netSavings", "healthScore"]
            if all(field in data for field in required_fields):
                health_score = data.get('healthScore', 'N/A')
                total_income = data.get('totalIncome', 0)
                total_expenses = data.get('totalExpenses', 0)
                net_savings = data.get('netSavings', 0)
                self.log_test("Monthly Report Generation", True, f"Monthly report generated. Health Score: {health_score}, Income: ₹{total_income}, Expenses: ₹{total_expenses}, Savings: ₹{net_savings}")
            else:
                missing_fields = [field for field in required_fields if field not in data]
                self.log_test("Monthly Report Generation", False, f"Missing required fields: {missing_fields}")
        else:
            self.log_test("Monthly Report Generation", False, f"Monthly report failed. Status: {status_code}", data)

    def test_ai_quick_insights(self):
        """Test AI quick insights for dashboard"""
        if not self.auth_token:
            self.log_test("AI Quick Insights", False, "No authentication token available")
            return
        
        success, data, status_code = self.make_request("GET", "/ai/quick-insights", use_auth=True)
        
        if success and isinstance(data, dict) and "insights" in data:
            insights = data["insights"]
            if isinstance(insights, list):
                insight_count = len(insights)
                if insight_count > 0:
                    sample_insight = insights[0][:50] + "..." if len(insights[0]) > 50 else insights[0]
                    self.log_test("AI Quick Insights", True, f"Retrieved {insight_count} insights. Sample: '{sample_insight}'")
                else:
                    self.log_test("AI Quick Insights", True, "No insights available (expected for new user)")
            else:
                self.log_test("AI Quick Insights", False, "Insights field is not a list")
        else:
            self.log_test("AI Quick Insights", False, f"Quick insights failed. Status: {status_code}", data)

    def test_ai_expense_analysis(self):
        """Test AI-powered expense analysis endpoint"""
        if not self.auth_token or not self.user_id:
            self.log_test("AI Expense Analysis", False, "No authentication token or user ID available")
            return
        
        analysis_data = {
            "user_id": self.user_id,
            "analysis_type": "spending_patterns",
            "time_period": "current_month"
        }
        
        success, data, status_code = self.make_request("POST", "/ai/analyze", analysis_data, use_auth=True)
        
        if success and isinstance(data, dict):
            required_fields = ["success", "analysis_type", "insights", "recommendations", "summary"]
            if all(field in data for field in required_fields):
                insights_count = len(data.get('insights', []))
                recommendations_count = len(data.get('recommendations', []))
                analysis_type = data.get('analysis_type', 'unknown')
                self.log_test("AI Expense Analysis", True, f"AI analysis completed. Type: {analysis_type}, Insights: {insights_count}, Recommendations: {recommendations_count}")
            else:
                missing_fields = [field for field in required_fields if field not in data]
                self.log_test("AI Expense Analysis", False, f"Missing required fields: {missing_fields}")
        else:
            self.log_test("AI Expense Analysis", False, f"AI analysis failed. Status: {status_code}", data)

    def test_ai_budget_suggestions(self):
        """Test AI budget suggestions analysis"""
        if not self.auth_token or not self.user_id:
            self.log_test("AI Budget Suggestions", False, "No authentication token or user ID available")
            return
        
        analysis_data = {
            "user_id": self.user_id,
            "analysis_type": "budget_suggestions",
            "time_period": "current_month"
        }
        
        success, data, status_code = self.make_request("POST", "/ai/analyze", analysis_data, use_auth=True)
        
        if success and isinstance(data, dict) and data.get("success"):
            insights_count = len(data.get('insights', []))
            recommendations_count = len(data.get('recommendations', []))
            self.log_test("AI Budget Suggestions", True, f"Budget suggestions generated. Insights: {insights_count}, Recommendations: {recommendations_count}")
        else:
            self.log_test("AI Budget Suggestions", False, f"Budget suggestions failed. Status: {status_code}", data)

    def test_ai_monthly_summary(self):
        """Test AI monthly summary analysis"""
        if not self.auth_token or not self.user_id:
            self.log_test("AI Monthly Summary", False, "No authentication token or user ID available")
            return
        
        analysis_data = {
            "user_id": self.user_id,
            "analysis_type": "monthly_summary",
            "time_period": "current_month"
        }
        
        success, data, status_code = self.make_request("POST", "/ai/analyze", analysis_data, use_auth=True)
        
        if success and isinstance(data, dict) and data.get("success"):
            summary = data.get('summary', 'No summary available')
            summary_preview = summary[:100] + "..." if len(summary) > 100 else summary
            self.log_test("AI Monthly Summary", True, f"Monthly summary generated: '{summary_preview}'")
        else:
            self.log_test("AI Monthly Summary", False, f"Monthly summary failed. Status: {status_code}", data)

    def test_payment_integration_with_premium(self):
        """Test payment order creation for premium subscription"""
        if not self.auth_token:
            self.log_test("Payment Integration (Premium)", False, "No authentication token available")
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
            notes = data.get("notes", {})
            plan_type = notes.get("plan_type", "unknown")
            self.log_test("Payment Integration (Premium)", True, f"Created Razorpay order: {order_id} for {currency} {amount} ({plan_type} plan)")
            return data
        else:
            self.log_test("Payment Integration (Premium)", False, f"Failed to create payment order. Status: {status_code}", data)
            return None

    def test_authentication_security(self):
        """Test authentication security features"""
        # Test invalid token rejection
        original_token = self.auth_token
        self.auth_token = "invalid_token_12345"
        
        success_invalid, data_invalid, status_invalid = self.make_request("GET", "/premium/status", use_auth=True)
        
        # Restore original token
        self.auth_token = original_token
        
        # Test valid token acceptance
        success_valid, data_valid, status_valid = self.make_request("GET", "/premium/status", use_auth=True)
        
        if status_invalid == 401 and status_valid == 200:
            self.log_test("Authentication Security", True, f"Invalid token rejected (401), valid token accepted (200)")
        else:
            self.log_test("Authentication Security", False, f"Security issue: Invalid token status: {status_invalid}, Valid token status: {status_valid}")

    def run_comprehensive_tests(self):
        """Run comprehensive Premium Features test suite"""
        print("🚀 Starting SpendWise Comprehensive Premium Features Test Suite")
        print("=" * 80)
        print("🎯 Testing: Authentication, AI Analysis, Premium Management, Monthly Reports, Payments")
        print("=" * 80)
        
        # Basic health check
        self.test_health_check()
        
        # Setup authentication
        if not self.setup_authentication():
            print("❌ Cannot continue tests without successful authentication")
            return
        
        # ===== PREMIUM FEATURES =====
        print("\n💎 TESTING PREMIUM FEATURES")
        print("-" * 50)
        
        self.test_premium_status_management()
        self.test_premium_upgrade()
        self.test_monthly_report_generation()
        
        # ===== AI ANALYSIS FEATURES =====
        print("\n🤖 TESTING AI ANALYSIS FEATURES")
        print("-" * 50)
        
        self.test_ai_quick_insights()
        self.test_ai_expense_analysis()
        self.test_ai_budget_suggestions()
        self.test_ai_monthly_summary()
        
        # ===== PAYMENT INTEGRATION =====
        print("\n💳 TESTING PAYMENT INTEGRATION")
        print("-" * 50)
        
        self.test_payment_integration_with_premium()
        
        # ===== SECURITY FEATURES =====
        print("\n🔒 TESTING SECURITY FEATURES")
        print("-" * 50)
        
        self.test_authentication_security()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print comprehensive test results summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE PREMIUM FEATURES TEST RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result['success'])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        # Categorize results
        auth_tests = [r for r in self.test_results if "Authentication" in r['test'] or "Security" in r['test']]
        premium_tests = [r for r in self.test_results if "Premium" in r['test'] or "Monthly Report" in r['test']]
        ai_tests = [r for r in self.test_results if "AI" in r['test']]
        payment_tests = [r for r in self.test_results if "Payment" in r['test']]
        health_tests = [r for r in self.test_results if "Health" in r['test']]
        
        print(f"\n📈 DETAILED CATEGORY BREAKDOWN:")
        print(f"🏥 Health Check: {sum(1 for r in health_tests if r['success'])}/{len(health_tests)} passed")
        print(f"🔐 Authentication & Security: {sum(1 for r in auth_tests if r['success'])}/{len(auth_tests)} passed")
        print(f"💎 Premium Features: {sum(1 for r in premium_tests if r['success'])}/{len(premium_tests)} passed")
        print(f"🤖 AI Analysis: {sum(1 for r in ai_tests if r['success'])}/{len(ai_tests)} passed")
        print(f"💳 Payment Integration: {sum(1 for r in payment_tests if r['success'])}/{len(payment_tests)} passed")
        
        # Show critical features status
        print(f"\n🎯 CRITICAL PREMIUM FEATURES STATUS:")
        critical_features = [
            ("JWT Authentication", any("Authentication Setup" in r['test'] and r['success'] for r in self.test_results)),
            ("Premium Status Management", any("Premium Status Management" in r['test'] and r['success'] for r in self.test_results)),
            ("AI Quick Insights", any("AI Quick Insights" in r['test'] and r['success'] for r in self.test_results)),
            ("Monthly Report Generation", any("Monthly Report Generation" in r['test'] and r['success'] for r in self.test_results)),
            ("Payment Integration", any("Payment Integration" in r['test'] and r['success'] for r in self.test_results))
        ]
        
        for feature, status in critical_features:
            status_icon = "✅" if status else "❌"
            print(f"   {status_icon} {feature}")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = ComprehensivePremiumTester()
    tester.run_comprehensive_tests()
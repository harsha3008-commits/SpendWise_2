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
BASE_URL = "https://secure-wallet-3.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class SpendWiseAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.test_results = []
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

    def make_request(self, method: str, endpoint: str, data: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=self.headers, json=data, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=self.headers, timeout=10)
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
        
        success, data, status_code = self.make_request("POST", "/categories", category_data)
        
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
        success, data, status_code = self.make_request("GET", "/categories")
        
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
        
        success, data, status_code = self.make_request("POST", "/transactions", transaction_data)
        
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
        success, data, status_code = self.make_request("GET", "/transactions")
        
        if success and isinstance(data, list):
            self.log_test("Get Transactions", True, f"Retrieved {len(data)} transactions")
            return data
        else:
            self.log_test("Get Transactions", False, f"Failed to get transactions. Status: {status_code}", data)
            return []

    def test_get_single_transaction(self, transaction_id: str):
        """Test getting a single transaction by ID"""
        success, data, status_code = self.make_request("GET", f"/transactions/{transaction_id}")
        
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
        
        success, data, status_code = self.make_request("PUT", f"/transactions/{transaction_id}", update_data)
        
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
        success, data, status_code = self.make_request("GET", "/ledger/verify")
        
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
        
        success, data, status_code = self.make_request("POST", "/budgets", budget_data)
        
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
        success, data, status_code = self.make_request("GET", "/budgets")
        
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
        
        success, data, status_code = self.make_request("POST", "/bills", bill_data)
        
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
        success, data, status_code = self.make_request("GET", "/bills")
        
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
        
        success, data, status_code = self.make_request("POST", "/payments/create-order", order_data)
        
        if success and isinstance(data, dict) and "id" in data:
            self.log_test("Create Payment Order", True, f"Created Razorpay order: {data['id']}")
            return data
        else:
            self.log_test("Create Payment Order", False, f"Failed to create payment order. Status: {status_code}", data)
            return None

    def test_analytics_summary(self):
        """Test analytics summary endpoint"""
        success, data, status_code = self.make_request("GET", "/analytics/summary")
        
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
        success, data, status_code = self.make_request("DELETE", f"/transactions/{transaction_id}")
        
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
        """Run the complete test suite"""
        print("🚀 Starting SpendWise Backend API Test Suite")
        print("=" * 60)
        
        # Basic health check
        self.test_health_check()
        
        # Create test category first (needed for other tests)
        category_id = self.test_create_category()
        if not category_id:
            print("❌ Cannot continue tests without a valid category")
            return
        
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
        
        # Test payment operations
        payment_order = self.test_create_payment_order()
        
        # Test analytics
        self.test_analytics_summary()
        
        # Test error handling
        self.test_error_cases()
        
        # Clean up - delete created transaction
        if first_tx_id:
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
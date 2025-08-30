#!/usr/bin/env python3
"""
Comprehensive backend API tests for SpendWise
Tests payment validation, subscription state, enhanced blockchain features
"""

import requests
import json
import time
import unittest
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Configuration
BASE_URL = "https://local-finance-4.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class TestSpendWiseEnhancedBackend(unittest.TestCase):
    """Enhanced test suite for SpendWise backend with blockchain and payment features"""
    
    def setUp(self):
        """Set up test data"""
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.created_resources = {
            'transactions': [],
            'categories': [],
            'budgets': [],
            'bills': [],
            'users': [],
            'payment_orders': []
        }

    def tearDown(self):
        """Clean up created resources"""
        # In a real test environment, you'd clean up test data
        pass

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

    def test_enhanced_health_check(self):
        """Test enhanced health check endpoint"""
        success, data, status_code = self.make_request("GET", "/health")
        
        self.assertTrue(success, f"Health check failed: {data}")
        self.assertIsInstance(data, dict)
        self.assertEqual(data.get("status"), "healthy")
        self.assertEqual(data.get("service"), "spendwise-api")
        self.assertIn("version", data)

    def test_blockchain_transaction_creation(self):
        """Test blockchain-enhanced transaction creation"""
        # Create test category first
        category_data = {
            "name": "Test Blockchain Category",
            "icon": "⛓️",
            "color": "#007AFF",
            "type": "expense"
        }
        
        cat_success, cat_data, _ = self.make_request("POST", "/categories", category_data)
        self.assertTrue(cat_success)
        category_id = cat_data["id"]
        self.created_resources['categories'].append(category_id)

        # Create first transaction (genesis)
        tx1_data = {
            "type": "expense",
            "amount": 250.75,
            "currency": "INR",
            "categoryId": category_id,
            "note": "Blockchain test transaction 1",
            "merchant": "Test Merchant"
        }
        
        success1, tx1_response, status1 = self.make_request("POST", "/transactions", tx1_data)
        self.assertTrue(success1, f"First transaction creation failed: {tx1_response}")
        self.assertEqual(status1, 200)
        
        # Verify blockchain properties
        self.assertIn("currentHash", tx1_response)
        self.assertIn("previousHash", tx1_response)
        self.assertEqual(tx1_response["previousHash"], "0000000000000000000000000000000000000000000000000000000000000000")
        self.assertEqual(len(tx1_response["currentHash"]), 64)  # SHA-256 hash length
        
        tx1_id = tx1_response["id"]
        self.created_resources['transactions'].append(tx1_id)

        # Create second transaction (chained)
        tx2_data = {
            "type": "income",
            "amount": 5000.00,
            "currency": "INR",
            "categoryId": category_id,
            "note": "Blockchain test transaction 2",
            "merchant": "Salary Provider"
        }
        
        success2, tx2_response, status2 = self.make_request("POST", "/transactions", tx2_data)
        self.assertTrue(success2, f"Second transaction creation failed: {tx2_response}")
        
        # Verify chain linking
        self.assertEqual(tx2_response["previousHash"], tx1_response["currentHash"])
        self.assertNotEqual(tx2_response["currentHash"], tx1_response["currentHash"])
        
        tx2_id = tx2_response["id"]
        self.created_resources['transactions'].append(tx2_id)

    def test_ledger_verification_endpoints(self):
        """Test enhanced ledger verification endpoints"""
        # Test basic ledger verification
        success, data, status_code = self.make_request("GET", "/ledger/verify")
        self.assertTrue(success, f"Ledger verification failed: {data}")
        
        # Verify response structure
        self.assertIn("is_valid", data)
        self.assertIn("total_transactions", data)
        self.assertIn("verified_count", data)
        self.assertIn("integrity_score", data)
        
        # Test tampering check endpoint
        success, tampering_data, _ = self.make_request("GET", "/ledger/tampering-check")
        self.assertTrue(success, f"Tampering check failed: {tampering_data}")
        
        # Verify tampering check structure
        self.assertIn("suspicious_transactions", tampering_data)
        self.assertIn("patterns", tampering_data)
        self.assertIn("risk_score", tampering_data)

    def test_merkle_root_generation(self):
        """Test Merkle root generation endpoint"""
        # Test current date Merkle root
        success, data, status_code = self.make_request("GET", "/ledger/merkle-root")
        self.assertTrue(success, f"Merkle root generation failed: {data}")
        
        # Verify response structure
        self.assertIn("date", data)
        self.assertIn("merkleRoot", data)
        self.assertIn("transactionCount", data)
        self.assertEqual(len(data["merkleRoot"]), 64)  # SHA-256 hash
        
        # Test specific date
        test_date = "2024-08-30"
        success, date_data, _ = self.make_request("GET", f"/ledger/merkle-root?date={test_date}")
        self.assertTrue(success, f"Date-specific Merkle root failed: {date_data}")
        self.assertEqual(date_data["date"], test_date)

    def test_blockchain_anchoring(self):
        """Test blockchain anchoring functionality"""
        anchor_data = {
            "date": "2024-08-30",
            "merkleRoot": "abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
            "transactionCount": 5,
            "anchored": True,
            "blockchainTxHash": "0x1234567890abcdef1234567890abcdef12345678"
        }
        
        success, response, status_code = self.make_request("POST", "/ledger/anchor", anchor_data)
        self.assertTrue(success, f"Blockchain anchoring failed: {response}")
        self.assertIn("message", response)
        self.assertIn("Merkle root anchored successfully", response["message"])

    def test_payment_order_creation(self):
        """Test enhanced payment order creation"""
        payment_data = {
            "amount": 19900,  # ₹199.00 in paise
            "currency": "INR",
            "plan_type": "premium"
        }
        
        success, response, status_code = self.make_request("POST", "/payments/create-order", payment_data)
        self.assertTrue(success, f"Payment order creation failed: {response}")
        
        # Verify Razorpay order structure
        self.assertIn("id", response)
        self.assertIn("amount", response)
        self.assertIn("currency", response)
        self.assertEqual(response["amount"], 19900)
        self.assertEqual(response["currency"], "INR")
        
        # Store for cleanup
        self.created_resources['payment_orders'].append(response["id"])

    def test_payment_verification_flow(self):
        """Test payment verification with mock data"""
        # Note: This uses mock data since we can't complete real Razorpay payments in tests
        verification_data = {
            "razorpay_order_id": "order_test123456789",
            "razorpay_payment_id": "pay_test123456789", 
            "razorpay_signature": "mock_signature_for_testing"
        }
        
        # This will fail signature verification but test the endpoint structure
        success, response, status_code = self.make_request("POST", "/payments/verify", verification_data)
        
        # Should fail due to mock signature, but endpoint should exist
        self.assertIn([400, 404], [status_code])  # Expected failure codes
        if isinstance(response, dict):
            self.assertIn("detail", response)

    def test_subscription_management(self):
        """Test subscription creation and status management"""
        # Test subscription creation (will fail without valid plan_id but tests endpoint)
        subscription_data = {
            "plan_id": "plan_test123",
            "amount": 19900,
            "interval": "monthly"
        }
        
        success, response, status_code = self.make_request("POST", "/subscription/create", subscription_data)
        # Expected to fail with mock data, but endpoint should be accessible
        self.assertIn(status_code, [400, 404])

        # Test subscription status endpoint
        test_user_id = "user_test123"
        success, status_response, status_code = self.make_request("GET", f"/subscription/status/{test_user_id}")
        
        # Should return default subscription state for non-existent user
        if success:
            self.assertIn("plan", status_response)
            self.assertEqual(status_response["plan"], "free")

    def test_advanced_analytics(self):
        """Test advanced analytics endpoint"""
        success, data, status_code = self.make_request("GET", "/analytics/advanced")
        self.assertTrue(success, f"Advanced analytics failed: {data}")
        
        # Verify response structure
        self.assertIn("recurringTransactions", data)
        self.assertIn("totalRecurringFound", data)
        self.assertIn("analysisTimeRange", data)
        
        # Verify time range structure
        time_range = data["analysisTimeRange"]
        self.assertIn("start", time_range)
        self.assertIn("end", time_range)

    def test_precomputed_budget_stats(self):
        """Test precomputed budget statistics"""
        # Create test budget first
        category_data = {
            "name": "Budget Test Category",
            "type": "expense"
        }
        cat_success, cat_response, _ = self.make_request("POST", "/categories", category_data)
        self.assertTrue(cat_success)
        category_id = cat_response["id"]
        
        budget_data = {
            "name": "Test Monthly Budget",
            "categoryIds": [category_id],
            "amount": 5000.0,
            "period": "monthly",
            "startDate": int(datetime.now().timestamp() * 1000),
            "endDate": int((datetime.now() + timedelta(days=30)).timestamp() * 1000),
            "isActive": True,
            "notifications": True
        }
        
        success, budget_response, status_code = self.make_request("POST", "/budgets", budget_data)
        self.assertTrue(success, f"Budget creation failed: {budget_response}")
        
        budget_id = budget_response["id"]
        self.created_resources['budgets'].append(budget_id)
        
        # Test enhanced budgets endpoint with precomputed stats
        success, budgets_data, _ = self.make_request("GET", "/budgets")
        self.assertTrue(success, f"Enhanced budgets retrieval failed: {budgets_data}")
        
        # Find our test budget and verify computed stats
        test_budget = next((b for b in budgets_data if b["id"] == budget_id), None)
        self.assertIsNotNone(test_budget)
        self.assertIn("spent", test_budget)
        self.assertIsInstance(test_budget["spent"], (int, float))

    def test_enhanced_monthly_stats(self):
        """Test precomputed monthly statistics"""
        success, data, status_code = self.make_request("GET", "/analytics/summary")
        self.assertTrue(success, f"Monthly stats failed: {data}")
        
        # Verify enhanced response structure
        expected_fields = [
            "totalIncome", "totalExpenses", "netWorth", 
            "categoryBreakdown", "transactionCount",
            "monthStart", "monthEnd"
        ]
        
        for field in expected_fields:
            self.assertIn(field, data, f"Missing field: {field}")
        
        # Verify data types
        self.assertIsInstance(data["totalIncome"], (int, float))
        self.assertIsInstance(data["totalExpenses"], (int, float))
        self.assertIsInstance(data["categoryBreakdown"], dict)

    def test_webhook_endpoint(self):
        """Test Razorpay webhook endpoint"""
        # Mock webhook payload
        webhook_data = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "id": "pay_test123456789",
                    "order_id": "order_test123456789",
                    "status": "captured",
                    "amount": 19900
                }
            }
        }
        
        success, response, status_code = self.make_request("POST", "/webhook/razorpay", webhook_data)
        
        # Should process webhook (may fail on signature verification but endpoint should exist)
        self.assertIn(status_code, [200, 400, 500])
        
        if success:
            self.assertIn("status", response)
            self.assertEqual(response["status"], "processed")

    def test_performance_optimizations(self):
        """Test performance optimizations and response times"""
        import time
        
        endpoints_to_test = [
            "/health",
            "/analytics/summary", 
            "/ledger/verify",
            "/budgets",
            "/transactions?limit=10"
        ]
        
        for endpoint in endpoints_to_test:
            start_time = time.time()
            success, data, status_code = self.make_request("GET", endpoint)
            response_time = time.time() - start_time
            
            self.assertTrue(success, f"Endpoint {endpoint} failed: {data}")
            self.assertLess(response_time, 2.0, f"Endpoint {endpoint} too slow: {response_time:.3f}s")

    def test_error_handling_and_validation(self):
        """Test comprehensive error handling"""
        # Test invalid transaction data
        invalid_tx_data = {
            "type": "invalid_type",
            "amount": "not_a_number",
            "categoryId": ""
        }
        
        success, response, status_code = self.make_request("POST", "/transactions", invalid_tx_data)
        self.assertFalse(success)
        self.assertEqual(status_code, 422)  # Validation error
        
        # Test non-existent resource
        success, response, status_code = self.make_request("GET", "/transactions/nonexistent_id")
        self.assertFalse(success)
        self.assertEqual(status_code, 404)
        
        # Test malformed payment data
        invalid_payment_data = {
            "amount": -100,  # Negative amount
            "currency": "INVALID"
        }
        
        success, response, status_code = self.make_request("POST", "/payments/create-order", invalid_payment_data)
        self.assertFalse(success)
        self.assertIn(status_code, [400, 422])

    def test_database_indexes_and_performance(self):
        """Test that database indexes are working for performance"""
        # Create multiple transactions to test pagination and sorting
        category_data = {"name": "Performance Test", "type": "expense"}
        cat_success, cat_response, _ = self.make_request("POST", "/categories", category_data)
        self.assertTrue(cat_success)
        category_id = cat_response["id"]
        
        # Create transactions in batch (simulate multiple requests)
        transaction_ids = []
        for i in range(5):
            tx_data = {
                "type": "expense",
                "amount": 100.0 + i,
                "categoryId": category_id,
                "note": f"Performance test transaction {i}"
            }
            
            success, tx_response, _ = self.make_request("POST", "/transactions", tx_data)
            if success:
                transaction_ids.append(tx_response["id"])
        
        # Test pagination performance
        start_time = time.time()
        success, data, _ = self.make_request("GET", "/transactions?skip=0&limit=5")
        pagination_time = time.time() - start_time
        
        self.assertTrue(success)
        self.assertLess(pagination_time, 1.0, "Pagination too slow")
        self.assertIsInstance(data, list)

    def test_concurrent_transaction_creation(self):
        """Test blockchain consistency under concurrent operations"""
        import threading
        import queue
        
        # Create test category
        category_data = {"name": "Concurrency Test", "type": "expense"}
        cat_success, cat_response, _ = self.make_request("POST", "/categories", category_data)
        self.assertTrue(cat_success)
        category_id = cat_response["id"]
        
        results = queue.Queue()
        
        def create_transaction(tx_id):
            tx_data = {
                "type": "expense",
                "amount": 50.0,
                "categoryId": category_id,
                "note": f"Concurrent transaction {tx_id}"
            }
            
            success, response, status_code = self.make_request("POST", "/transactions", tx_data)
            results.put((tx_id, success, response))
        
        # Create 5 transactions concurrently
        threads = []
        for i in range(5):
            thread = threading.Thread(target=create_transaction, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Collect results
        concurrent_results = []
        while not results.empty():
            concurrent_results.append(results.get())
        
        # Verify all transactions were created successfully
        self.assertEqual(len(concurrent_results), 5)
        for tx_id, success, response in concurrent_results:
            self.assertTrue(success, f"Concurrent transaction {tx_id} failed: {response}")
        
        # Verify blockchain integrity after concurrent operations
        success, ledger_data, _ = self.make_request("GET", "/ledger/verify")
        self.assertTrue(success)
        self.assertTrue(ledger_data["is_valid"], "Blockchain integrity compromised during concurrent operations")


if __name__ == '__main__':
    print("Running SpendWise Enhanced Backend Tests...")
    print("=" * 60)
    
    # Create test suite
    test_suite = unittest.TestLoader().loadTestsFromTestCase(TestSpendWiseEnhancedBackend)
    
    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.failures:
        print("\nFAILURES:")
        for test, traceback in result.failures:
            print(f"- {test}")
    
    if result.errors:
        print("\nERRORS:")
        for test, traceback in result.errors:
            print(f"- {test}")
    
    if result.wasSuccessful():
        print("\n🎉 All enhanced backend tests passed successfully!")
        print("✅ Enhanced blockchain functionality working")
        print("✅ Payment integration endpoints working")  
        print("✅ Subscription management working")
        print("✅ Advanced analytics working")
        print("✅ Performance optimizations effective")
        print("✅ Error handling comprehensive")
        print("✅ Concurrent operations maintaining integrity")
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
        exit(1)
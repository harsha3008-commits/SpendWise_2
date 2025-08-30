#!/usr/bin/env python3
"""
Comprehensive blockchain functionality tests for SpendWise
Tests hash computation, chain integrity, tampering detection, and Merkle trees
"""

import unittest
import json
from datetime import datetime, timedelta
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from utils.blockchain_utils import (
    SpendWiseBlockchain,
    compute_transaction_hash,
    verify_transaction_chain,
    create_new_transaction,
    get_daily_merkle_root,
    detect_chain_tampering
)


class TestSpendWiseBlockchain(unittest.TestCase):
    """Test suite for SpendWise blockchain functionality"""

    def setUp(self):
        """Set up test data"""
        self.blockchain = SpendWiseBlockchain()
        
        # Sample transaction data
        self.sample_tx1 = {
            "id": "tx_001",
            "type": "expense",
            "amount": 100.50,
            "currency": "INR",
            "categoryId": "cat_food",
            "timestamp": int(datetime.now().timestamp() * 1000),
            "note": "Grocery shopping"
        }
        
        self.sample_tx2 = {
            "id": "tx_002",
            "type": "income",
            "amount": 5000.00,
            "currency": "INR",
            "categoryId": "cat_salary",
            "timestamp": int((datetime.now() + timedelta(hours=1)).timestamp() * 1000),
            "note": "Monthly salary"
        }

    def test_hash_computation(self):
        """Test transaction hash computation"""
        # Create a complete transaction
        tx = create_new_transaction(self.sample_tx1.copy())
        
        # Verify hash exists and is 64 characters (SHA-256)
        self.assertIsNotNone(tx.get("currentHash"))
        self.assertEqual(len(tx["currentHash"]), 64)
        
        # Verify hash is deterministic
        tx2 = tx.copy()
        hash1 = self.blockchain.compute_hash(tx)
        hash2 = self.blockchain.compute_hash(tx2)
        self.assertEqual(hash1, hash2)
        
        # Verify hash changes when data changes
        tx2["amount"] = 200.00
        hash3 = self.blockchain.compute_hash(tx2)
        self.assertNotEqual(hash1, hash3)

    def test_genesis_transaction(self):
        """Test genesis transaction creation"""
        genesis_tx = self.blockchain.create_genesis_transaction(self.sample_tx1.copy())
        
        # Genesis should have previousHash = genesis hash
        self.assertEqual(genesis_tx["previousHash"], self.blockchain.GENESIS_HASH)
        self.assertIsNotNone(genesis_tx["currentHash"])
        
        # Verify hash is computed correctly
        expected_hash = self.blockchain.compute_hash(genesis_tx)
        self.assertEqual(genesis_tx["currentHash"], expected_hash)

    def test_chain_linking(self):
        """Test proper chain linking between transactions"""
        # Create genesis transaction
        genesis_tx = create_new_transaction(self.sample_tx1.copy())
        
        # Create second transaction
        second_tx = create_new_transaction(self.sample_tx2.copy(), genesis_tx)
        
        # Verify chain linking
        self.assertEqual(second_tx["previousHash"], genesis_tx["currentHash"])
        self.assertNotEqual(second_tx["currentHash"], genesis_tx["currentHash"])

    def test_chain_integrity_verification(self):
        """Test complete chain integrity verification"""
        # Create a chain of 3 transactions
        tx1 = create_new_transaction(self.sample_tx1.copy())
        tx2 = create_new_transaction(self.sample_tx2.copy(), tx1)
        
        tx3_data = {
            "id": "tx_003",
            "type": "expense",
            "amount": 50.00,
            "currency": "INR",
            "categoryId": "cat_transport",
            "timestamp": int((datetime.now() + timedelta(hours=2)).timestamp() * 1000),
            "note": "Bus fare"
        }
        tx3 = create_new_transaction(tx3_data, tx2)
        
        transactions = [tx1, tx2, tx3]
        
        # Verify chain integrity
        result = verify_transaction_chain(transactions)
        
        self.assertTrue(result["is_valid"])
        self.assertEqual(result["total_transactions"], 3)
        self.assertEqual(result["verified_count"], 3)
        self.assertEqual(result["integrity_score"], 100.0)
        self.assertIsNone(result["failed_at_index"])

    def test_tampered_chain_detection(self):
        """Test detection of tampered transactions"""
        # Create a valid chain
        tx1 = create_new_transaction(self.sample_tx1.copy())
        tx2 = create_new_transaction(self.sample_tx2.copy(), tx1)
        
        # Tamper with first transaction
        tx1_tampered = tx1.copy()
        tx1_tampered["amount"] = 999.99  # Change amount without updating hash
        
        transactions = [tx1_tampered, tx2]
        
        # Verify chain detects tampering
        result = verify_transaction_chain(transactions)
        
        self.assertFalse(result["is_valid"])
        self.assertEqual(result["failed_at_index"], 0)
        self.assertEqual(result["failed_transaction_id"], "tx_001")
        self.assertLess(result["integrity_score"], 100.0)

    def test_broken_chain_detection(self):
        """Test detection of broken chain links"""
        # Create transactions with broken links
        tx1 = create_new_transaction(self.sample_tx1.copy())
        tx2 = create_new_transaction(self.sample_tx2.copy(), tx1)
        
        # Break the chain by changing previousHash
        tx2_broken = tx2.copy()
        tx2_broken["previousHash"] = "fake_hash_123"
        tx2_broken["currentHash"] = self.blockchain.compute_hash(tx2_broken)
        
        transactions = [tx1, tx2_broken]
        
        # Verify broken chain detection
        result = verify_transaction_chain(transactions)
        
        self.assertFalse(result["is_valid"])
        self.assertEqual(result["failed_at_index"], 1)
        self.assertIn("Broken chain link", result["errors"][0]["error"])

    def test_transaction_rechaining(self):
        """Test re-chaining transactions after modification"""
        # Create original chain
        tx1 = create_new_transaction(self.sample_tx1.copy())
        tx2 = create_new_transaction(self.sample_tx2.copy(), tx1)
        tx3_data = {
            "id": "tx_003",
            "type": "expense",
            "amount": 75.00,
            "currency": "INR",
            "categoryId": "cat_food",
            "timestamp": int((datetime.now() + timedelta(hours=2)).timestamp() * 1000)
        }
        tx3 = create_new_transaction(tx3_data, tx2)
        
        original_chain = [tx1, tx2, tx3]
        
        # Verify original chain is valid
        result = verify_transaction_chain(original_chain)
        self.assertTrue(result["is_valid"])
        
        # Modify middle transaction
        tx2["amount"] = 6000.00
        
        # Re-chain from index 1
        rechained = self.blockchain.rechain_transactions(original_chain, 1)
        
        # Verify re-chained transactions
        result = verify_transaction_chain(rechained)
        self.assertTrue(result["is_valid"])
        
        # Verify that tx3's previousHash now matches tx2's new currentHash
        tx2_rechained = next(tx for tx in rechained if tx["id"] == "tx_002")
        tx3_rechained = next(tx for tx in rechained if tx["id"] == "tx_003")
        self.assertEqual(tx3_rechained["previousHash"], tx2_rechained["currentHash"])

    def test_merkle_tree_generation(self):
        """Test Merkle tree generation and root computation"""
        # Create test transactions
        tx1 = create_new_transaction(self.sample_tx1.copy())
        tx2 = create_new_transaction(self.sample_tx2.copy(), tx1)
        
        transactions = [tx1, tx2]
        
        # Generate Merkle tree
        merkle_data = self.blockchain.generate_merkle_tree(transactions)
        
        self.assertIsNotNone(merkle_data["root"])
        self.assertEqual(len(merkle_data["root"]), 64)  # SHA-256 hash
        self.assertEqual(merkle_data["transaction_count"], 2)
        self.assertIsInstance(merkle_data["tree"], list)
        
        # Test empty transactions
        empty_merkle = self.blockchain.generate_merkle_tree([])
        self.assertIsNotNone(empty_merkle["root"])
        self.assertEqual(empty_merkle["transaction_count"], 0)

    def test_daily_merkle_root(self):
        """Test daily Merkle root generation"""
        # Create transactions for today
        today = datetime.now()
        
        tx_today1 = self.sample_tx1.copy()
        tx_today1["timestamp"] = int(today.timestamp() * 1000)
        tx_today1 = create_new_transaction(tx_today1)
        
        tx_today2 = self.sample_tx2.copy()
        tx_today2["timestamp"] = int(today.timestamp() * 1000)
        tx_today2 = create_new_transaction(tx_today2, tx_today1)
        
        # Create transaction for yesterday
        yesterday = today - timedelta(days=1)
        tx_yesterday = self.sample_tx1.copy()
        tx_yesterday["id"] = "tx_yesterday"
        tx_yesterday["timestamp"] = int(yesterday.timestamp() * 1000)
        tx_yesterday = create_new_transaction(tx_yesterday)
        
        all_transactions = [tx_today1, tx_today2, tx_yesterday]
        
        # Get daily Merkle root for today
        daily_root = get_daily_merkle_root(all_transactions, today)
        
        self.assertIsNotNone(daily_root)
        self.assertEqual(len(daily_root), 64)
        
        # Verify it only includes today's transactions
        today_only_root = self.blockchain.get_daily_merkle_root([tx_today1, tx_today2], today)
        self.assertEqual(daily_root, today_only_root)

    def test_tampering_pattern_detection(self):
        """Test advanced tampering pattern detection"""
        # Create transactions with suspicious patterns
        current_time = int(datetime.now().timestamp() * 1000)
        
        # Future timestamp
        future_tx = self.sample_tx1.copy()
        future_tx["id"] = "future_tx"
        future_tx["timestamp"] = current_time + 86400000  # 1 day in future
        future_tx = create_new_transaction(future_tx)
        
        # Negative amount
        negative_tx = self.sample_tx2.copy()
        negative_tx["id"] = "negative_tx"
        negative_tx["amount"] = -100.00
        negative_tx = create_new_transaction(negative_tx, future_tx)
        
        # Extremely large amount
        large_tx = self.sample_tx1.copy()
        large_tx["id"] = "large_tx"
        large_tx["amount"] = 15000000.00  # 1.5 crore
        large_tx = create_new_transaction(large_tx, negative_tx)
        
        suspicious_transactions = [future_tx, negative_tx, large_tx]
        
        # Detect tampering patterns
        tampering_result = detect_chain_tampering(suspicious_transactions)
        
        self.assertGreater(len(tampering_result["suspicious_transactions"]), 0)
        self.assertGreater(len(tampering_result["patterns"]), 0)
        self.assertGreater(tampering_result["risk_score"], 0)
        
        # Check specific patterns
        patterns = tampering_result["patterns"]
        self.assertTrue(any("Future timestamp" in pattern for pattern in patterns))
        self.assertTrue(any("Negative amount" in pattern for pattern in patterns))
        self.assertTrue(any("large amount" in pattern for pattern in patterns))

    def test_duplicate_transaction_detection(self):
        """Test detection of duplicate transaction IDs"""
        # Create transactions with duplicate IDs
        tx1 = create_new_transaction(self.sample_tx1.copy())
        tx2 = self.sample_tx2.copy()
        tx2["id"] = tx1["id"]  # Duplicate ID
        tx2 = create_new_transaction(tx2, tx1)
        
        duplicate_transactions = [tx1, tx2]
        
        # Detect duplicates
        tampering_result = detect_chain_tampering(duplicate_transactions)
        
        self.assertIn(tx1["id"], tampering_result["suspicious_transactions"])
        self.assertTrue(any("Duplicate transaction ID" in pattern for pattern in tampering_result["patterns"]))

    def test_performance_with_large_dataset(self):
        """Test blockchain performance with large number of transactions"""
        import time
        
        # Create a large number of transactions
        transactions = []
        prev_tx = None
        
        start_time = time.time()
        
        for i in range(100):  # 100 transactions
            tx_data = {
                "id": f"tx_{i:03d}",
                "type": "expense" if i % 2 == 0 else "income",
                "amount": 100.0 + (i * 10),
                "currency": "INR",
                "categoryId": "cat_test",
                "timestamp": int((datetime.now() + timedelta(seconds=i)).timestamp() * 1000),
                "note": f"Test transaction {i}"
            }
            
            if prev_tx:
                tx = create_new_transaction(tx_data, prev_tx)
            else:
                tx = create_new_transaction(tx_data)
            
            transactions.append(tx)
            prev_tx = tx
        
        creation_time = time.time() - start_time
        
        # Test verification performance
        start_time = time.time()
        result = verify_transaction_chain(transactions)
        verification_time = time.time() - start_time
        
        # Test Merkle tree generation performance
        start_time = time.time()
        merkle_data = self.blockchain.generate_merkle_tree(transactions)
        merkle_time = time.time() - start_time
        
        # Assertions
        self.assertTrue(result["is_valid"])
        self.assertEqual(result["verified_count"], 100)
        
        # Performance assertions (should complete reasonably fast)
        self.assertLess(creation_time, 5.0)      # < 5 seconds to create 100 transactions
        self.assertLess(verification_time, 2.0)   # < 2 seconds to verify chain
        self.assertLess(merkle_time, 1.0)        # < 1 second to generate Merkle tree
        
        print(f"\nPerformance Results (100 transactions):")
        print(f"Creation time: {creation_time:.3f}s")
        print(f"Verification time: {verification_time:.3f}s")
        print(f"Merkle generation time: {merkle_time:.3f}s")

    def test_edge_cases(self):
        """Test edge cases and error handling"""
        # Empty transaction list
        result = verify_transaction_chain([])
        self.assertTrue(result["is_valid"])
        self.assertEqual(result["total_transactions"], 0)
        
        # Single transaction
        single_tx = create_new_transaction(self.sample_tx1.copy())
        result = verify_transaction_chain([single_tx])
        self.assertTrue(result["is_valid"])
        self.assertEqual(result["verified_count"], 1)
        
        # Transaction with missing fields
        incomplete_tx = {"id": "incomplete", "amount": 100}
        
        try:
            hash_result = self.blockchain.compute_hash(incomplete_tx)
            # Should not raise exception but will produce a hash
            self.assertIsNotNone(hash_result)
        except Exception as e:
            self.fail(f"Hash computation should handle missing fields gracefully: {e}")

    def test_blockchain_summary_generation(self):
        """Test comprehensive blockchain summary generation"""
        # Create test chain
        tx1 = create_new_transaction(self.sample_tx1.copy())
        tx2 = create_new_transaction(self.sample_tx2.copy(), tx1)
        transactions = [tx1, tx2]
        
        # Generate summary
        summary = self.blockchain.generate_blockchain_summary(transactions)
        
        # Verify summary structure
        self.assertIn("blockchain_stats", summary)
        self.assertIn("integrity", summary)
        self.assertIn("security", summary)
        self.assertIn("performance", summary)
        
        # Verify blockchain stats
        stats = summary["blockchain_stats"]
        self.assertEqual(stats["total_transactions"], 2)
        self.assertIsNotNone(stats["merkle_root"])
        self.assertEqual(stats["genesis_hash"], self.blockchain.GENESIS_HASH)
        
        # Verify integrity results
        integrity = summary["integrity"]
        self.assertTrue(integrity["is_valid"])
        self.assertEqual(integrity["verified_count"], 2)


if __name__ == '__main__':
    # Run tests
    print("Running SpendWise Blockchain Tests...")
    print("=" * 50)
    
    # Create test suite
    test_suite = unittest.TestLoader().loadTestsFromTestCase(TestSpendWiseBlockchain)
    
    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.failures:
        print("\nFAILURES:")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback}")
    
    if result.errors:
        print("\nERRORS:")
        for test, traceback in result.errors:
            print(f"- {test}: {traceback}")
    
    if result.wasSuccessful():
        print("\n🎉 All blockchain tests passed successfully!")
        print("✅ Hash computation working correctly")
        print("✅ Chain integrity verification working")
        print("✅ Tampering detection working")
        print("✅ Merkle tree generation working")
        print("✅ Performance within acceptable limits")
    else:
        print("\n❌ Some tests failed. Please check the output above.")
        exit(1)
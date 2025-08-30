#!/usr/bin/env python3
"""
Focused test for SpendWise blockchain functionality
"""

import requests
import json
import hashlib
from datetime import datetime

BASE_URL = "https://secure-wallet-3.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def compute_expected_hash(tx_data):
    """Compute expected hash using backend logic"""
    bill_due_at = tx_data.get('billDueAt') or ''
    hash_input = f"{tx_data['id']}|{tx_data['amount']}|{tx_data['currency']}|{tx_data['categoryId']}|{tx_data['timestamp']}|{bill_due_at}|{tx_data['previousHash']}"
    return hashlib.sha256(hash_input.encode()).hexdigest()

def test_blockchain_functionality():
    print("🔗 Testing SpendWise Blockchain Functionality")
    print("=" * 50)
    
    # First, create a category
    category_data = {
        "name": "Test Category",
        "type": "expense"
    }
    
    response = requests.post(f"{BASE_URL}/categories", headers=HEADERS, json=category_data)
    if response.status_code != 200:
        print("❌ Failed to create test category")
        return
    
    category_id = response.json()["id"]
    print(f"✅ Created test category: {category_id}")
    
    # Clear existing transactions for clean test
    response = requests.get(f"{BASE_URL}/transactions")
    if response.status_code == 200:
        existing_txs = response.json()
        for tx in existing_txs:
            requests.delete(f"{BASE_URL}/transactions/{tx['id']}")
        print(f"🧹 Cleared {len(existing_txs)} existing transactions")
    
    # Test 1: Create first transaction (genesis)
    print("\n📝 Test 1: Creating Genesis Transaction")
    tx1_data = {
        "type": "expense",
        "amount": 100.0,
        "currency": "INR",
        "categoryId": category_id,
        "note": "First transaction"
    }
    
    response = requests.post(f"{BASE_URL}/transactions", headers=HEADERS, json=tx1_data)
    if response.status_code != 200:
        print(f"❌ Failed to create first transaction: {response.text}")
        return
    
    tx1 = response.json()
    print(f"✅ Created transaction: {tx1['id']}")
    
    # Verify genesis transaction
    if tx1['previousHash'] == "0":
        print("✅ Genesis transaction has correct previousHash: '0'")
    else:
        print(f"❌ Genesis transaction has wrong previousHash: '{tx1['previousHash']}'")
    
    # Verify hash computation
    expected_hash = compute_expected_hash(tx1)
    if tx1['currentHash'] == expected_hash:
        print("✅ Genesis transaction hash computed correctly")
    else:
        print(f"❌ Genesis transaction hash mismatch")
        print(f"   Expected: {expected_hash}")
        print(f"   Got: {tx1['currentHash']}")
    
    # Test 2: Create second transaction (chained)
    print("\n📝 Test 2: Creating Chained Transaction")
    tx2_data = {
        "type": "income",
        "amount": 500.0,
        "currency": "INR",
        "categoryId": category_id,
        "note": "Second transaction"
    }
    
    response = requests.post(f"{BASE_URL}/transactions", headers=HEADERS, json=tx2_data)
    if response.status_code != 200:
        print(f"❌ Failed to create second transaction: {response.text}")
        return
    
    tx2 = response.json()
    print(f"✅ Created transaction: {tx2['id']}")
    
    # Verify chaining
    if tx2['previousHash'] == tx1['currentHash']:
        print("✅ Second transaction correctly chained to first")
    else:
        print(f"❌ Chain broken!")
        print(f"   Expected previousHash: {tx1['currentHash']}")
        print(f"   Got previousHash: {tx2['previousHash']}")
    
    # Verify hash computation
    expected_hash = compute_expected_hash(tx2)
    if tx2['currentHash'] == expected_hash:
        print("✅ Second transaction hash computed correctly")
    else:
        print(f"❌ Second transaction hash mismatch")
        print(f"   Expected: {expected_hash}")
        print(f"   Got: {tx2['currentHash']}")
    
    # Test 3: Create third transaction
    print("\n📝 Test 3: Creating Third Transaction")
    tx3_data = {
        "type": "expense",
        "amount": 75.0,
        "currency": "INR",
        "categoryId": category_id,
        "note": "Third transaction",
        "billDueAt": int(datetime.now().timestamp() * 1000)  # Test with billDueAt
    }
    
    response = requests.post(f"{BASE_URL}/transactions", headers=HEADERS, json=tx3_data)
    if response.status_code != 200:
        print(f"❌ Failed to create third transaction: {response.text}")
        return
    
    tx3 = response.json()
    print(f"✅ Created transaction: {tx3['id']}")
    
    # Verify chaining
    if tx3['previousHash'] == tx2['currentHash']:
        print("✅ Third transaction correctly chained to second")
    else:
        print(f"❌ Chain broken!")
        print(f"   Expected previousHash: {tx2['currentHash']}")
        print(f"   Got previousHash: {tx3['previousHash']}")
    
    # Verify hash computation with billDueAt
    expected_hash = compute_expected_hash(tx3)
    if tx3['currentHash'] == expected_hash:
        print("✅ Third transaction hash computed correctly (with billDueAt)")
    else:
        print(f"❌ Third transaction hash mismatch")
        print(f"   Expected: {expected_hash}")
        print(f"   Got: {tx3['currentHash']}")
    
    # Test 4: Ledger verification
    print("\n📝 Test 4: Ledger Verification")
    response = requests.get(f"{BASE_URL}/ledger/verify")
    if response.status_code != 200:
        print(f"❌ Failed to verify ledger: {response.text}")
        return
    
    verification = response.json()
    if verification['ok']:
        print(f"✅ Ledger verification passed! Verified {verification['verifiedCount']} transactions")
    else:
        print(f"❌ Ledger verification failed!")
        print(f"   Errors: {verification.get('errors', [])}")
        if 'failedAtId' in verification:
            print(f"   Failed at transaction: {verification['failedAtId']}")
    
    # Test 5: Update transaction and verify hash recomputation
    print("\n📝 Test 5: Transaction Update and Hash Recomputation")
    update_data = {
        "amount": 150.0,
        "note": "Updated first transaction"
    }
    
    response = requests.put(f"{BASE_URL}/transactions/{tx1['id']}", headers=HEADERS, json=update_data)
    if response.status_code != 200:
        print(f"❌ Failed to update transaction: {response.text}")
        return
    
    updated_tx1 = response.json()
    print(f"✅ Updated transaction: {updated_tx1['id']}")
    
    # Verify hash was recomputed
    expected_hash = compute_expected_hash(updated_tx1)
    if updated_tx1['currentHash'] == expected_hash:
        print("✅ Transaction hash recomputed correctly after update")
    else:
        print(f"❌ Transaction hash not recomputed correctly")
        print(f"   Expected: {expected_hash}")
        print(f"   Got: {updated_tx1['currentHash']}")
    
    # Note: After updating tx1, the chain is broken because tx2 still points to old tx1 hash
    print("\n⚠️  Note: Updating a transaction breaks the chain for subsequent transactions")
    print("    This is expected behavior in blockchain systems")
    
    print("\n" + "=" * 50)
    print("🔗 Blockchain functionality test completed!")

if __name__ == "__main__":
    test_blockchain_functionality()
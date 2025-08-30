"""
Blockchain utilities for SpendWise backend
Handles hash computation, chain verification, and Merkle tree operations
"""

import hashlib
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import json

class SpendWiseBlockchain:
    """
    Blockchain-style ledger implementation for SpendWise
    """
    
    GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"
    
    @staticmethod
    def compute_hash(transaction: Dict[str, Any]) -> str:
        """
        Compute SHA-256 hash for a transaction
        Hash Input: id|amount|currency|categoryId|timestamp|billDueAt|previousHash|nonce
        """
        hash_input = "|".join([
            str(transaction.get("id", "")),
            str(transaction.get("amount", "")),
            str(transaction.get("currency", "")),
            str(transaction.get("categoryId", "")),
            str(transaction.get("timestamp", "")),
            str(transaction.get("billDueAt", "") if transaction.get("billDueAt") else ""),
            str(transaction.get("previousHash", "")),
            str(transaction.get("nonce", 0))
        ])
        
        return hashlib.sha256(hash_input.encode()).hexdigest()
    
    @classmethod
    def create_genesis_transaction(cls, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create the first transaction in the chain
        """
        transaction_data["previousHash"] = cls.GENESIS_HASH
        transaction_data["nonce"] = 0
        transaction_data["currentHash"] = cls.compute_hash(transaction_data)
        return transaction_data
    
    @classmethod
    def create_chained_transaction(
        cls, 
        transaction_data: Dict[str, Any], 
        previous_transaction: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new transaction linked to the previous one
        """
        transaction_data["previousHash"] = previous_transaction.get("currentHash", cls.GENESIS_HASH)
        transaction_data["nonce"] = 0
        transaction_data["currentHash"] = cls.compute_hash(transaction_data)
        return transaction_data
    
    @classmethod
    def verify_transaction_hash(cls, transaction: Dict[str, Any]) -> bool:
        """
        Verify that a transaction's hash is correct
        """
        computed_hash = cls.compute_hash(transaction)
        return computed_hash == transaction.get("currentHash")
    
    @classmethod
    def verify_chain_integrity(cls, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Verify the integrity of the entire transaction chain
        """
        if not transactions:
            return {
                "is_valid": True,
                "total_transactions": 0,
                "verified_count": 0,
                "integrity_score": 100,
                "errors": []
            }
        
        # Sort transactions by timestamp
        sorted_transactions = sorted(transactions, key=lambda x: x.get("timestamp", 0))
        
        verified_count = 0
        errors = []
        
        for i, transaction in enumerate(sorted_transactions):
            try:
                # Verify hash computation
                if not cls.verify_transaction_hash(transaction):
                    errors.append({
                        "index": i,
                        "transaction_id": transaction.get("id"),
                        "error": "Invalid hash computation",
                        "expected": cls.compute_hash(transaction),
                        "actual": transaction.get("currentHash")
                    })
                    break
                
                # Verify chain linkage
                if i == 0:
                    # Genesis transaction
                    if transaction.get("previousHash") != cls.GENESIS_HASH:
                        errors.append({
                            "index": i,
                            "transaction_id": transaction.get("id"),
                            "error": "Invalid genesis previousHash",
                            "expected": cls.GENESIS_HASH,
                            "actual": transaction.get("previousHash")
                        })
                        break
                else:
                    # Chain transaction
                    expected_prev_hash = sorted_transactions[i-1].get("currentHash")
                    if transaction.get("previousHash") != expected_prev_hash:
                        errors.append({
                            "index": i,
                            "transaction_id": transaction.get("id"),
                            "error": "Broken chain link",
                            "expected": expected_prev_hash,
                            "actual": transaction.get("previousHash")
                        })
                        break
                
                verified_count += 1
                
            except Exception as e:
                errors.append({
                    "index": i,
                    "transaction_id": transaction.get("id"),
                    "error": f"Verification exception: {str(e)}"
                })
                break
        
        integrity_score = (verified_count / len(transactions)) * 100 if transactions else 100
        is_valid = verified_count == len(transactions)
        
        return {
            "is_valid": is_valid,
            "total_transactions": len(transactions),
            "verified_count": verified_count,
            "integrity_score": round(integrity_score, 2),
            "errors": errors,
            "failed_at_index": errors[0]["index"] if errors else None,
            "failed_transaction_id": errors[0]["transaction_id"] if errors else None
        }
    
    @classmethod
    def rechain_transactions(
        cls, 
        transactions: List[Dict[str, Any]], 
        from_index: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Re-chain transactions from a specific index
        """
        if not transactions or from_index >= len(transactions):
            return transactions
        
        # Sort transactions by timestamp
        sorted_transactions = sorted(transactions, key=lambda x: x.get("timestamp", 0))
        updated_transactions = sorted_transactions.copy()
        
        for i in range(from_index, len(updated_transactions)):
            transaction = updated_transactions[i]
            
            # Update previousHash
            if i == 0:
                transaction["previousHash"] = cls.GENESIS_HASH
            else:
                transaction["previousHash"] = updated_transactions[i-1]["currentHash"]
            
            # Recompute currentHash
            transaction["currentHash"] = cls.compute_hash(transaction)
        
        return updated_transactions
    
    @classmethod
    def generate_merkle_tree(cls, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate Merkle tree for a set of transactions
        """
        if not transactions:
            empty_hash = hashlib.sha256("empty".encode()).hexdigest()
            return {
                "root": empty_hash,
                "tree": [[empty_hash]],
                "transaction_count": 0
            }
        
        # Start with transaction hashes as leaves
        current_level = [tx.get("currentHash", "") for tx in transactions]
        tree = [current_level.copy()]
        
        # Build tree bottom-up
        while len(current_level) > 1:
            next_level = []
            
            for i in range(0, len(current_level), 2):
                if i + 1 < len(current_level):
                    # Pair exists, hash them together
                    combined = current_level[i] + current_level[i + 1]
                    next_level.append(hashlib.sha256(combined.encode()).hexdigest())
                else:
                    # Odd number, hash with itself
                    combined = current_level[i] + current_level[i]
                    next_level.append(hashlib.sha256(combined.encode()).hexdigest())
            
            current_level = next_level
            tree.append(current_level.copy())
        
        return {
            "root": current_level[0] if current_level else "",
            "tree": tree,
            "transaction_count": len(transactions)
        }
    
    @classmethod
    def get_daily_merkle_root(
        cls, 
        transactions: List[Dict[str, Any]], 
        date: Optional[datetime] = None
    ) -> str:
        """
        Generate Merkle root for transactions on a specific date
        """
        if date is None:
            date = datetime.now()
        
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        start_timestamp = int(start_of_day.timestamp() * 1000)
        end_timestamp = int(end_of_day.timestamp() * 1000)
        
        daily_transactions = [
            tx for tx in transactions
            if start_timestamp <= tx.get("timestamp", 0) <= end_timestamp
        ]
        
        merkle_data = cls.generate_merkle_tree(daily_transactions)
        return merkle_data["root"]
    
    @classmethod
    def detect_tampering_patterns(cls, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Detect suspicious patterns that might indicate tampering
        """
        suspicious_transactions = []
        patterns = []
        
        if not transactions:
            return {
                "suspicious_transactions": suspicious_transactions,
                "patterns": patterns,
                "risk_score": 0
            }
        
        # Sort transactions by timestamp
        sorted_transactions = sorted(transactions, key=lambda x: x.get("timestamp", 0))
        current_time = int(datetime.now().timestamp() * 1000)
        
        for i, transaction in enumerate(sorted_transactions):
            tx_id = transaction.get("id", "unknown")
            timestamp = transaction.get("timestamp", 0)
            
            # Check for future timestamps (with 1 minute tolerance)
            if timestamp > current_time + 60000:
                suspicious_transactions.append(tx_id)
                patterns.append(f"Future timestamp detected in transaction {tx_id}")
            
            # Check for timestamp regression (with 5 minute tolerance)
            if i > 0:
                prev_timestamp = sorted_transactions[i-1].get("timestamp", 0)
                if timestamp < prev_timestamp - 300000:
                    suspicious_transactions.append(tx_id)
                    patterns.append(f"Timestamp regression detected in transaction {tx_id}")
            
            # Check for extremely large amounts (potential data corruption)
            amount = transaction.get("amount", 0)
            if amount > 10000000:  # 1 crore
                suspicious_transactions.append(tx_id)
                patterns.append(f"Unusually large amount detected in transaction {tx_id}")
            
            # Check for negative amounts
            if amount < 0:
                suspicious_transactions.append(tx_id)
                patterns.append(f"Negative amount detected in transaction {tx_id}")
        
        # Check for duplicate transaction IDs
        id_counts = {}
        for transaction in transactions:
            tx_id = transaction.get("id", "unknown")
            id_counts[tx_id] = id_counts.get(tx_id, 0) + 1
        
        for tx_id, count in id_counts.items():
            if count > 1:
                suspicious_transactions.append(tx_id)
                patterns.append(f"Duplicate transaction ID detected: {tx_id}")
        
        # Calculate risk score (0-100)
        risk_score = min(100, len(suspicious_transactions) * 20)
        
        return {
            "suspicious_transactions": list(set(suspicious_transactions)),
            "patterns": patterns,
            "risk_score": risk_score,
            "total_issues": len(patterns)
        }
    
    @classmethod
    def generate_blockchain_summary(cls, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate a comprehensive blockchain summary
        """
        verification_result = cls.verify_chain_integrity(transactions)
        tampering_analysis = cls.detect_tampering_patterns(transactions)
        merkle_data = cls.generate_merkle_tree(transactions)
        
        # Calculate additional metrics
        total_value = sum(tx.get("amount", 0) for tx in transactions)
        avg_block_time = 0
        
        if len(transactions) > 1:
            sorted_txs = sorted(transactions, key=lambda x: x.get("timestamp", 0))
            time_diffs = [
                sorted_txs[i].get("timestamp", 0) - sorted_txs[i-1].get("timestamp", 0)
                for i in range(1, len(sorted_txs))
            ]
            avg_block_time = sum(time_diffs) / len(time_diffs) if time_diffs else 0
        
        return {
            "blockchain_stats": {
                "total_transactions": len(transactions),
                "total_value": total_value,
                "average_block_time_ms": round(avg_block_time, 2),
                "merkle_root": merkle_data["root"],
                "genesis_hash": cls.GENESIS_HASH
            },
            "integrity": verification_result,
            "security": tampering_analysis,
            "performance": {
                "verification_time_ms": 0,  # Would be measured in actual implementation
                "merkle_generation_time_ms": 0,
                "chain_depth": len(transactions)
            }
        }


# Utility functions for easy import
def compute_transaction_hash(transaction: Dict[str, Any]) -> str:
    """Compute hash for a single transaction"""
    return SpendWiseBlockchain.compute_hash(transaction)

def verify_transaction_chain(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Verify integrity of transaction chain"""
    return SpendWiseBlockchain.verify_chain_integrity(transactions)

def create_new_transaction(
    transaction_data: Dict[str, Any], 
    previous_transaction: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create a new blockchain transaction"""
    if previous_transaction:
        return SpendWiseBlockchain.create_chained_transaction(transaction_data, previous_transaction)
    else:
        return SpendWiseBlockchain.create_genesis_transaction(transaction_data)

def get_daily_merkle_root(transactions: List[Dict[str, Any]], date: Optional[datetime] = None) -> str:
    """Get Merkle root for transactions on a specific date"""
    return SpendWiseBlockchain.get_daily_merkle_root(transactions, date)

def detect_chain_tampering(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Detect potential tampering in the transaction chain"""
    return SpendWiseBlockchain.detect_tampering_patterns(transactions)
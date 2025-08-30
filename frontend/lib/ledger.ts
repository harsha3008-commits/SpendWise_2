import { Transaction, LedgerVerificationResult } from '../types';
import { sha256 } from './crypto';
import { getTransactions, saveTransaction, updateTransaction } from './storage';

// Calculate hash for a transaction using blockchain-style hashing
export function computeHash(tx: Transaction): string {
  const hashInput = [
    tx.id,
    tx.amount.toString(),
    tx.currency,
    tx.categoryId,
    tx.timestamp.toString(),
    tx.billDueAt?.toString() || '',
    tx.previousHash
  ].join('|');
  
  return sha256(hashInput);
}

// Get the last transaction in chronological order
export async function getLastTransaction(): Promise<Transaction | null> {
  const transactions = await getTransactions();
  if (transactions.length === 0) return null;
  
  // Sort by timestamp and get the latest
  return transactions.sort((a, b) => b.timestamp - a.timestamp)[0];
}

// Add a new transaction to the hash chain
export async function addTransactionToChain(
  transactionData: Omit<Transaction, 'previousHash' | 'currentHash' | 'id' | 'timestamp'>
): Promise<Transaction> {
  const lastTx = await getLastTransaction();
  const previousHash = lastTx ? lastTx.currentHash : '0';
  
  const newTransaction: Transaction = {
    ...transactionData,
    id: generateUUID(),
    timestamp: Date.now(),
    previousHash,
    currentHash: '', // Will be computed below
    version: 1
  };
  
  // Compute the hash for this transaction
  newTransaction.currentHash = computeHash(newTransaction);
  
  // Save to storage
  await saveTransaction(newTransaction);
  
  return newTransaction;
}

// Verify the integrity of the entire ledger
export async function verifyLedger(): Promise<LedgerVerificationResult> {
  const transactions = await getTransactions();
  
  if (transactions.length === 0) {
    return { ok: true, verifiedCount: 0 };
  }
  
  // Sort transactions by timestamp
  const sortedTxs = transactions.sort((a, b) => a.timestamp - b.timestamp);
  
  const errors: string[] = [];
  let verifiedCount = 0;
  
  for (let i = 0; i < sortedTxs.length; i++) {
    const tx = sortedTxs[i];
    
    // Verify hash computation
    const computedHash = computeHash(tx);
    if (computedHash !== tx.currentHash) {
      errors.push(`Transaction ${tx.id} has invalid hash`);
      return {
        ok: false,
        failedAtId: tx.id,
        verifiedCount,
        errors
      };
    }
    
    // Verify chain linkage (except for genesis)
    if (i > 0) {
      const prevTx = sortedTxs[i - 1];
      if (tx.previousHash !== prevTx.currentHash) {
        errors.push(`Transaction ${tx.id} has broken chain link`);
        return {
          ok: false,
          failedAtId: tx.id,
          verifiedCount,
          errors
        };
      }
    } else {
      // Genesis transaction should have previousHash = '0'
      if (tx.previousHash !== '0') {
        errors.push(`Genesis transaction ${tx.id} has invalid previousHash`);
        return {
          ok: false,
          failedAtId: tx.id,
          verifiedCount,
          errors
        };
      }
    }
    
    verifiedCount++;
  }
  
  return {
    ok: true,
    verifiedCount,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Re-chain all transactions from a specific point (used when editing past transactions)
export async function rechainFromTransaction(fromTransactionId: string): Promise<void> {
  const transactions = await getTransactions();
  const sortedTxs = transactions.sort((a, b) => a.timestamp - b.timestamp);
  
  const fromIndex = sortedTxs.findIndex(tx => tx.id === fromTransactionId);
  if (fromIndex === -1) {
    throw new Error('Transaction not found for rechaining');
  }
  
  // Re-compute hashes from the modified transaction onwards
  for (let i = fromIndex; i < sortedTxs.length; i++) {
    const tx = sortedTxs[i];
    
    if (i === 0) {
      tx.previousHash = '0';
    } else {
      tx.previousHash = sortedTxs[i - 1].currentHash;
    }
    
    tx.currentHash = computeHash(tx);
    await updateTransaction(tx);
  }
}

// Edit an existing transaction and re-chain if necessary
export async function editTransaction(
  transactionId: string,
  updates: Partial<Transaction>
): Promise<void> {
  const transactions = await getTransactions();
  const txIndex = transactions.findIndex(tx => tx.id === transactionId);
  
  if (txIndex === -1) {
    throw new Error('Transaction not found');
  }
  
  const transaction = { ...transactions[txIndex], ...updates };
  
  // If we're editing a past transaction, we need to re-chain from this point
  const needsRechain = updates.amount !== undefined || 
                      updates.timestamp !== undefined || 
                      updates.categoryId !== undefined;
  
  if (needsRechain) {
    // Update the transaction first
    await updateTransaction(transaction);
    
    // Then re-chain from this transaction
    await rechainFromTransaction(transactionId);
  } else {
    // Simple update that doesn't affect the hash
    await updateTransaction(transaction);
  }
}

// Generate Merkle root for a set of transactions (for blockchain anchoring)
export function generateMerkleRoot(transactions: Transaction[]): string {
  if (transactions.length === 0) return sha256('empty');
  if (transactions.length === 1) return transactions[0].currentHash;
  
  let hashes = transactions.map(tx => tx.currentHash);
  
  while (hashes.length > 1) {
    const newLevel: string[] = [];
    
    for (let i = 0; i < hashes.length; i += 2) {
      if (i + 1 < hashes.length) {
        // Pair exists, hash them together
        newLevel.push(sha256(hashes[i] + hashes[i + 1]));
      } else {
        // Odd number, hash with itself
        newLevel.push(sha256(hashes[i] + hashes[i]));
      }
    }
    
    hashes = newLevel;
  }
  
  return hashes[0];
}

// Get daily Merkle root (for blockchain sync)
export async function getDailyMerkleRoot(date: Date): Promise<string> {
  const transactions = await getTransactions();
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const dailyTxs = transactions.filter(tx => 
    tx.timestamp >= startOfDay.getTime() && 
    tx.timestamp <= endOfDay.getTime()
  );
  
  return generateMerkleRoot(dailyTxs);
}

// Simple UUID generator (replace with proper library in production)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Soft delete a transaction (mark as deleted but keep in chain for integrity)
export async function softDeleteTransaction(transactionId: string): Promise<void> {
  const transactions = await getTransactions();
  const transaction = transactions.find(tx => tx.id === transactionId);
  
  if (!transaction) {
    throw new Error('Transaction not found');
  }
  
  // Mark as deleted by adding a flag (preserves chain integrity)
  const updatedTx = {
    ...transaction,
    note: `[DELETED] ${transaction.note || ''}`,
    amount: 0, // Set amount to 0 but keep in chain
    tags: [...(transaction.tags || []), 'DELETED']
  };
  
  await updateTransaction(updatedTx);
}
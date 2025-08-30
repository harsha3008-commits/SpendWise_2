import { sha256 } from './crypto';
import { Transaction } from '../types';

export interface BlockchainTransaction extends Transaction {
  previousHash: string;
  currentHash: string;
  timestamp: number;
  nonce?: number;
}

export interface LedgerVerificationResult {
  isValid: boolean;
  totalTransactions: number;
  verifiedCount: number;
  failedAtIndex?: number;
  failedTransactionId?: string;
  errorMessage?: string;
  integrityScore: number; // 0-100%
}

export interface MerkleProof {
  root: string;
  proofs: string[];
  indices: number[];
}

/**
 * Blockchain-style ledger utilities for SpendWise
 * Implements hash-chaining, merkle trees, and integrity verification
 */
export class SpendWiseLedger {
  private static instance: SpendWiseLedger;
  private genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';

  private constructor() {}

  static getInstance(): SpendWiseLedger {
    if (!SpendWiseLedger.instance) {
      SpendWiseLedger.instance = new SpendWiseLedger();
    }
    return SpendWiseLedger.instance;
  }

  /**
   * Compute SHA-256 hash for a transaction
   * Hash Input: id|amount|currency|categoryId|timestamp|billDueAt|previousHash|nonce
   */
  computeHash(transaction: BlockchainTransaction): string {
    const hashInput = [
      transaction.id,
      transaction.amount.toString(),
      transaction.currency,
      transaction.categoryId,
      transaction.timestamp.toString(),
      transaction.billDueAt?.toString() || '',
      transaction.previousHash,
      transaction.nonce?.toString() || '0'
    ].join('|');

    return sha256(hashInput);
  }

  /**
   * Create a new blockchain transaction with proper hash chaining
   */
  createBlockchainTransaction(
    transactionData: Omit<Transaction, 'previousHash' | 'currentHash'>,
    previousTransaction?: BlockchainTransaction
  ): BlockchainTransaction {
    const previousHash = previousTransaction ? previousTransaction.currentHash : this.genesisHash;
    
    const blockchainTx: BlockchainTransaction = {
      ...transactionData,
      previousHash,
      currentHash: '',
      timestamp: transactionData.timestamp || Date.now(),
      nonce: 0
    };

    // Compute hash
    blockchainTx.currentHash = this.computeHash(blockchainTx);
    
    return blockchainTx;
  }

  /**
   * Verify the integrity of the entire transaction chain
   */
  verifyChain(transactions: BlockchainTransaction[]): LedgerVerificationResult {
    if (transactions.length === 0) {
      return {
        isValid: true,
        totalTransactions: 0,
        verifiedCount: 0,
        integrityScore: 100
      };
    }

    // Sort transactions by timestamp to ensure proper order
    const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
    
    let verifiedCount = 0;
    let failedAtIndex: number | undefined;
    let failedTransactionId: string | undefined;
    let errorMessage: string | undefined;

    for (let i = 0; i < sortedTransactions.length; i++) {
      const currentTx = sortedTransactions[i];

      try {
        // Verify hash computation
        const computedHash = this.computeHash(currentTx);
        if (computedHash !== currentTx.currentHash) {
          failedAtIndex = i;
          failedTransactionId = currentTx.id;
          errorMessage = `Hash mismatch at transaction ${currentTx.id}. Expected: ${computedHash}, Got: ${currentTx.currentHash}`;
          break;
        }

        // Verify chain linkage
        if (i === 0) {
          // Genesis transaction should link to genesis hash
          if (currentTx.previousHash !== this.genesisHash) {
            failedAtIndex = i;
            failedTransactionId = currentTx.id;
            errorMessage = `Genesis transaction has invalid previousHash: ${currentTx.previousHash}`;
            break;
          }
        } else {
          // Subsequent transactions should link to previous transaction
          const prevTx = sortedTransactions[i - 1];
          if (currentTx.previousHash !== prevTx.currentHash) {
            failedAtIndex = i;
            failedTransactionId = currentTx.id;
            errorMessage = `Broken chain link at transaction ${currentTx.id}. Expected previousHash: ${prevTx.currentHash}, Got: ${currentTx.previousHash}`;
            break;
          }
        }

        verifiedCount++;
      } catch (error) {
        failedAtIndex = i;
        failedTransactionId = currentTx.id;
        errorMessage = `Verification error at transaction ${currentTx.id}: ${error}`;
        break;
      }
    }

    const integrityScore = transactions.length > 0 ? Math.round((verifiedCount / transactions.length) * 100) : 100;
    const isValid = verifiedCount === transactions.length;

    return {
      isValid,
      totalTransactions: transactions.length,
      verifiedCount,
      failedAtIndex,
      failedTransactionId,
      errorMessage,
      integrityScore
    };
  }

  /**
   * Re-chain transactions from a specific point (used when editing past transactions)
   */
  rechainTransactions(
    transactions: BlockchainTransaction[], 
    fromIndex: number
  ): BlockchainTransaction[] {
    if (fromIndex >= transactions.length || fromIndex < 0) {
      return transactions;
    }

    const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
    const updatedTransactions = [...sortedTransactions];

    for (let i = fromIndex; i < updatedTransactions.length; i++) {
      const currentTx = updatedTransactions[i];

      // Update previousHash
      if (i === 0) {
        currentTx.previousHash = this.genesisHash;
      } else {
        currentTx.previousHash = updatedTransactions[i - 1].currentHash;
      }

      // Recompute currentHash
      currentTx.currentHash = this.computeHash(currentTx);
    }

    return updatedTransactions;
  }

  /**
   * Generate Merkle tree for a set of transactions
   */
  generateMerkleTree(transactions: BlockchainTransaction[]): { root: string; tree: string[][] } {
    if (transactions.length === 0) {
      return { root: sha256('empty'), tree: [[sha256('empty')]] };
    }

    // Start with transaction hashes as leaves
    let currentLevel = transactions.map(tx => tx.currentHash);
    const tree: string[][] = [currentLevel];

    // Build tree bottom-up
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          // Pair exists, hash them together
          const combined = currentLevel[i] + currentLevel[i + 1];
          nextLevel.push(sha256(combined));
        } else {
          // Odd number, hash with itself
          const combined = currentLevel[i] + currentLevel[i];
          nextLevel.push(sha256(combined));
        }
      }

      currentLevel = nextLevel;
      tree.push(currentLevel);
    }

    return {
      root: currentLevel[0],
      tree
    };
  }

  /**
   * Generate Merkle proof for a specific transaction
   */
  generateMerkleProof(
    transactions: BlockchainTransaction[], 
    targetTransactionId: string
  ): MerkleProof | null {
    const targetIndex = transactions.findIndex(tx => tx.id === targetTransactionId);
    if (targetIndex === -1) {
      return null;
    }

    const { tree } = this.generateMerkleTree(transactions);
    const proofs: string[] = [];
    const indices: number[] = [];
    
    let currentIndex = targetIndex;

    // Traverse up the tree to collect proof hashes
    for (let level = 0; level < tree.length - 1; level++) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      if (siblingIndex < tree[level].length) {
        proofs.push(tree[level][siblingIndex]);
        indices.push(siblingIndex);
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      root: tree[tree.length - 1][0],
      proofs,
      indices
    };
  }

  /**
   * Verify a Merkle proof for a transaction
   */
  verifyMerkleProof(
    transactionHash: string, 
    proof: MerkleProof, 
    transactionIndex: number
  ): boolean {
    let currentHash = transactionHash;
    let currentIndex = transactionIndex;

    for (let i = 0; i < proof.proofs.length; i++) {
      const proofHash = proof.proofs[i];
      const isRightNode = currentIndex % 2 === 1;
      
      if (isRightNode) {
        currentHash = sha256(proofHash + currentHash);
      } else {
        currentHash = sha256(currentHash + proofHash);
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return currentHash === proof.root;
  }

  /**
   * Detect potential tampering patterns
   */
  detectTamperingPatterns(transactions: BlockchainTransaction[]): {
    suspiciousTransactions: string[];
    patterns: string[];
  } {
    const suspiciousTransactions: string[] = [];
    const patterns: string[] = [];

    if (transactions.length === 0) {
      return { suspiciousTransactions, patterns };
    }

    const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

    // Check for timestamp anomalies
    for (let i = 1; i < sortedTransactions.length; i++) {
      const current = sortedTransactions[i];
      const previous = sortedTransactions[i - 1];

      // Check for future timestamps
      if (current.timestamp > Date.now() + 60000) { // 1 minute tolerance
        suspiciousTransactions.push(current.id);
        patterns.push(`Future timestamp detected in transaction ${current.id}`);
      }

      // Check for timestamp going backwards significantly
      if (current.timestamp < previous.timestamp - 300000) { // 5 minute tolerance
        suspiciousTransactions.push(current.id);
        patterns.push(`Timestamp regression detected in transaction ${current.id}`);
      }
    }

    // Check for duplicate transaction IDs
    const idSet = new Set();
    for (const tx of transactions) {
      if (idSet.has(tx.id)) {
        suspiciousTransactions.push(tx.id);
        patterns.push(`Duplicate transaction ID detected: ${tx.id}`);
      }
      idSet.add(tx.id);
    }

    return { suspiciousTransactions, patterns };
  }

  /**
   * Generate daily Merkle root for blockchain anchoring
   */
  getDailyMerkleRoot(transactions: BlockchainTransaction[], date: Date): string {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dailyTransactions = transactions.filter(tx => 
      tx.timestamp >= startOfDay.getTime() && 
      tx.timestamp <= endOfDay.getTime()
    );

    const { root } = this.generateMerkleTree(dailyTransactions);
    return root;
  }

  /**
   * Performance optimized verification for large transaction sets
   */
  fastVerifyChain(transactions: BlockchainTransaction[]): boolean {
    if (transactions.length === 0) return true;
    
    // Sample verification for performance
    const sampleSize = Math.min(10, Math.ceil(transactions.length * 0.1));
    const indices = [];
    
    // Always verify first and last transactions
    indices.push(0);
    if (transactions.length > 1) {
      indices.push(transactions.length - 1);
    }
    
    // Add random sample
    for (let i = 0; i < sampleSize - 2; i++) {
      const randomIndex = Math.floor(Math.random() * transactions.length);
      if (!indices.includes(randomIndex)) {
        indices.push(randomIndex);
      }
    }

    const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
    
    for (const index of indices) {
      const tx = sortedTransactions[index];
      const computedHash = this.computeHash(tx);
      
      if (computedHash !== tx.currentHash) {
        return false;
      }
    }

    return true;
  }
}

// Export singleton instance
export const spendWiseLedger = SpendWiseLedger.getInstance();

// Utility functions
export const computeTransactionHash = (transaction: BlockchainTransaction): string => {
  return spendWiseLedger.computeHash(transaction);
};

export const verifyTransactionChain = (transactions: BlockchainTransaction[]): LedgerVerificationResult => {
  return spendWiseLedger.verifyChain(transactions);
};

export const generateDailyMerkleRoot = (transactions: BlockchainTransaction[], date: Date = new Date()): string => {
  return spendWiseLedger.getDailyMerkleRoot(transactions, date);
};

export default SpendWiseLedger;
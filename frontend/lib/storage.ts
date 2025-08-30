import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category, Budget, Bill, Settings, SubscriptionState } from '../types';
import { encrypt, decrypt, getEncryptionKey } from './crypto';

const STORAGE_KEYS = {
  TRANSACTIONS: 'spendwise_transactions',
  CATEGORIES: 'spendwise_categories',
  BUDGETS: 'spendwise_budgets',
  BILLS: 'spendwise_bills',
  SETTINGS: 'spendwise_settings',
  SUBSCRIPTION: 'spendwise_subscription',
  USER_HASH: 'spendwise_user_hash',
  IS_INITIALIZED: 'spendwise_initialized'
};

// Encryption wrapper for storage
async function encryptAndStore(key: string, data: any): Promise<void> {
  const encryptionKey = await getEncryptionKey();
  if (!encryptionKey) {
    throw new Error('Encryption key not found. Please initialize the app first.');
  }
  
  const jsonData = JSON.stringify(data);
  const encrypted = encrypt(jsonData, encryptionKey);
  
  await AsyncStorage.setItem(key, JSON.stringify(encrypted));
}

async function retrieveAndDecrypt<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const encryptionKey = await getEncryptionKey();
    if (!encryptionKey) {
      return defaultValue;
    }
    
    const stored = await AsyncStorage.getItem(key);
    if (!stored) {
      return defaultValue;
    }
    
    const encryptedData = JSON.parse(stored);
    const decrypted = decrypt(encryptedData.ciphertext, encryptionKey, encryptedData.iv);
    
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error(`Error retrieving ${key}:`, error);
    return defaultValue;
  }
}

// Transaction operations
export async function getTransactions(): Promise<Transaction[]> {
  return retrieveAndDecrypt(STORAGE_KEYS.TRANSACTIONS, []);
}

export async function saveTransaction(transaction: Transaction): Promise<void> {
  const transactions = await getTransactions();
  const existingIndex = transactions.findIndex(tx => tx.id === transaction.id);
  
  if (existingIndex >= 0) {
    transactions[existingIndex] = transaction;
  } else {
    transactions.push(transaction);
  }
  
  await encryptAndStore(STORAGE_KEYS.TRANSACTIONS, transactions);
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  await saveTransaction(transaction);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const transactions = await getTransactions();
  const filtered = transactions.filter(tx => tx.id !== transactionId);
  await encryptAndStore(STORAGE_KEYS.TRANSACTIONS, filtered);
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const transactions = await getTransactions();
  return transactions.find(tx => tx.id === id) || null;
}

// Category operations
export async function getCategories(): Promise<Category[]> {
  const categories = await retrieveAndDecrypt(STORAGE_KEYS.CATEGORIES, []);
  
  // Initialize with default categories if empty
  if (categories.length === 0) {
    return getDefaultCategories();
  }
  
  return categories;
}

export async function saveCategory(category: Category): Promise<void> {
  const categories = await getCategories();
  const existingIndex = categories.findIndex(cat => cat.id === category.id);
  
  if (existingIndex >= 0) {
    categories[existingIndex] = category;
  } else {
    categories.push(category);
  }
  
  await encryptAndStore(STORAGE_KEYS.CATEGORIES, categories);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const categories = await getCategories();
  const filtered = categories.filter(cat => cat.id !== categoryId && !cat.isDefault);
  await encryptAndStore(STORAGE_KEYS.CATEGORIES, filtered);
}

// Budget operations
export async function getBudgets(): Promise<Budget[]> {
  return retrieveAndDecrypt(STORAGE_KEYS.BUDGETS, []);
}

export async function saveBudget(budget: Budget): Promise<void> {
  const budgets = await getBudgets();
  const existingIndex = budgets.findIndex(b => b.id === budget.id);
  
  if (existingIndex >= 0) {
    budgets[existingIndex] = budget;
  } else {
    budgets.push(budget);
  }
  
  await encryptAndStore(STORAGE_KEYS.BUDGETS, budgets);
}

export async function deleteBudget(budgetId: string): Promise<void> {
  const budgets = await getBudgets();
  const filtered = budgets.filter(b => b.id !== budgetId);
  await encryptAndStore(STORAGE_KEYS.BUDGETS, filtered);
}

// Bill operations
export async function getBills(): Promise<Bill[]> {
  return retrieveAndDecrypt(STORAGE_KEYS.BILLS, []);
}

export async function saveBill(bill: Bill): Promise<void> {
  const bills = await getBills();
  const existingIndex = bills.findIndex(b => b.id === bill.id);
  
  if (existingIndex >= 0) {
    bills[existingIndex] = bill;
  } else {
    bills.push(bill);
  }
  
  await encryptAndStore(STORAGE_KEYS.BILLS, bills);
}

export async function deleteBill(billId: string): Promise<void> {
  const bills = await getBills();
  const filtered = bills.filter(b => b.id !== billId);
  await encryptAndStore(STORAGE_KEYS.BILLS, filtered);
}

// Settings operations
export async function getSettings(): Promise<Settings> {
  const defaultSettings: Settings = {
    currency: 'INR',
    biometricsEnabled: false,
    autoLockMinutes: 5,
    analyticsSharing: 'none',
    syncEnabled: false,
    notificationsEnabled: true,
    theme: 'system',
    language: 'en',
    backupEnabled: false,
    encryptionSalt: ''
  };
  
  return retrieveAndDecrypt(STORAGE_KEYS.SETTINGS, defaultSettings);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await encryptAndStore(STORAGE_KEYS.SETTINGS, settings);
}

// Subscription operations
export async function getSubscriptionState(): Promise<SubscriptionState> {
  const defaultState: SubscriptionState = {
    plan: 'free',
    features: []
  };
  
  return retrieveAndDecrypt(STORAGE_KEYS.SUBSCRIPTION, defaultState);
}

export async function saveSubscriptionState(state: SubscriptionState): Promise<void> {
  await encryptAndStore(STORAGE_KEYS.SUBSCRIPTION, state);
}

// App initialization
export async function isAppInitialized(): Promise<boolean> {
  const initialized = await AsyncStorage.getItem(STORAGE_KEYS.IS_INITIALIZED);
  return initialized === 'true';
}

export async function markAppAsInitialized(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.IS_INITIALIZED, 'true');
}

export async function resetApp(): Promise<void> {
  // Clear all storage
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}

// User hash for passphrase verification
export async function getUserHash(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.USER_HASH);
}

export async function saveUserHash(hash: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_HASH, hash);
}

// Default categories
function getDefaultCategories(): Category[] {
  return [
    {
      id: '1',
      name: 'Food & Dining',
      icon: '🍽️',
      color: '#FF6B6B',
      type: 'expense',
      isDefault: true
    },
    {
      id: '2',
      name: 'Transportation',
      icon: '🚗',
      color: '#4ECDC4',
      type: 'expense',
      isDefault: true
    },
    {
      id: '3',
      name: 'Shopping',
      icon: '🛍️',
      color: '#45B7D1',
      type: 'expense',
      isDefault: true
    },
    {
      id: '4',
      name: 'Entertainment',
      icon: '🎬',
      color: '#96CEB4',
      type: 'expense',
      isDefault: true
    },
    {
      id: '5',
      name: 'Bills & Utilities',
      icon: '📋',
      color: '#FECA57',
      type: 'expense',
      isDefault: true
    },
    {
      id: '6',
      name: 'Healthcare',
      icon: '🏥',
      color: '#FF9FF3',
      type: 'expense',
      isDefault: true
    },
    {
      id: '7',
      name: 'Salary',
      icon: '💼',
      color: '#10B981',
      type: 'income',
      isDefault: true
    },
    {
      id: '8',
      name: 'Investment',
      icon: '📈',
      color: '#3B82F6',
      type: 'income',
      isDefault: true
    },
    {
      id: '9',
      name: 'Gift',
      icon: '🎁',
      color: '#8B5CF6',
      type: 'income',
      isDefault: true
    },
    {
      id: '10',
      name: 'Other',
      icon: '📝',
      color: '#6B7280',
      type: 'expense',
      isDefault: true
    }
  ];
}
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | string;

export type TxType = 'expense' | 'income' | 'transfer' | 'bill';

export type SubscriptionPlan = 'free' | 'premium';

export interface Transaction {
  id: string;                  // uuid
  type: TxType;
  amount: number;              // positive number
  currency: CurrencyCode;
  categoryId: string;
  accountId?: string;          // wallet/bank name alias
  note?: string;
  merchant?: string;
  tags?: string[];
  timestamp: number;           // ms since epoch
  billDueAt?: number | null;   // for bills
  attachmentIds?: string[];
  previousHash: string;        // "" or "0" for genesis
  currentHash: string;         // SHA-256
  version: number;             // schema version
  walletAddress?: string;      // blockchain wallet address
  blockchainTxHash?: string;   // on-chain transaction hash
  isRecurring?: boolean;
  recurringRule?: RecurringRule;
  budgetId?: string;
  isPaid?: boolean;            // for bills
}

export interface RecurringRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;            // every N frequency units
  endDate?: number | null;     // when to stop recurring
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  type: 'expense' | 'income';
  budgetMonthly?: number;      // null = no budget
  isDefault?: boolean;
}

export interface Budget {
  id: string;
  name: string;
  categoryIds: string[];
  amount: number;
  spent: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: number;
  endDate: number;
  isActive: boolean;
  notifications: boolean;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: number;
  categoryId: string;
  isRecurring: boolean;
  recurringRule?: RecurringRule;
  isPaid: boolean;
  reminderDays: number[];      // days before due date to remind
  paymentTransactionId?: string; // linked transaction when paid
}

export interface SubscriptionState {
  plan: SubscriptionPlan;
  expiresAt?: number | null;
  receipt?: string;            // encrypted receipt token
  lastVerifiedAt?: number;
  features: PremiumFeature[];
}

export type PremiumFeature = 
  | 'advanced_analytics'
  | 'export_data'
  | 'blockchain_sync'
  | 'multi_device_sync'
  | 'ocr_receipts'
  | 'unlimited_budgets'
  | 'custom_categories';

export interface Settings {
  currency: CurrencyCode;
  biometricsEnabled: boolean;
  autoLockMinutes: number;
  analyticsSharing: 'none';    // always none for privacy
  syncEnabled: boolean;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  backupEnabled: boolean;
  walletAddress?: string;
  encryptionSalt: string;
}

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  dataEncRef: string;          // pointer to encrypted blob storage
  size: number;
  createdAt: number;
}

export interface SyncSnapshot {
  snapshotId: string;
  createdAt: number;
  merkleRoot: string;          // for ledger integrity
  encPayloadCid: string;       // IPFS CID (encrypted)
  nonce: string;               // AES-GCM nonce
  deviceId: string;
}

export interface KeyMaterial {
  keyDerivationSalt: string;
  publicKey?: string;          // for future pairing
  encryptedPrivateKey?: string;
}

export interface WalletConnection {
  address: string;
  provider: 'metamask' | 'walletconnect' | 'coinbase';
  chainId: number;
  isConnected: boolean;
  balance?: string;
}

export interface AnalyticsData {
  totalIncome: number;
  totalExpenses: number;
  netWorth: number;
  categoryBreakdown: { [categoryId: string]: number };
  monthlyTrends: { month: string; income: number; expenses: number }[];
  topMerchants: { merchant: string; amount: number }[];
  budgetStatus: { budgetId: string; percentUsed: number }[];
}

export interface LedgerVerificationResult {
  ok: boolean;
  failedAtId?: string;
  verifiedCount: number;
  errors?: string[];
}

export interface User {
  id: string;
  email?: string;
  encryptionKeyHash: string;   // hashed passphrase for verification
  createdAt: number;
  lastActiveAt: number;
  preferences: Settings;
  subscriptionState: SubscriptionState;
}

export interface BackupData {
  version: string;
  createdAt: number;
  deviceId: string;
  encryptedData: string;       // AES-GCM encrypted JSON
  nonce: string;
  salt: string;
  checksum: string;            // SHA-256 for integrity
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form types
export interface TransactionForm {
  type: TxType;
  amount: string;
  currency: CurrencyCode;
  categoryId: string;
  accountId?: string;
  note?: string;
  merchant?: string;
  tags?: string[];
  billDueAt?: Date | null;
  isRecurring?: boolean;
  recurringRule?: RecurringRule;
}

export interface BillForm {
  name: string;
  amount: string;
  dueDate: Date;
  categoryId: string;
  isRecurring: boolean;
  recurringRule?: RecurringRule;
  reminderDays: number[];
}

export interface BudgetForm {
  name: string;
  categoryIds: string[];
  amount: string;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  notifications: boolean;
}

// Navigation types
export type RootStackParamList = {
  index: undefined;
  onboarding: undefined;
  dashboard: undefined;
  transactions: undefined;
  'add-transaction': { editId?: string };
  'transaction-detail': { id: string };
  bills: undefined;
  'add-bill': { editId?: string };
  budgets: undefined;
  'add-budget': { editId?: string };
  analytics: undefined;
  subscription: undefined;
  settings: undefined;
  'wallet-connect': undefined;
  backup: undefined;
};
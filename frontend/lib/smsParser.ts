/**
 * SMS Transaction Parser for Indian Banks and UPI Services
 * Supports: SBI, HDFC, ICICI, Axis, KOTAK, PhonePe, GPay, Paytm, etc.
 */

export interface ParsedTransaction {
  amount: number;
  type: 'debit' | 'credit';
  merchant: string;
  date: Date;
  reference?: string;
  accountNumber?: string;
  category: string;
  isValid: boolean;
  rawSms: string;
}

export interface SmsPattern {
  bank: string;
  pattern: RegExp;
  amountGroup: number;
  typeGroup: number;
  merchantGroup: number;
  refGroup?: number;
  accountGroup?: number;
}

// Comprehensive SMS patterns for Indian banks and UPI services
const SMS_PATTERNS: SmsPattern[] = [
  // State Bank of India (SBI)
  {
    bank: 'SBI',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(debited|credited|deducted|received).*?(?:to|from|at)\s*([A-Za-z0-9\s]+).*?(?:Ref|RefNo|Txn):\s*([A-Z0-9]+)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },
  
  // HDFC Bank
  {
    bank: 'HDFC',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|deducted|received).*?(?:to|from|at)\s*([A-Za-z0-9\s]+).*?(?:Ref|RefNo|UPI Ref):\s*([A-Z0-9]+)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },
  
  // ICICI Bank
  {
    bank: 'ICICI',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|spent|received).*?(?:to|from|at)\s*([A-Za-z0-9\s]+).*?(?:Ref|RefNo|TxnId):\s*([A-Z0-9]+)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },
  
  // Axis Bank
  {
    bank: 'AXIS',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|deducted|received).*?(?:to|from|at)\s*([A-Za-z0-9\s]+).*?(?:Ref|RefNo|TID):\s*([A-Z0-9]+)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },
  
  // Kotak Mahindra Bank
  {
    bank: 'KOTAK',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|spent|received).*?(?:to|from|at)\s*([A-Za-z0-9\s]+).*?(?:Ref|RefNo|TxnRef):\s*([A-Z0-9]+)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },
  
  // PhonePe
  {
    bank: 'PhonePe',
    pattern: /(?:You\s*(?:paid|sent|received))\s*(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:to|from)\s*([A-Za-z0-9\s@]+).*?(?:UPI\s*ID|UTR|Ref):\s*([A-Z0-9]+)/i,
    amountGroup: 1,
    typeGroup: 0, // Will be determined by context
    merchantGroup: 2,
    refGroup: 3
  },
  
  // Google Pay (GPay)
  {
    bank: 'GPay',
    pattern: /(?:You\s*(?:paid|sent|received))\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:to|from)\s*([A-Za-z0-9\s@]+).*?(?:UPI\s*transaction\s*ID|Ref):\s*([A-Z0-9]+)/i,
    amountGroup: 1,
    typeGroup: 0, // Will be determined by context
    merchantGroup: 2,
    refGroup: 3
  },
  
  // Paytm
  {
    bank: 'Paytm',
    pattern: /(?:Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:paid|sent|received|debited|credited)\s*(?:to|from)\s*([A-Za-z0-9\s@]+).*?(?:Order|Txn|Ref)\s*(?:ID|No):\s*([A-Z0-9]+)/i,
    amountGroup: 1,
    typeGroup: 0, // Will be determined by context
    merchantGroup: 2,
    refGroup: 3
  },
  
  // BHIM UPI
  {
    bank: 'BHIM',
    pattern: /(?:Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:paid|sent|received)\s*(?:to|from)\s*([A-Za-z0-9\s@]+).*?(?:UPI\s*Ref|Ref):\s*([A-Z0-9]+)/i,
    amountGroup: 1,
    typeGroup: 0,
    merchantGroup: 2,
    refGroup: 3
  },
  
  // Generic Bank Pattern (Fallback)
  {
    bank: 'Generic',
    pattern: /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(debited|credited|deducted|received|paid|sent).*?(?:to|from|at)\s*([A-Za-z0-9\s]+)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3
  }
];

// Merchant categorization patterns
const CATEGORY_PATTERNS = [
  // Food & Dining
  {
    category: 'Food',
    keywords: ['swiggy', 'zomato', 'uber eats', 'dominos', 'pizza hut', 'mcdonalds', 'kfc', 'subway', 'starbucks', 'cafe', 'restaurant', 'food', 'dinner', 'lunch', 'breakfast']
  },
  
  // Shopping
  {
    category: 'Shopping',
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'paytm mall', 'snapdeal', 'shoppers stop', 'lifestyle', 'reliance', 'big bazaar', 'dmart', 'mall', 'shopping']
  },
  
  // Transportation
  {
    category: 'Transport',
    keywords: ['uber', 'ola', 'rapido', 'metro', 'irctc', 'indian railways', 'bus', 'taxi', 'auto', 'petrol', 'diesel', 'fuel', 'parking']
  },
  
  // Entertainment
  {
    category: 'Entertainment',
    keywords: ['netflix', 'amazon prime', 'hotstar', 'spotify', 'youtube', 'bookmyshow', 'paytm movies', 'pvr', 'inox', 'cinema', 'movie', 'music']
  },
  
  // Bills & Utilities
  {
    category: 'Bills',
    keywords: ['electricity', 'water', 'gas', 'internet', 'broadband', 'mobile', 'airtel', 'jio', 'vodafone', 'bsnl', 'bill payment', 'recharge']
  },
  
  // Healthcare
  {
    category: 'Healthcare',
    keywords: ['apollo', 'fortis', 'max', 'hospital', 'clinic', 'pharmacy', 'medicine', 'doctor', 'medical', '1mg', 'netmeds', 'pharmeasy']
  },
  
  // Travel
  {
    category: 'Travel',
    keywords: ['makemytrip', 'goibibo', 'yatra', 'cleartrip', 'indigo', 'spicejet', 'air india', 'hotel', 'booking', 'flight', 'train', 'travel']
  },
  
  // Investment
  {
    category: 'Investment',
    keywords: ['mutual fund', 'sip', 'zerodha', 'groww', 'upstox', 'angel broking', 'stock', 'equity', 'investment', 'trading']
  },
  
  // ATM/Cash
  {
    category: 'Cash',
    keywords: ['atm', 'cash withdrawal', 'cash deposit', 'branch', 'bank']
  }
];

/**
 * Parse SMS message to extract transaction details
 */
export function parseSMS(smsBody: string, sender: string): ParsedTransaction {
  const defaultResult: ParsedTransaction = {
    amount: 0,
    type: 'debit',
    merchant: 'Unknown',
    date: new Date(),
    category: 'Other',
    isValid: false,
    rawSms: smsBody
  };

  // Skip if sender is not a bank or financial service
  if (!isFinancialSender(sender)) {
    return defaultResult;
  }

  // Try each pattern
  for (const pattern of SMS_PATTERNS) {
    const match = smsBody.match(pattern.pattern);
    
    if (match) {
      try {
        // Extract amount
        const amountStr = match[pattern.amountGroup]?.replace(/,/g, '') || '0';
        const amount = parseFloat(amountStr);
        
        if (isNaN(amount) || amount <= 0) {
          continue;
        }

        // Extract transaction type
        let type: 'debit' | 'credit' = 'debit';
        if (pattern.typeGroup > 0) {
          const typeStr = match[pattern.typeGroup]?.toLowerCase() || '';
          type = determineTransactionType(typeStr, smsBody);
        } else {
          type = determineTransactionType('', smsBody);
        }

        // Extract merchant
        const merchant = cleanMerchantName(match[pattern.merchantGroup] || 'Unknown');

        // Extract reference
        const reference = pattern.refGroup ? match[pattern.refGroup] : undefined;

        // Extract account number
        const accountNumber = pattern.accountGroup ? match[pattern.accountGroup] : extractAccountNumber(smsBody);

        // Determine category
        const category = categorizeTransaction(merchant, smsBody);

        return {
          amount,
          type,
          merchant,
          date: new Date(),
          reference,
          accountNumber,
          category,
          isValid: true,
          rawSms: smsBody
        };

      } catch (error) {
        console.error('Error parsing SMS:', error);
        continue;
      }
    }
  }

  return defaultResult;
}

/**
 * Check if sender is a financial institution
 */
function isFinancialSender(sender: string): boolean {
  const financialSenders = [
    'SBI', 'HDFC', 'ICICI', 'AXIS', 'KOTAK', 'PNB', 'BOB', 'CANARA',
    'PhonePe', 'GPay', 'PAYTM', 'BHIM', 'AMAZON', 'FLIPKART',
    'IDFCFB', 'YESBK', 'INDUS', 'FEDERAL'
  ];

  const upperSender = sender.toUpperCase();
  return financialSenders.some(bank => upperSender.includes(bank));
}

/**
 * Determine transaction type from keywords
 */
function determineTransactionType(typeStr: string, fullSms: string): 'debit' | 'credit' {
  const debitKeywords = ['debited', 'deducted', 'spent', 'paid', 'sent', 'withdrawn', 'purchase'];
  const creditKeywords = ['credited', 'received', 'deposited', 'refund', 'cashback'];

  const combinedText = (typeStr + ' ' + fullSms).toLowerCase();

  if (creditKeywords.some(keyword => combinedText.includes(keyword))) {
    return 'credit';
  }
  
  if (debitKeywords.some(keyword => combinedText.includes(keyword))) {
    return 'debit';
  }

  // Default to debit for payments
  return 'debit';
}

/**
 * Clean and normalize merchant name
 */
function cleanMerchantName(merchant: string): string {
  return merchant
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50); // Limit length
}

/**
 * Extract account number from SMS
 */
function extractAccountNumber(smsBody: string): string | undefined {
  const accountPattern = /(?:A\/c|Account|A\/C)\s*(?:No\.?|Number)?\s*:?\s*[xX]*(\d{4,})/i;
  const match = smsBody.match(accountPattern);
  return match?.[1];
}

/**
 * Categorize transaction based on merchant and SMS content
 */
function categorizeTransaction(merchant: string, smsBody: string): string {
  const combinedText = (merchant + ' ' + smsBody).toLowerCase();

  for (const categoryData of CATEGORY_PATTERNS) {
    if (categoryData.keywords.some(keyword => combinedText.includes(keyword))) {
      return categoryData.category;
    }
  }

  return 'Other';
}

/**
 * Test cases for SMS parsing
 */
export const TEST_SMS_SAMPLES = [
  {
    bank: 'SBI',
    sms: 'Dear Customer, Rs.500.00 debited from A/C **1234 on 31-Aug-24 to Amazon Pay India at 14:30. Ref: 123456789. SMS HELP to 567676.',
    expected: { amount: 500, type: 'debit', merchant: 'Amazon Pay India', category: 'Shopping' }
  },
  {
    bank: 'HDFC',
    sms: 'Rs.1200.00 has been debited from your A/C **5678 on 31-Aug-24 to SWIGGY. UPI Ref No: 424242424242. Call 18002586161 for dispute.',
    expected: { amount: 1200, type: 'debit', merchant: 'SWIGGY', category: 'Food' }
  },
  {
    bank: 'PhonePe',
    sms: 'You paid Rs.350 to Uber India via UPI. UPI transaction ID: 424242424242. Thank you for using PhonePe!',
    expected: { amount: 350, type: 'debit', merchant: 'Uber India', category: 'Transport' }
  },
  {
    bank: 'GPay',
    sms: 'You sent ₹800 to john@paytm via Google Pay. UPI transaction ID: 123456789012. Keep your transactions secure.',
    expected: { amount: 800, type: 'debit', merchant: 'john@paytm', category: 'Other' }
  },
  {
    bank: 'ICICI',
    sms: 'INR 2000.00 credited to A/C **9876 on 31-Aug-24 from SALARY CREDIT. TxnId: 987654321. Available balance: INR 15000.',
    expected: { amount: 2000, type: 'credit', merchant: 'SALARY CREDIT', category: 'Other' }
  }
];

/**
 * Run tests on SMS parsing
 */
export function runSMSTests(): boolean {
  console.log('🧪 Running SMS Parser Tests...');
  let passedTests = 0;

  for (const testCase of TEST_SMS_SAMPLES) {
    const result = parseSMS(testCase.sms, testCase.bank);
    
    const passed = 
      result.isValid &&
      result.amount === testCase.expected.amount &&
      result.type === testCase.expected.type &&
      result.merchant.toLowerCase().includes(testCase.expected.merchant.toLowerCase()) &&
      result.category === testCase.expected.category;

    console.log(`${passed ? '✅' : '❌'} ${testCase.bank}: ${passed ? 'PASSED' : 'FAILED'}`);
    
    if (!passed) {
      console.log('Expected:', testCase.expected);
      console.log('Got:', { amount: result.amount, type: result.type, merchant: result.merchant, category: result.category });
    }

    if (passed) passedTests++;
  }

  console.log(`📊 Tests Results: ${passedTests}/${TEST_SMS_SAMPLES.length} passed`);
  return passedTests === TEST_SMS_SAMPLES.length;
}
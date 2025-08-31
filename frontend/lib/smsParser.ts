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
  // State Bank of India (SBI) - Multiple variations
  {
    bank: 'SBI',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|deducted|received).*?(?:to|from|at|by)\s*([A-Za-z0-9\s@]+?)(?:\s+on\s+|\s+at\s+|\.|\s+Ref)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },
  
  // HDFC Bank - Enhanced patterns
  {
    bank: 'HDFC',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|deducted|received).*?(?:to|from|at|by)\s*([A-Za-z0-9\s@]+?)(?:\s+on\s+|\.|UPI|Ref)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },
  
  // ICICI Bank - Multiple formats
  {
    bank: 'ICICI',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|spent|received).*?(?:to|from|at|by)\s*([A-Za-z0-9\s@]+?)(?:\s+on\s+|\.|TxnId|Ref)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },
  
  // Axis Bank
  {
    bank: 'AXIS',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|deducted|received).*?(?:to|from|at|by)\s*([A-Za-z0-9\s@]+?)(?:\s+on\s+|\.|TID|Ref)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },
  
  // Kotak Mahindra Bank
  {
    bank: 'KOTAK',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|spent|received).*?(?:to|from|at|by)\s*([A-Za-z0-9\s@]+?)(?:\s+on\s+|\.|TxnRef|Ref)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },

  // Punjab National Bank (PNB)
  {
    bank: 'PNB',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|deducted|received).*?(?:to|from|at|by)\s*([A-Za-z0-9\s@]+?)(?:\s+on\s+|\.|Ref|TXN)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },

  // Bank of Baroda (BOB)
  {
    bank: 'BOB',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|deducted|received).*?(?:to|from|at|by)\s*([A-Za-z0-9\s@]+?)(?:\s+on\s+|\.|Ref)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },

  // YES Bank
  {
    bank: 'YES',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|deducted|received).*?(?:to|from|at|by)\s*([A-Za-z0-9\s@]+?)(?:\s+on\s+|\.|Ref|TXN)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },

  // IDFC First Bank
  {
    bank: 'IDFC',
    pattern: /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been\s*)?(debited|credited|deducted|received).*?(?:to|from|at|by)\s*([A-Za-z0-9\s@]+?)(?:\s+on\s+|\.|Ref)/i,
    amountGroup: 1,
    typeGroup: 2,
    merchantGroup: 3,
    refGroup: 4
  },
  
  // PhonePe - Enhanced patterns
  {
    bank: 'PhonePe',
    pattern: /(?:You\s*(?:paid|sent|received))\s*(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:to|from)\s*([A-Za-z0-9\s@._-]+?)(?:\s+via|\s+using|\.|UPI)/i,
    amountGroup: 1,
    typeGroup: 0, // Will be determined by context
    merchantGroup: 2,
    refGroup: 3
  },
  
  // Google Pay (GPay) - Enhanced patterns
  {
    bank: 'GPay',
    pattern: /(?:You\s*(?:paid|sent|received))\s*₹\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:to|from)\s*([A-Za-z0-9\s@._-]+?)(?:\s+via|\s+using|\.|UPI)/i,
    amountGroup: 1,
    typeGroup: 0, // Will be determined by context
    merchantGroup: 2,
    refGroup: 3
  },
  
  // Paytm - Enhanced patterns
  {
    bank: 'Paytm',
    pattern: /(?:Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:paid|sent|received|debited|credited)\s*(?:to|from|via)\s*([A-Za-z0-9\s@._-]+?)(?:\s+via|\.|Order|Txn)/i,
    amountGroup: 1,
    typeGroup: 0, // Will be determined by context
    merchantGroup: 2,
    refGroup: 3
  },

  // Amazon Pay
  {
    bank: 'AMAZON',
    pattern: /(?:Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:paid|debited|credited|charged)\s*(?:to|from|via|for)\s*([A-Za-z0-9\s@._-]+?)(?:\s+via|\.|Order|Ref)/i,
    amountGroup: 1,
    typeGroup: 0,
    merchantGroup: 2,
    refGroup: 3
  },

  // Mobikwik
  {
    bank: 'MOBIKW',
    pattern: /(?:Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:paid|sent|received|debited|credited)\s*(?:to|from|via)\s*([A-Za-z0-9\s@._-]+?)(?:\s+via|\.|Txn)/i,
    amountGroup: 1,
    typeGroup: 0,
    merchantGroup: 2,
    refGroup: 3
  },

  // Freecharge
  {
    bank: 'FREECH',
    pattern: /(?:Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:paid|sent|received|debited|credited)\s*(?:to|from|via)\s*([A-Za-z0-9\s@._-]+?)(?:\s+via|\.|Order)/i,
    amountGroup: 1,
    typeGroup: 0,
    merchantGroup: 2,
    refGroup: 3
  },
  
  // BHIM UPI - Enhanced
  {
    bank: 'BHIM',
    pattern: /(?:Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:paid|sent|received|debited|credited)\s*(?:to|from)\s*([A-Za-z0-9\s@._-]+?)(?:\s+via|\.|UPI\s*Ref)/i,
    amountGroup: 1,
    typeGroup: 0,
    merchantGroup: 2,
    refGroup: 3
  },

  // UPI Generic Pattern (catches most UPI transactions)
  {
    bank: 'UPI',
    pattern: /(?:Rs\.?|₹|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:paid|sent|received|debited|credited|transferred)\s*(?:to|from|via)\s*([A-Za-z0-9\s@._-]+?)(?:\s+via|\.|UPI|Ref)/i,
    amountGroup: 1,
    typeGroup: 0,
    merchantGroup: 2,
    refGroup: 3
  },
  
  // Alternative wordings - "debited by", "credited by"
  {
    bank: 'ALT_BY',
    pattern: /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:debited|credited|deducted|received)\s*(?:by|from)\s*([A-Za-z0-9\s@._-]+?)(?:\s+on|\s+at|\.|Ref)/i,
    amountGroup: 1,
    typeGroup: 0,
    merchantGroup: 2,
    refGroup: 3
  },

  // Card transactions
  {
    bank: 'CARD',
    pattern: /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:spent|charged|debited)\s*(?:at|on|via)\s*([A-Za-z0-9\s@._-]+?)(?:\s+using|\s+on|\.|Card)/i,
    amountGroup: 1,
    typeGroup: 0,
    merchantGroup: 2,
    refGroup: 3
  },

  // ATM transactions
  {
    bank: 'ATM',
    pattern: /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:withdrawn|debited)\s*(?:from|at)\s*([A-Za-z0-9\s._-]+?)(?:\s+ATM|\s+on|\.|Ref)/i,
    amountGroup: 1,
    typeGroup: 0,
    merchantGroup: 2,
    refGroup: 3
  },
  
  // Generic Bank Pattern (Enhanced Fallback)
  {
    bank: 'Generic',
    pattern: /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(debited|credited|deducted|received|paid|sent|spent|charged|withdrawn).*?(?:to|from|at|by|via)\s*([A-Za-z0-9\s@._-]+?)(?:\s+on|\s+at|\s+via|\.|Ref|UPI|Txn)/i,
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
 * Comprehensive test cases for SMS parsing - targeting 90%+ accuracy
 */
export const TEST_SMS_SAMPLES = [
  // Traditional Bank Formats
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
    bank: 'ICICI',
    sms: 'INR 2000.00 credited to A/C **9876 on 31-Aug-24 from SALARY CREDIT. TxnId: 987654321. Available balance: INR 15000.',
    expected: { amount: 2000, type: 'credit', merchant: 'SALARY CREDIT', category: 'Other' }
  },
  {
    bank: 'AXIS',
    sms: 'Rs.750.00 debited by UBER INDIA from your A/C **2345 on 31-Aug-24. TID: AXI123456789. Available Bal: Rs.12500.',
    expected: { amount: 750, type: 'debit', merchant: 'UBER INDIA', category: 'Transport' }
  },
  {
    bank: 'KOTAK',
    sms: 'Rs.300.00 has been spent at STARBUCKS on 31-Aug-24 using your Kotak Card **9876. TxnRef: KOT987654.',
    expected: { amount: 300, type: 'debit', merchant: 'STARBUCKS', category: 'Food' }
  },

  // UPI Service Formats
  {
    bank: 'PhonePe',
    sms: 'You paid Rs.350 to Uber India via UPI. UPI transaction ID: 424242424242. Thank you for using PhonePe!',
    expected: { amount: 350, type: 'debit', merchant: 'Uber India', category: 'Transport' }
  },
  {
    bank: 'GPay',
    sms: 'You sent ₹800 to john.doe@paytm via Google Pay. UPI transaction ID: 123456789012. Keep your transactions secure.',
    expected: { amount: 800, type: 'debit', merchant: 'john doe paytm', category: 'Other' }
  },
  {
    bank: 'Paytm',
    sms: 'Rs.450 paid to DOMINOS PIZZA via Paytm UPI. Order ID: PTM789456123. Thank you for using Paytm.',
    expected: { amount: 450, type: 'debit', merchant: 'DOMINOS PIZZA', category: 'Food' }
  },

  // Alternative Wordings
  {
    bank: 'PNB',
    sms: 'Rs.2500.00 debited by FLIPKART from your PNB A/C **1111 on 31-Aug-24. TXN: PNB654321098.',
    expected: { amount: 2500, type: 'debit', merchant: 'FLIPKART', category: 'Shopping' }
  },
  {
    bank: 'YES',
    sms: 'INR 150.00 charged at McDONALDS using YES Bank Card **8888 on 31-Aug-24. Ref: YES147258369.',
    expected: { amount: 150, type: 'debit', merchant: 'McDONALDS', category: 'Food' }
  },

  // Card Transactions
  {
    bank: 'HDFC',
    sms: 'Rs.850.00 spent on NETFLIX SUBSCRIPTION using HDFC Card **4567 on 31-Aug-24. Ref: HDC852741963.',
    expected: { amount: 850, type: 'debit', merchant: 'NETFLIX SUBSCRIPTION', category: 'Entertainment' }
  },

  // ATM Transactions  
  {
    bank: 'SBI',
    sms: 'Rs.5000.00 withdrawn from SBI ATM on 31-Aug-24. A/C **1234. Location: CONNAUGHT PLACE. Ref: ATM963852741.',
    expected: { amount: 5000, type: 'debit', merchant: 'SBI ATM', category: 'Cash' }
  },

  // Bill Payments
  {
    bank: 'ICICI',
    sms: 'Rs.1800.00 debited for ELECTRICITY BILL via ICICI iMobile on 31-Aug-24. Ref: PWR456789123.',
    expected: { amount: 1800, type: 'debit', merchant: 'ELECTRICITY BILL', category: 'Bills' }
  },

  // Refunds
  {
    bank: 'AXIS',
    sms: 'Rs.200.00 credited to your A/C **5555 as REFUND FROM AMAZON on 31-Aug-24. TID: REF789654123.',
    expected: { amount: 200, type: 'credit', merchant: 'REFUND FROM AMAZON', category: 'Shopping' }
  },

  // Money Transfer
  {
    bank: 'BHIM',
    sms: '₹1500 received from raj.kumar@paytm via BHIM UPI on 31-Aug-24. UPI Ref: BHM147852369.',
    expected: { amount: 1500, type: 'credit', merchant: 'raj kumar paytm', category: 'Other' }
  },

  // Investment
  {
    bank: 'ZERODHA',
    sms: 'Rs.10000.00 debited from your A/C **7890 for MUTUAL FUND SIP on 31-Aug-24. Ref: MF159753486.',
    expected: { amount: 10000, type: 'debit', merchant: 'MUTUAL FUND SIP', category: 'Investment' }
  },

  // Healthcare
  {
    bank: 'GPay',
    sms: 'You paid ₹500 to APOLLO PHARMACY via Google Pay UPI. Transaction ID: AP987654321. Stay healthy!',
    expected: { amount: 500, type: 'debit', merchant: 'APOLLO PHARMACY', category: 'Healthcare' }
  },

  // Travel
  {
    bank: 'PhonePe',
    sms: 'You paid Rs.8500 to INDIGO AIRLINES via PhonePe UPI. Booking Ref: 6E123456. Have a safe journey!',
    expected: { amount: 8500, type: 'debit', merchant: 'INDIGO AIRLINES', category: 'Travel' }
  },

  // Fuel
  {
    bank: 'HDFC',
    sms: 'Rs.2000.00 debited from A/C **3456 at HP PETROL PUMP on 31-Aug-24. Card **9876. Ref: FUEL741852.',
    expected: { amount: 2000, type: 'debit', merchant: 'HP PETROL PUMP', category: 'Transport' }
  },

  // Subscription
  {
    bank: 'ICICI',
    sms: 'Rs.199.00 auto-debited for SPOTIFY PREMIUM on 31-Aug-24 from A/C **6789. Ref: SPT159357486.',
    expected: { amount: 199, type: 'debit', merchant: 'SPOTIFY PREMIUM', category: 'Entertainment' }
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
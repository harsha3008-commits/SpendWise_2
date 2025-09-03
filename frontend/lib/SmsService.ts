/**
 * SMS Background Service for Automatic Transaction Detection
 * Handles SMS permissions, background listening, and transaction parsing
 */

import { Platform, PermissionsAndroid, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseSMS, ParsedTransaction } from './smsParser';
import { storageService } from './storage';

export interface SmsMessage {
  body: string;
  address: string; // sender
  date: number;
  type?: number;
}

export interface SmsServiceConfig {
  isEnabled: boolean;
  autoCategorizationEnabled: boolean;
  notificationEnabled: boolean;
  lastProcessedSmsDate: number;
}

class SmsBackgroundService {
  private isInitialized = false;
  private config: SmsServiceConfig = {
    isEnabled: false,
    autoCategorizationEnabled: true,
    notificationEnabled: true,
    lastProcessedSmsDate: 0,
  };
  private listeners: Array<(transaction: ParsedTransaction) => void> = [];
  private smsListener: any = null;

  /**
   * Initialize SMS service and check permissions
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Load config from storage
      await this.loadConfig();

      if (Platform.OS === 'android') {
        const hasPermissions = await this.checkAndRequestPermissions();
        
        if (hasPermissions && this.config.isEnabled) {
          await this.startSmsListener();
        }
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing SMS service:', error);
      return false;
    }
  }

  /**
   * Check and request SMS permissions for Android
   */
  async checkAndRequestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('SMS permissions not available on iOS');
      return false;
    }

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      ];

      // Check if permissions are already granted
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      
      if (granted) {
        console.log('SMS permissions already granted');
        return true;
      }

      // Request permissions
      const results = await PermissionsAndroid.requestMultiple(permissions);
      
      const allGranted = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );

      if (allGranted) {
        console.log('SMS permissions granted by user');
        return true;
      } else {
        console.log('SMS permissions denied by user');
        await this.showPermissionDeniedDialog();
        return false;
      }
    } catch (error) {
      console.error('Error requesting SMS permissions:', error);
      return false;
    }
  }

  /**
   * Show dialog when permissions are denied
   */
  private async showPermissionDeniedDialog() {
    Alert.alert(
      'SMS Permission Required',
      'SpendWise needs SMS access to automatically detect and categorize your transactions from bank messages.\n\nYou can still add transactions manually, but automatic detection will not work.',
      [
        { text: 'Manual Entry Only', style: 'cancel' },
        { text: 'Open Settings', onPress: () => this.openAppSettings() }
      ]
    );
  }

  /**
   * Open app settings for manual permission grant
   */
  private openAppSettings() {
    // For React Native, we would use a library like react-native-open-settings
    // For now, show instruction
    Alert.alert(
      'Enable SMS Permission',
      'Please go to Settings > Apps > SpendWise > Permissions and enable SMS access.',
      [{ text: 'OK' }]
    );
  }

  /**
   * Start SMS listener service
   */
  async startSmsListener(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('SMS listener not available on iOS');
      return false;
    }

    try {
      // For React Native, we would use a library like react-native-sms-android
      // This is a conceptual implementation
      
      console.log('🎯 Starting SMS listener for transaction detection');
      
      // Simulate SMS listener using a mock implementation
      // In production, this would use react-native-sms-android or similar
      this.smsListener = await this.mockSmsListener();

      if (this.smsListener) {
        console.log('✅ SMS listener started successfully');
        return true;
      } else {
        console.error('❌ Failed to start SMS listener');
        return false;
      }
    } catch (error) {
      console.error('Error starting SMS listener:', error);
      return false;
    }
  }

  /**
   * Mock SMS listener for development/testing
   * In production, this would be replaced with actual SMS listener
   */
  private async mockSmsListener() {
    console.log('📱 Mock SMS listener active (for development)');
    
    // Simulate receiving SMS messages for testing
    setTimeout(() => {
      this.processMockSms();
    }, 5000);

    return { active: true };
  }

  /**
   * Process mock SMS for testing
   */
  private processMockSms() {
    const mockSmsMessages = [
      {
        body: 'Dear Customer, Rs.1250.00 debited from A/C **1234 on 31-Aug-24 to SWIGGY at 14:30. Ref: SWG123456789. SMS HELP to 567676.',
        address: 'SBI',
        date: Date.now(),
      },
      {
        body: 'You paid ₹450 to Uber India via PhonePe UPI. Transaction ID: 424242424242. Thank you for using PhonePe!',
        address: 'PhonePe',
        date: Date.now() + 1000,
      },
      {
        body: 'Rs.2500.00 has been debited from your HDFC A/C **5678 on 31-Aug-24 to Amazon Pay. UPI Ref No: AMZ987654321.',
        address: 'HDFC',
        date: Date.now() + 2000,
      }
    ];

    mockSmsMessages.forEach((sms, index) => {
      setTimeout(() => {
        console.log(`📨 Mock SMS ${index + 1} received:`, sms.body.substring(0, 50) + '...');
        this.processSmsMessage(sms);
      }, index * 3000);
    });
  }

  /**
   * Process incoming SMS message
   */
  private async processSmsMessage(sms: SmsMessage) {
    try {
      console.log('🔍 Processing SMS from:', sms.address);
      
      // Skip if already processed
      if (sms.date <= this.config.lastProcessedSmsDate) {
        return;
      }

      // Parse SMS for transaction data
      const parsedTransaction = parseSMS(sms.body, sms.address);

      if (parsedTransaction.isValid) {
        console.log('✅ Valid transaction detected:', {
          amount: parsedTransaction.amount,
          type: parsedTransaction.type,
          merchant: parsedTransaction.merchant,
          category: parsedTransaction.category
        });

        // Store transaction
        await this.storeTransaction(parsedTransaction);

        // Notify listeners
        this.notifyListeners(parsedTransaction);

        // Update last processed date
        await this.updateLastProcessedDate(sms.date);

        // Show notification if enabled
        if (this.config.notificationEnabled) {
          await this.showTransactionNotification(parsedTransaction);
        }
      } else {
        console.log('❌ Invalid or non-financial SMS, skipping');
      }
    } catch (error) {
      console.error('Error processing SMS message:', error);
    }
  }

  /**
   * Store parsed transaction to local database
   */
  private async storeTransaction(transaction: ParsedTransaction): Promise<string> {
    try {
      const transactionId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const transactionData = {
        id: transactionId,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        description: `${transaction.merchant} (SMS Auto-detected)`,
        date: transaction.date.toISOString(),
        isAutoDetected: true,
        smsReference: transaction.reference,
        accountNumber: transaction.accountNumber,
        rawSms: transaction.rawSms,
        createdAt: new Date().toISOString(),
      };

      // Store using existing storage service
      await storageService.storeTransaction(transactionData);
      
      console.log('💾 Transaction stored with ID:', transactionId);
      return transactionId;
    } catch (error) {
      console.error('Error storing transaction:', error);
      throw error;
    }
  }

  /**
   * Show notification for new transaction
   */
  private async showTransactionNotification(transaction: ParsedTransaction) {
    // In production, this would use react-native-push-notification or similar
    const icon = transaction.type === 'debit' ? '💸' : '💰';
    const message = `${icon} ${transaction.type === 'debit' ? 'Spent' : 'Received'} ₹${transaction.amount} at ${transaction.merchant}`;
    
    console.log('🔔 Transaction notification:', message);
    
    // For mobile app, you would show a local notification
    // For now, we'll log it
    Alert.alert('Transaction Detected', message);
  }

  /**
   * Add listener for new transactions
   */
  addTransactionListener(callback: (transaction: ParsedTransaction) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all listeners of new transaction
   */
  private notifyListeners(transaction: ParsedTransaction) {
    this.listeners.forEach(listener => {
      try {
        listener(transaction);
      } catch (error) {
        console.error('Error in transaction listener:', error);
      }
    });
  }

  /**
   * Enable SMS service
   */
  async enable(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'SMS Auto-Detection',
        'SMS transaction detection is only available on Android devices. iOS users can manually add transactions or use the share feature.',
        [{ text: 'OK' }]
      );
      return false;
    }

    const hasPermissions = await this.checkAndRequestPermissions();
    
    if (hasPermissions) {
      this.config.isEnabled = true;
      await this.saveConfig();
      await this.startSmsListener();
      
      Alert.alert(
        'SMS Auto-Detection Enabled',
        'SpendWise will now automatically detect transactions from your bank SMS messages.',
        [{ text: 'OK' }]
      );
      
      return true;
    }
    
    return false;
  }

  /**
   * Disable SMS service
   */
  async disable(): Promise<void> {
    this.config.isEnabled = false;
    await this.saveConfig();
    
    if (this.smsListener) {
      // Stop listener (implementation depends on the library used)
      this.smsListener = null;
    }
    
    console.log('📵 SMS service disabled');
  }

  /**
   * Get current service status
   */
  isEnabled(): boolean {
    return this.config.isEnabled;
  }

  /**
   * Get service configuration
   */
  getConfig(): SmsServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  async updateConfig(updates: Partial<SmsServiceConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      // Check if we're in a web environment
      if (typeof window !== 'undefined' && window.localStorage) {
        // Use localStorage for web
        const configStr = window.localStorage.getItem('@sms_service_config');
        if (configStr) {
          this.config = { ...this.config, ...JSON.parse(configStr) };
        }
      } else {
        // Use AsyncStorage for React Native
        const AsyncStorage = require('@react-native-async-storage/async-storage');
        const configStr = await AsyncStorage.getItem('@sms_service_config');
        if (configStr) {
          this.config = { ...this.config, ...JSON.parse(configStr) };
        }
      }
    } catch (error) {
      console.error('Error loading SMS service config:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private async saveConfig(): Promise<void> {
    try {
      // Check if we're in a web environment
      if (typeof window !== 'undefined' && window.localStorage) {
        // Use localStorage for web
        window.localStorage.setItem('@sms_service_config', JSON.stringify(this.config));
      } else {
        // Use AsyncStorage for React Native
        const AsyncStorage = require('@react-native-async-storage/async-storage');
        await AsyncStorage.setItem('@sms_service_config', JSON.stringify(this.config));
      }
    } catch (error) {
      console.error('Error saving SMS service config:', error);
    }
  }

  /**
   * Update last processed SMS date
   */
  private async updateLastProcessedDate(date: number): Promise<void> {
    this.config.lastProcessedSmsDate = date;
    await this.saveConfig();
  }

  /**
   * Get transaction statistics
   */
  async getStats(): Promise<{ total: number; autoDetected: number; lastDetected?: string }> {
    try {
      const transactions = await storageService.getAllTransactions();
      const autoDetected = transactions.filter(t => (t as any).isAutoDetected);
      
      return {
        total: transactions.length,
        autoDetected: autoDetected.length,
        lastDetected: autoDetected[0]?.createdAt,
      };
    } catch (error) {
      console.error('Error getting SMS stats:', error);
      return { total: 0, autoDetected: 0 };
    }
  }

  /**
   * Manually test SMS parsing
   */
  async testSmsMessage(smsBody: string, sender: string): Promise<ParsedTransaction> {
    return parseSMS(smsBody, sender);
  }
}

// Export singleton instance
export const smsService = new SmsBackgroundService();

// Auto-initialize on app start
AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState === 'active') {
    smsService.initialize().catch(console.error);
  }
});

// Initialize immediately
smsService.initialize().catch(console.error);
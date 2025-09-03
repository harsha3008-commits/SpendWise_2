import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalSearchParams } from 'expo-router';
import { transactionAPI } from '../lib/api';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  categoryId: string;
  note: string;
  description: string;
  date: string;
  timestamp: number;
  isAutoDetected?: boolean;
  smsReference?: string;
  merchant?: string;
  user_id?: string;
  currentHash?: string;
  previousHash?: string;
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingTransaction, setAddingTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: '',
    description: '',
    merchant: '',
  });

  const { theme } = useTheme();
  const params = useLocalSearchParams();

  const categories = [
    '🍽️ Food & Dining',
    '🚗 Transportation', 
    '🛍️ Shopping',
    '🎬 Entertainment',
    '📋 Bills & Utilities',
    '🏥 Healthcare',
    '💼 Salary',
    '📈 Investment',
    '🎁 Gift',
    '📝 Other'
  ];

  useEffect(() => {
    loadTransactions();
    
    // Initialize SMS service for auto-detection
    initializeSMSService();
    
    // Pre-fill form if type is specified in URL params
    if (params.type && (params.type === 'expense' || params.type === 'income')) {
      setNewTransaction(prev => ({ ...prev, type: params.type as 'expense' | 'income' }));
      setShowAddModal(true);
    }
  }, [params]);

  const initializeSMSService = async () => {
    try {
      await smsService.initialize();
      
      // Listen for new SMS transactions
      smsService.addTransactionListener((parsedTransaction) => {
        console.log('New SMS transaction in transactions screen:', parsedTransaction);
        // Refresh transactions when new SMS transaction is detected
        loadTransactions();
      });
    } catch (error) {
      console.error('Failed to initialize SMS service in transactions:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionAPI.getAll(0, 50);
      
      // Transform backend data to match frontend interface
      const transformedTransactions = data.map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        category: tx.categoryId || 'Other',
        categoryId: tx.categoryId,
        note: tx.note || '',
        description: tx.note || tx.merchant || `${tx.type} transaction`,
        date: new Date(tx.timestamp).toISOString(),
        timestamp: tx.timestamp,
        merchant: tx.merchant,
        user_id: tx.user_id,
        currentHash: tx.currentHash,
        previousHash: tx.previousHash,
        isAutoDetected: tx.isAutoDetected || false,
      }));
      
      setTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Show mock data if API fails
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          type: 'expense',
          amount: 250,
          category: '🍽️ Food & Dining',
          categoryId: 'food',
          note: 'Lunch at cafe',
          description: 'Lunch at cafe',
          date: new Date().toISOString(),
          timestamp: Date.now(),
          merchant: 'Café Central',
        },
        {
          id: '2',
          type: 'income',
          amount: 5000,
          category: '💼 Salary',
          categoryId: 'salary',
          note: 'Monthly salary',
          description: 'Monthly salary',
          date: new Date(Date.now() - 86400000).toISOString(),
          timestamp: Date.now() - 86400000,
        },
      ];
      setTransactions(mockTransactions);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const addTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.category || !newTransaction.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setAddingTransaction(true);

      const transactionData = {
        type: newTransaction.type,
        amount: parseFloat(newTransaction.amount),
        currency: 'INR',
        categoryId: newTransaction.category.toLowerCase().replace(/[^a-z0-9]/g, ''),
        note: newTransaction.description,
        merchant: newTransaction.merchant || undefined,
        timestamp: Date.now(),
      };

      const savedTransaction = await transactionAPI.create(transactionData);
      
      // Refresh the transactions list
      await loadTransactions();
      
      // Reset form
      setNewTransaction({
        type: 'expense',
        amount: '',
        category: '',
        description: '',
        merchant: '',
      });
      
      setShowAddModal(false);
      Alert.alert('Success', 'Transaction added successfully!');
      
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction. Please try again.');
    } finally {
      setAddingTransaction(false);
    }
  };

  const renderTransaction = (transaction: Transaction) => (
    <TouchableOpacity key={transaction.id} style={[styles.transactionItem, { backgroundColor: theme.colors.card }]}>
      <View style={[styles.transactionIcon, { backgroundColor: theme.colors.background }]}>
        <Ionicons 
          name={transaction.type === 'income' ? 'arrow-up' : 'arrow-down'} 
          size={20} 
          color={transaction.type === 'income' ? theme.colors.income : theme.colors.expense} 
        />
        {transaction.isAutoDetected && (
          <View style={styles.autoDetectedBadge}>
            <Ionicons name="flash" size={8} color={theme.colors.warning} />
          </View>
        )}
      </View>
      <View style={styles.transactionDetails}>
        <View style={styles.transactionHeader}>
          <Text style={[styles.transactionCategory, { color: theme.colors.text }]}>{transaction.category}</Text>
          {transaction.isAutoDetected && (
            <View style={styles.autoDetectedLabel}>
              <Text style={styles.autoDetectedText}>SMS</Text>
            </View>
          )}
        </View>
        <Text style={[styles.transactionDescription, { color: theme.colors.textSecondary }]}>{transaction.description}</Text>
        {transaction.merchant && (
          <Text style={[styles.transactionMerchant, { color: theme.colors.textSecondary }]}>{transaction.merchant}</Text>
        )}
        <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
          {format(new Date(transaction.date), 'MMM dd, yyyy • hh:mm a')}
        </Text>
        {transaction.currentHash && (
          <Text style={[styles.transactionHash, { color: theme.colors.info }]}>
            🔗 {transaction.currentHash.substring(0, 8)}...
          </Text>
        )}
      </View>
      <Text style={[
        styles.transactionAmount,
        { color: transaction.type === 'income' ? theme.colors.income : theme.colors.expense }
      ]}>
        {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toFixed(0)}
      </Text>
    </TouchableOpacity>
  );

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading transactions...
            </Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={60} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No transactions yet</Text>
            <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
              Add your first transaction or enable SMS auto-detection in Settings to get started
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyStateButtonText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            <View style={styles.transactionsHeader}>
              <Text style={[styles.transactionsTitle, { color: theme.colors.text }]}>
                Recent Transactions ({transactions.length})
              </Text>
              <TouchableOpacity style={styles.filterButton}>
                <Ionicons name="filter" size={16} color={theme.colors.primary} />
                <Text style={[styles.filterText, { color: theme.colors.primary }]}>Filter</Text>
              </TouchableOpacity>
            </View>
            {transactions.map(renderTransaction)}
          </View>
        )}
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
          
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Transaction</Text>
            <TouchableOpacity onPress={addTransaction} disabled={addingTransaction}>
              {addingTransaction ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Transaction Type */}
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Type</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  newTransaction.type === 'expense' && { backgroundColor: theme.colors.expense, borderColor: theme.colors.expense }
                ]}
                onPress={() => setNewTransaction({...newTransaction, type: 'expense'})}
              >
                <Ionicons name="remove" size={16} color={newTransaction.type === 'expense' ? 'white' : theme.colors.expense} />
                <Text style={[
                  styles.typeButtonText,
                  { color: theme.colors.text },
                  newTransaction.type === 'expense' && { color: 'white' }
                ]}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  newTransaction.type === 'income' && { backgroundColor: theme.colors.income, borderColor: theme.colors.income }
                ]}
                onPress={() => setNewTransaction({...newTransaction, type: 'income'})}
              >
                <Ionicons name="add" size={16} color={newTransaction.type === 'income' ? 'white' : theme.colors.income} />
                <Text style={[
                  styles.typeButtonText,
                  { color: theme.colors.text },
                  newTransaction.type === 'income' && { color: 'white' }
                ]}>Income</Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="₹0"
              placeholderTextColor={theme.colors.textSecondary}
              value={newTransaction.amount}
              onChangeText={(text) => setNewTransaction({...newTransaction, amount: text})}
              keyboardType="numeric"
            />

            {/* Category */}
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categorySelector}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                      newTransaction.category === category && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => setNewTransaction({...newTransaction, category})}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      { color: theme.colors.text },
                      newTransaction.category === category && { color: 'white' }
                    ]}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Description */}
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Description</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="What was this for?"
              placeholderTextColor={theme.colors.textSecondary}
              value={newTransaction.description}
              onChangeText={(text) => setNewTransaction({...newTransaction, description: text})}
            />

            {/* Merchant (Optional) */}
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Merchant (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Where did you spend?"
              placeholderTextColor={theme.colors.textSecondary}
              value={newTransaction.merchant}
              onChangeText={(text) => setNewTransaction({...newTransaction, merchant: text})}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: theme.colors.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsList: {
    padding: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 14,
    marginBottom: 2,
  },
  transactionMerchant: {
    fontSize: 12,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalCancel: {
    fontSize: 17,
    color: theme.colors.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 17,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.mode === 'dark' ? 'rgba(100, 210, 255, 0.1)' : 'rgba(0, 122, 255, 0.1)',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  autoDetectedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoDetectedLabel: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  autoDetectedText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  transactionHash: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
});
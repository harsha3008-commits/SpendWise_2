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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  merchant?: string;
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: '',
    description: '',
    merchant: '',
  });

  const { theme } = useTheme();

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
  }, []);

  const loadTransactions = () => {
    // Simulate loading transactions
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: 'expense',
        amount: 250,
        category: '🍽️ Food & Dining',
        description: 'Lunch at cafe',
        date: new Date().toISOString(),
        merchant: 'Café Central',
      },
      {
        id: '2',
        type: 'income',
        amount: 5000,
        category: '💼 Salary',
        description: 'Monthly salary',
        date: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    setTransactions(mockTransactions);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      loadTransactions();
      setRefreshing(false);
    }, 1000);
  };

  const addTransaction = () => {
    if (!newTransaction.amount || !newTransaction.category || !newTransaction.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: newTransaction.type,
      amount: parseFloat(newTransaction.amount),
      category: newTransaction.category,
      description: newTransaction.description,
      date: new Date().toISOString(),
      merchant: newTransaction.merchant || undefined,
    };

    setTransactions([transaction, ...transactions]);
    setNewTransaction({
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      merchant: '',
    });
    setShowAddModal(false);
    Alert.alert('Success', 'Transaction added successfully!');
  };

  const renderTransaction = (transaction: Transaction) => (
    <TouchableOpacity key={transaction.id} style={[styles.transactionItem, { backgroundColor: theme.colors.card }]}>
      <View style={[styles.transactionIcon, { backgroundColor: theme.colors.background }]}>
        <Ionicons 
          name={transaction.type === 'income' ? 'arrow-up' : 'arrow-down'} 
          size={20} 
          color={transaction.type === 'income' ? theme.colors.income : theme.colors.expense} 
        />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={[styles.transactionCategory, { color: theme.colors.text }]}>{transaction.category}</Text>
        <Text style={[styles.transactionDescription, { color: theme.colors.textSecondary }]}>{transaction.description}</Text>
        {transaction.merchant && (
          <Text style={[styles.transactionMerchant, { color: theme.colors.textSecondary }]}>{transaction.merchant}</Text>
        )}
        <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
          {format(new Date(transaction.date), 'MMM dd, yyyy • hh:mm a')}
        </Text>
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
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={60} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No transactions yet</Text>
            <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
              Add your first transaction to get started with tracking your finances
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
            <TouchableOpacity onPress={addTransaction}>
              <Text style={styles.modalSave}>Save</Text>
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
});
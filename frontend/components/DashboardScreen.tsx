import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { analyticsAPI, transactionAPI } from '../lib/api';
import { router } from 'expo-router';
import { smsService } from '../lib/SmsService';

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netWorth: number;
  transactionCount: number;
}

interface QuickTransaction {
  type: 'income' | 'expense' | 'bill';
  amount: string;
  category: string;
  description: string;
  merchant?: string;
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netWorth: 0,
    transactionCount: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [quickTransaction, setQuickTransaction] = useState<QuickTransaction | null>(null);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);

  const { user, logout } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    loadDashboardData();
    initializeSmsService();
  }, []);

  const initializeSmsService = async () => {
    try {
      await smsService.initialize();
      
      // Listen for new SMS transactions
      smsService.addTransactionListener((parsedTransaction) => {
        console.log('New SMS transaction detected:', parsedTransaction);
        // Refresh dashboard data when new transaction is detected
        loadDashboardData();
        
        // Show notification to user
        Alert.alert(
          '💰 Transaction Detected!',
          `${parsedTransaction.type === 'credit' ? 'Income' : 'Expense'} of ₹${parsedTransaction.amount} detected from SMS`,
          [
            { text: 'View', onPress: () => router.push('/transactions') },
            { text: 'OK' }
          ]
        );
      });
    } catch (error) {
      console.error('Failed to initialize SMS service:', error);
    }
  };

  const loadDashboardData = async () => {
    setIsLoadingStats(true);
    try {
      // Load analytics summary
      const analyticsData = await analyticsAPI.getSummary();
      
      setStats({
        totalIncome: analyticsData.totalIncome || 0,
        totalExpenses: analyticsData.totalExpenses || 0,
        netWorth: analyticsData.netWorth || 0,
        transactionCount: analyticsData.transactionCount || 0
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Don't show error alert for failed API calls
      // Keep the default zero values
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleQuickAction = (actionType: 'expense' | 'income' | 'bills' | 'analytics') => {
    switch (actionType) {
      case 'expense':
        router.push('/transactions?type=expense');
        break;
      case 'income':
        router.push('/transactions?type=income');
        break;
      case 'bills':
        router.push('/bills');
        break;
      case 'analytics':
        router.push('/analytics');
        break;
    }
  };

  const quickAddTransaction = async (type: 'expense' | 'income') => {
    try {
      setIsAddingTransaction(true);
      
      // Quick add with smart defaults
      const defaultCategories = {
        expense: '🍽️ Food & Dining',
        income: '💼 Salary'
      };
      
      const transactionData = {
        type: type,
        amount: 100, // Default amount
        currency: 'INR',
        categoryId: 'default-category',
        note: `Quick ${type} added from dashboard`,
        merchant: type === 'expense' ? 'Quick Add' : undefined,
        timestamp: Date.now()
      };

      const newTransaction = await transactionAPI.create(transactionData);
      
      Alert.alert(
        '✅ Success!',
        `₹100 ${type} added successfully`,
        [
          { text: 'View All', onPress: () => router.push('/transactions') },
          { text: 'OK', onPress: () => loadDashboardData() }
        ]
      );
      
    } catch (error) {
      console.error('Error adding quick transaction:', error);
      Alert.alert('Error', 'Failed to add transaction. Please try again.');
    } finally {
      setIsAddingTransaction(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const handleLogout = async () => {
    try {
      console.log('Logging out user...');
      await logout();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SpendWise</Text>
        <View style={styles.headerRight}>
          <View style={styles.ledgerBadge}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.ledgerText}>Verified</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Welcome */}
        <View style={styles.userSection}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          {isLoadingStats ? (
            <View style={styles.loadingStats}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingStatsText}>Loading financial data...</Text>
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <View style={[styles.statsCard, { borderLeftColor: theme.colors.income }]}>
                <Text style={styles.statsLabel}>This Month's Income</Text>
                <Text style={[styles.statsValue, { color: theme.colors.income }]}>
                  {formatCurrency(stats.totalIncome)}
                </Text>
              </View>
              
              <View style={[styles.statsCard, { borderLeftColor: theme.colors.expense }]}>
                <Text style={styles.statsLabel}>This Month's Expense</Text>
                <Text style={[styles.statsValue, { color: theme.colors.expense }]}>
                  {formatCurrency(stats.totalExpenses)}
                </Text>
              </View>
              
              <View style={[styles.statsCard, { borderLeftColor: theme.colors.info }]}>
                <Text style={styles.statsLabel}>Net Worth</Text>
                <Text style={[styles.statsValue, { color: stats.netWorth >= 0 ? theme.colors.success : theme.colors.error }]}>
                  {formatCurrency(stats.netWorth)}
                </Text>
              </View>

              <View style={[styles.statsCard, { borderLeftColor: theme.colors.warning }]}>
                <Text style={styles.statsLabel}>Total Transactions</Text>
                <Text style={[styles.statsValue, { color: theme.colors.info }]}>
                  {stats.transactionCount}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.colors.expense }]}>
              <Ionicons name="remove-circle" size={32} color="white" />
              <Text style={styles.actionCardText}>Add Expense</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.colors.income }]}>
              <Ionicons name="add-circle" size={32} color="white" />
              <Text style={styles.actionCardText}>Add Income</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.colors.warning }]}>
              <Ionicons name="card" size={32} color="white" />
              <Text style={styles.actionCardText}>Add Bill</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.colors.info }]}>
              <Ionicons name="bar-chart" size={32} color="white" />
              <Text style={styles.actionCardText}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.sectionTitle}>Welcome to SpendWise! 🎉</Text>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeContent}>
              <Ionicons name="shield-checkmark" size={48} color={theme.colors.primary} style={styles.welcomeIcon} />
              <Text style={styles.welcomeTitle}>Your secure finance app is ready!</Text>
              <Text style={styles.welcomeDescription}>
                {stats.transactionCount > 0 
                  ? `You have ${stats.transactionCount} transactions tracked securely with blockchain verification.`
                  : 'Start by adding your first transaction to begin tracking your finances securely.'
                }
              </Text>
              
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                  <Text style={styles.featureText}>JWT Authentication Active</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                  <Text style={styles.featureText}>Blockchain-verified transactions</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                  <Text style={styles.featureText}>End-to-end encrypted data</Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.getStartedSmallButton}>
                <Text style={styles.getStartedSmallButtonText}>
                  {stats.transactionCount > 0 ? 'View Transactions' : 'Add First Transaction'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: theme.colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ledgerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ledgerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollView: {
    flex: 1,
  },
  userSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statsSection: {
    padding: 16,
  },
  loadingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingStatsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  statsGrid: {
    gap: 16,
  },
  statsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
  },
  statsLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  statsValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  quickActionsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    aspectRatio: 1.2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionCardText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  welcomeSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  welcomeCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeIcon: {
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  featuresList: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  getStartedSmallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.mode === 'dark' ? 'rgba(100, 210, 255, 0.2)' : '#E3F2FD',
    borderRadius: 20,
    gap: 8,
  },
  getStartedSmallButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
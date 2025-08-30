import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Transaction, Budget, Bill, AnalyticsData } from '../types';
import { 
  getTransactions, 
  getBudgets, 
  getBills, 
  getSettings 
} from '../lib/storage';
import { verifyLedger } from '../lib/ledger';
import { format, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns';

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netWorth: number;
  unpaidBills: number;
  ledgerStatus: 'verified' | 'tampered' | 'checking';
}

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netWorth: 0,
    unpaidBills: 0,
    ledgerStatus: 'checking'
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<Budget[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState('INR');

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      const [transactions, budgets, bills, settings] = await Promise.all([
        getTransactions(),
        getBudgets(),
        getBills(),
        getSettings()
      ]);

      setCurrency(settings.currency);
      
      // Calculate current month stats
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const currentMonthTxs = transactions.filter(tx => 
        tx.timestamp >= monthStart.getTime() && 
        tx.timestamp <= monthEnd.getTime()
      );

      const totalIncome = currentMonthTxs
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalExpenses = currentMonthTxs
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const unpaidBillsCount = bills.filter(bill => !bill.isPaid).length;

      // Verify ledger integrity
      const ledgerResult = await verifyLedger();

      setStats({
        totalIncome,
        totalExpenses,
        netWorth: totalIncome - totalExpenses,
        unpaidBills: unpaidBillsCount,
        ledgerStatus: ledgerResult.ok ? 'verified' : 'tampered'
      });

      // Get recent transactions (last 5)
      const recent = transactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
      setRecentTransactions(recent);

      // Get upcoming bills (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const upcoming = bills.filter(bill => 
        !bill.isPaid && 
        bill.dueDate <= nextWeek.getTime()
      ).sort((a, b) => a.dueDate - b.dueDate);
      setUpcomingBills(upcoming);

      // Check budget alerts (over 80% used)
      const alerts = budgets.filter(budget => {
        if (!budget.isActive) return false;
        
        const budgetExpenses = currentMonthTxs
          .filter(tx => 
            tx.type === 'expense' && 
            budget.categoryIds.includes(tx.categoryId)
          )
          .reduce((sum, tx) => sum + tx.amount, 0);

        return (budgetExpenses / budget.amount) > 0.8;
      });
      setBudgetAlerts(alerts);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderStatsCard = (
    title: string, 
    value: string, 
    icon: string, 
    color: string,
    trend?: 'up' | 'down'
  ) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        {trend && (
          <Ionicons 
            name={trend === 'up' ? 'trending-up' : 'trending-down'} 
            size={16} 
            color={trend === 'up' ? '#10B981' : '#EF4444'} 
          />
        )}
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  );

  const renderLedgerStatus = () => (
    <View style={[
      styles.ledgerStatus, 
      { backgroundColor: stats.ledgerStatus === 'verified' ? '#064E3B' : '#7F1D1D' }
    ]}>
      <Ionicons 
        name={stats.ledgerStatus === 'verified' ? 'checkmark-circle' : 'alert-circle'} 
        size={16} 
        color={stats.ledgerStatus === 'verified' ? '#10B981' : '#EF4444'} 
      />
      <Text style={[
        styles.ledgerStatusText,
        { color: stats.ledgerStatus === 'verified' ? '#10B981' : '#EF4444' }
      ]}>
        Ledger {stats.ledgerStatus === 'verified' ? 'Verified' : 'Tampered'}
      </Text>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</Text>
          <Text style={styles.headerTitle}>SpendWise</Text>
        </View>
        <View style={styles.headerActions}>
          {renderLedgerStatus()}
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/settings' as any)}
          >
            <Ionicons name="settings-outline" size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        {renderStatsCard(
          'Income This Month',
          formatCurrency(stats.totalIncome),
          'trending-up',
          '#10B981',
          'up'
        )}
        {renderStatsCard(
          'Expenses This Month',
          formatCurrency(stats.totalExpenses),
          'trending-down',
          '#EF4444',
          'down'
        )}
        {renderStatsCard(
          'Net Worth',
          formatCurrency(stats.netWorth),
          stats.netWorth >= 0 ? 'wallet' : 'alert-triangle',
          stats.netWorth >= 0 ? '#10B981' : '#F59E0B'
        )}
        {renderStatsCard(
          'Unpaid Bills',
          stats.unpaidBills.toString(),
          'receipt',
          '#F59E0B'
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => router.push('/add-transaction?type=expense' as any)}
          >
            <Ionicons name="remove-circle" size={24} color="white" />
            <Text style={styles.actionButtonText}>Add Expense</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
            onPress={() => router.push('/add-transaction?type=income' as any)}
          >
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.actionButtonText}>Add Income</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
            onPress={() => router.push('/add-bill' as any)}
          >
            <Ionicons name="calendar" size={24} color="white" />
            <Text style={styles.actionButtonText}>Add Bill</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
            onPress={() => router.push('/analytics' as any)}
          >
            <Ionicons name="bar-chart" size={24} color="white" />
            <Text style={styles.actionButtonText}>Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/transactions' as any)}>
              <Text style={styles.sectionAction}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentTransactions.map((transaction) => (
            <TouchableOpacity 
              key={transaction.id}
              style={styles.transactionItem}
              onPress={() => router.push(`/transaction-detail/${transaction.id}` as any)}
            >
              <View style={styles.transactionIcon}>
                <Ionicons 
                  name={transaction.type === 'income' ? 'arrow-up' : 'arrow-down'} 
                  size={16} 
                  color={transaction.type === 'income' ? '#10B981' : '#EF4444'} 
                />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>
                  {transaction.merchant || transaction.note || 'Transaction'}
                </Text>
                <Text style={styles.transactionDate}>
                  {format(new Date(transaction.timestamp), 'MMM dd, yyyy')}
                </Text>
              </View>
              <Text style={[
                styles.transactionAmount,
                { color: transaction.type === 'income' ? '#10B981' : '#EF4444' }
              ]}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Upcoming Bills */}
      {upcomingBills.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bills</Text>
            <TouchableOpacity onPress={() => router.push('/bills' as any)}>
              <Text style={styles.sectionAction}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingBills.map((bill) => (
            <View key={bill.id} style={styles.billItem}>
              <View style={styles.billIcon}>
                <Ionicons name="receipt" size={16} color="#F59E0B" />
              </View>
              <View style={styles.billDetails}>
                <Text style={styles.billTitle}>{bill.name}</Text>
                <Text style={styles.billDate}>
                  Due {format(new Date(bill.dueDate), 'MMM dd')}
                </Text>
              </View>
              <Text style={styles.billAmount}>
                {formatCurrency(bill.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Alerts</Text>
          {budgetAlerts.map((budget) => (
            <View key={budget.id} style={styles.alertItem}>
              <Ionicons name="warning" size={16} color="#F59E0B" />
              <Text style={styles.alertText}>
                "{budget.name}" budget is nearly exhausted
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#94A3B8',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ledgerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ledgerStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingsButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  quickActions: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionAction: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 14,
    color: '#94A3B8',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 8,
  },
  billIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  billDetails: {
    flex: 1,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  billDate: {
    fontSize: 14,
    color: '#F59E0B',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  alertText: {
    fontSize: 14,
    color: '#F1F5F9',
    marginLeft: 12,
  },
});
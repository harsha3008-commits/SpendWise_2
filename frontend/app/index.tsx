import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashboardScreen() {
  const [appState, setAppState] = useState<'loading' | 'onboarding' | 'dashboard'>('loading');
  const [stats, setStats] = useState({
    income: 0,
    expenses: 0,
    netWorth: 0,
    unpaidBills: 0
  });

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      const initialized = await AsyncStorage.getItem('spendwise_initialized');
      if (!initialized) {
        setAppState('onboarding');
      } else {
        setAppState('dashboard');
      }
    } catch (error) {
      console.error('Error checking app state:', error);
      setAppState('onboarding');
    }
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('spendwise_initialized', 'true');
      setAppState('dashboard');
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (appState === 'onboarding') {
    return (
      <View style={styles.onboardingContainer}>
        <StatusBar style="light" />
        <View style={styles.onboardingContent}>
          <Ionicons name="shield-checkmark" size={80} color="#10B981" style={styles.onboardingIcon} />
          <Text style={styles.onboardingTitle}>SpendWise</Text>
          <Text style={styles.onboardingSubtitle}>
            Privacy-First Finance Management
          </Text>
          <Text style={styles.onboardingDescription}>
            • All data encrypted locally on your device{'\n'}
            • Blockchain-style transaction verification{'\n'}
            • No data sent to external servers{'\n'}
            • You control your financial privacy
          </Text>
          
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SpendWise</Text>
        <View style={styles.headerRight}>
          <View style={styles.ledgerBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.ledgerText}>Verified</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={[styles.statsCard, styles.incomeCard]}>
              <Text style={styles.statsLabel}>This Month's Income</Text>
              <Text style={[styles.statsValue, { color: '#34C759' }]}>
                {formatCurrency(stats.income)}
              </Text>
            </View>
            
            <View style={[styles.statsCard, styles.expenseCard]}>
              <Text style={styles.statsLabel}>This Month's Expense</Text>
              <Text style={[styles.statsValue, { color: '#FF3B30' }]}>
                {formatCurrency(stats.expenses)}
              </Text>
            </View>
            
            <View style={[styles.statsCard, styles.netWorthCard]}>
              <Text style={styles.statsLabel}>Net Worth</Text>
              <Text style={[styles.statsValue, { color: '#34C759' }]}>
                {formatCurrency(stats.netWorth)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#FF3B30' }]}>
              <Ionicons name="remove-circle" size={32} color="white" />
              <Text style={styles.actionCardText}>Add Expense</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#34C759' }]}>
              <Ionicons name="add-circle" size={32} color="white" />
              <Text style={styles.actionCardText}>Add Income</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#FF9500' }]}>
              <Ionicons name="card" size={32} color="white" />
              <Text style={styles.actionCardText}>Add Bill</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#007AFF' }]}>
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
              <Ionicons name="rocket" size={48} color="#007AFF" style={styles.welcomeIcon} />
              <Text style={styles.welcomeTitle}>Your privacy-first finance app is ready!</Text>
              <Text style={styles.welcomeDescription}>
                Start by adding your first transaction to begin tracking your finances securely.
              </Text>
              
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.featureText}>All data encrypted locally</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.featureText}>Blockchain-verified transactions</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.featureText}>Complete financial privacy</Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.getStartedSmallButton}>
                <Text style={styles.getStartedSmallButtonText}>Add First Transaction</Text>
                <Ionicons name="arrow-forward" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  onboardingContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  onboardingContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingIcon: {
    marginBottom: 24,
  },
  onboardingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 8,
  },
  onboardingSubtitle: {
    fontSize: 18,
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 24,
  },
  onboardingDescription: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  getStartedButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
    alignItems: 'center',
  },
  getStartedButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  ledgerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ledgerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  scrollView: {
    flex: 1,
  },
  statsSection: {
    padding: 16,
  },
  statsGrid: {
    gap: 16,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
  },
  incomeCard: {
    borderLeftColor: '#34C759',
  },
  expenseCard: {
    borderLeftColor: '#FF3B30',
  },
  netWorthCard: {
    borderLeftColor: '#007AFF',
  },
  statsLabel: {
    fontSize: 14,
    color: '#8E8E93',
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
    color: '#000',
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
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
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#666',
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
    color: '#666',
  },
  getStartedSmallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    gap: 8,
  },
  getStartedSmallButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});
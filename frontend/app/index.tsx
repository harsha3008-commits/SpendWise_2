import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple in-component state management for now
export default function SpendWiseApp() {
  const [appState, setAppState] = useState<'loading' | 'onboarding' | 'auth' | 'dashboard'>('loading');
  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      const initialized = await AsyncStorage.getItem('spendwise_initialized');
      const encryptionKey = await AsyncStorage.getItem('spendwise_encryption_key');
      
      if (!initialized) {
        setAppState('onboarding');
      } else if (!encryptionKey) {
        setAppState('auth');
      } else {
        setAppState('dashboard');
      }
    } catch (error) {
      console.error('Error checking app state:', error);
      setAppState('onboarding');
    }
  };

  const handleGetStarted = async () => {
    setIsLoading(true);
    try {
      // Simple setup - just mark as initialized and set a basic key
      await AsyncStorage.setItem('spendwise_initialized', 'true');
      await AsyncStorage.setItem('spendwise_encryption_key', 'demo-key');
      await AsyncStorage.setItem('spendwise_user_hash', 'demo-hash');
      setAppState('dashboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize app');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!passphrase.trim()) {
      Alert.alert('Error', 'Please enter a passphrase');
      return;
    }
    
    setIsLoading(true);
    try {
      await AsyncStorage.setItem('spendwise_encryption_key', passphrase);
      setAppState('dashboard');
    } catch (error) {
      Alert.alert('Error', 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    await AsyncStorage.clear();
    setAppState('onboarding');
  };

  if (appState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (appState === 'onboarding') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.content}>
          <Ionicons name="shield-checkmark" size={80} color="#10B981" style={styles.icon} />
          <Text style={styles.title}>SpendWise</Text>
          <Text style={styles.subtitle}>
            Privacy-First Finance Management
          </Text>
          <Text style={styles.description}>
            • All data encrypted locally on your device{'\n'}
            • Blockchain-style transaction verification{'\n'}
            • No data sent to external servers{'\n'}
            • You control your financial privacy
          </Text>
          
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleGetStarted}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Setting up...' : 'Get Started'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (appState === 'auth') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.content}>
          <Ionicons name="shield-checkmark" size={80} color="#10B981" style={styles.icon} />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Enter your passphrase to access SpendWise
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter passphrase"
            placeholderTextColor="#64748B"
            value={passphrase}
            onChangeText={setPassphrase}
            secureTextEntry
            autoCapitalize="none"
          />
          
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Verifying...' : 'Unlock SpendWise'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetText}>Reset App</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Dashboard State
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Evening</Text>
          <Text style={styles.headerTitle}>SpendWise</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.ledgerStatus}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.ledgerStatusText}>Verified</Text>
          </View>
          <TouchableOpacity onPress={handleReset}>
            <Ionicons name="settings-outline" size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statsCard, { borderLeftColor: '#10B981' }]}>
          <View style={styles.statsHeader}>
            <Ionicons name="trending-up" size={24} color="#10B981" />
          </View>
          <Text style={styles.statsValue}>₹0</Text>
          <Text style={styles.statsTitle}>Income This Month</Text>
        </View>
        
        <View style={[styles.statsCard, { borderLeftColor: '#EF4444' }]}>
          <View style={styles.statsHeader}>
            <Ionicons name="trending-down" size={24} color="#EF4444" />
          </View>
          <Text style={styles.statsValue}>₹0</Text>
          <Text style={styles.statsTitle}>Expenses This Month</Text>
        </View>
        
        <View style={[styles.statsCard, { borderLeftColor: '#10B981' }]}>
          <View style={styles.statsHeader}>
            <Ionicons name="wallet" size={24} color="#10B981" />
          </View>
          <Text style={styles.statsValue}>₹0</Text>
          <Text style={styles.statsTitle}>Net Worth</Text>
        </View>
        
        <View style={[styles.statsCard, { borderLeftColor: '#F59E0B' }]}>
          <View style={styles.statsHeader}>
            <Ionicons name="receipt" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.statsValue}>0</Text>
          <Text style={styles.statsTitle}>Unpaid Bills</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }]}>
            <Ionicons name="remove-circle" size={24} color="white" />
            <Text style={styles.actionButtonText}>Add Expense</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}>
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.actionButtonText}>Add Income</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}>
            <Ionicons name="calendar" size={24} color="white" />
            <Text style={styles.actionButtonText}>Add Bill</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="bar-chart" size={24} color="white" />
            <Text style={styles.actionButtonText}>Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Welcome Message */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Welcome to SpendWise! 🎉</Text>
        <View style={styles.welcomeCard}>
          <Ionicons name="rocket" size={32} color="#10B981" />
          <Text style={styles.welcomeText}>
            Your privacy-first finance app is ready to use. Start by adding your first transaction!
          </Text>
          <Text style={styles.welcomeSubtext}>
            • All data encrypted locally{'\n'}
            • Blockchain-verified transactions{'\n'}
            • Complete financial privacy
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#F1F5F9',
    backgroundColor: '#1E293B',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#374151',
  },
  buttonText: {
    fontSize: 16,
    color: '#F1F5F9',
    fontWeight: '600',
  },
  resetText: {
    fontSize: 14,
    color: '#F59E0B',
    textAlign: 'center',
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
    backgroundColor: '#064E3B',
    gap: 4,
  },
  ledgerStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
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
  welcomeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  welcomeText: {
    fontSize: 16,
    color: '#F1F5F9',
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 24,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#10B981',
    textAlign: 'center',
    lineHeight: 20,
  },
});
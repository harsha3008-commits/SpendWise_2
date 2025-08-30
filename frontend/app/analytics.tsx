import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function AnalyticsScreen() {
  const [isPremium, setIsPremium] = useState(false);
  const { theme } = useTheme();

  const handleUpgrade = () => {
    Alert.alert(
      'Upgrade to Premium',
      'Unlock advanced analytics features including recurring transaction detection, cashflow forecasting, and detailed insights.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => setIsPremium(true) }
      ]
    );
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financial Analytics</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* This Month's Summary */}
        <View style={styles.summaryCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>This Month's Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Income</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.income }]}>₹0</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Expenses</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.expense }]}>₹0</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Net</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>₹0</Text>
            </View>
          </View>
        </View>

        {/* Basic Analytics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Analytics</Text>
          
          <View style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Monthly Trend</Text>
            <View style={[styles.chartPlaceholder, { backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F8F9FA' }]}>
              <Ionicons name="bar-chart" size={60} color={theme.colors.textSecondary} />
              <Text style={[styles.chartPlaceholderText, { color: theme.colors.textSecondary }]}>Bar Chart</Text>
              <Text style={[styles.chartSubtext, { color: theme.colors.textSecondary }]}>Interactive charts coming soon</Text>
            </View>
            
            <View style={styles.monthlyData}>
              <View style={styles.monthRow}>
                <Text style={[styles.monthLabel, { color: theme.colors.textSecondary }]}>Mar</Text>
                <Text style={[styles.monthValue, { color: theme.colors.text }]}>₹0</Text>
              </View>
              <View style={styles.monthRow}>
                <Text style={[styles.monthLabel, { color: theme.colors.textSecondary }]}>Apr</Text>
                <Text style={[styles.monthValue, { color: theme.colors.text }]}>₹0</Text>
              </View>
              <View style={styles.monthRow}>
                <Text style={[styles.monthLabel, { color: theme.colors.textSecondary }]}>May</Text>
                <Text style={[styles.monthValue, { color: theme.colors.text }]}>₹0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Advanced Analytics */}
        <View style={styles.section}>
          <View style={styles.premiumHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Advanced Analytics</Text>
            {!isPremium && (
              <TouchableOpacity style={[styles.upgradeButton, { backgroundColor: theme.mode === 'dark' ? 'rgba(255, 149, 0, 0.2)' : '#FFF3CD' }]} onPress={handleUpgrade}>
                <Ionicons name="diamond" size={16} color={theme.colors.warning} />
                <Text style={[styles.upgradeButtonText, { color: theme.colors.warning }]}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.premiumCard, !isPremium && styles.premiumCardLocked]}>
            <View style={styles.premiumFeatureHeader}>
              <Ionicons name="diamond" size={24} color={theme.colors.warning} />
              <Text style={[styles.premiumFeatureTitle, { color: theme.colors.text }]}>Recurring Transaction Detection</Text>
            </View>
            <Text style={[styles.premiumFeatureDescription, { color: theme.colors.textSecondary }]}>
              Automatically identify and track your recurring expenses and income
            </Text>
            
            {!isPremium && (
              <View style={[styles.premiumOverlay, { backgroundColor: theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)' }]}>
                <Ionicons name="lock-closed" size={30} color={theme.colors.textSecondary} />
                <Text style={[styles.premiumOverlayText, { color: theme.colors.textSecondary }]}>Premium Feature</Text>
              </View>
            )}

            {isPremium && (
              <View style={styles.recurringList}>
                <View style={[styles.recurringItem, { backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F8F9FA' }]}>
                  <Text style={[styles.recurringName, { color: theme.colors.text }]}>Monthly Rent</Text>
                  <Text style={[styles.recurringAmount, { color: theme.colors.expense }]}>₹15,000</Text>
                </View>
                <View style={[styles.recurringItem, { backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F8F9FA' }]}>
                  <Text style={[styles.recurringName, { color: theme.colors.text }]}>Netflix Subscription</Text>
                  <Text style={[styles.recurringAmount, { color: theme.colors.expense }]}>₹649</Text>
                </View>
              </View>
            )}
          </View>

          {/* Additional Premium Features */}
          {isPremium ? (
            <>
              <View style={styles.premiumCard}>
                <Text style={[styles.premiumFeatureTitle, { color: theme.colors.text }]}>Cashflow Forecast</Text>
                <Text style={[styles.premiumFeatureDescription, { color: theme.colors.textSecondary }]}>
                  Predict your financial position for the next 3 months
                </Text>
                <View style={styles.forecastChart}>
                  <Ionicons name="trending-up" size={40} color={theme.colors.success} />
                  <Text style={[styles.forecastText, { color: theme.colors.success }]}>Positive trend expected</Text>
                </View>
              </View>

              <View style={styles.premiumCard}>
                <Text style={[styles.premiumFeatureTitle, { color: theme.colors.text }]}>Spending Insights</Text>
                <Text style={[styles.premiumFeatureDescription, { color: theme.colors.textSecondary }]}>
                  AI-powered analysis of your spending patterns
                </Text>
                <View style={styles.insightsList}>
                  <Text style={[styles.insightItem, { color: theme.colors.textSecondary }]}>• Food expenses increased 15% this month</Text>
                  <Text style={[styles.insightItem, { color: theme.colors.textSecondary }]}>• Consider setting a budget for entertainment</Text>
                  <Text style={[styles.insightItem, { color: theme.colors.textSecondary }]}>• Good job staying within transportation budget!</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={[styles.premiumCard, styles.premiumCardLocked]}>
              <Text style={[styles.premiumFeatureTitle, { color: theme.colors.text }]}>More Premium Features</Text>
              <Text style={[styles.premiumFeatureDescription, { color: theme.colors.textSecondary }]}>
                • Cashflow forecasting{'\n'}
                • AI spending insights{'\n'}
                • Custom date ranges{'\n'}
                • Export detailed reports{'\n'}
                • Advanced filtering
              </Text>
              <View style={[styles.premiumOverlay, { backgroundColor: theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)' }]}>
                <TouchableOpacity style={[styles.upgradeButtonLarge, { backgroundColor: theme.colors.primary }]} onPress={handleUpgrade}>
                  <Text style={styles.upgradeButtonLargeText}>Upgrade to Premium</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Category Breakdown</Text>
          <View style={styles.categoryCard}>
            <View style={styles.emptyState}>
              <Ionicons name="pie-chart-outline" size={60} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No data to display</Text>
              <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
                Add some transactions to see your spending breakdown
              </Text>
            </View>
          </View>
        </View>
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
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: theme.colors.card,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 12,
    marginBottom: 20,
  },
  chartPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  chartSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  monthlyData: {
    gap: 8,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  monthLabel: {
    fontSize: 14,
  },
  monthValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  premiumCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  premiumCardLocked: {
    opacity: 0.7,
  },
  premiumFeatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  premiumFeatureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  premiumFeatureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  premiumOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  premiumOverlayText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  upgradeButtonLarge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
  },
  upgradeButtonLargeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  recurringList: {
    marginTop: 16,
    gap: 8,
  },
  recurringItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  recurringName: {
    fontSize: 14,
  },
  recurringAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  forecastChart: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 16,
  },
  forecastText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  insightsList: {
    marginTop: 16,
    gap: 8,
  },
  insightItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  categoryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
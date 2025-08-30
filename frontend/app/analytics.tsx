import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AnalyticsScreen() {
  const [isPremium, setIsPremium] = useState(false);

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financial Analytics</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* This Month's Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>This Month's Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Income</Text>
              <Text style={[styles.summaryValue, { color: '#34C759' }]}>₹0</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>₹0</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net</Text>
              <Text style={[styles.summaryValue, { color: '#34C759' }]}>₹0</Text>
            </View>
          </View>
        </View>

        {/* Basic Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Analytics</Text>
          
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Monthly Trend</Text>
            <View style={styles.chartPlaceholder}>
              <Ionicons name="bar-chart" size={60} color="#C7C7CC" />
              <Text style={styles.chartPlaceholderText}>Bar Chart</Text>
              <Text style={styles.chartSubtext}>Interactive charts coming soon</Text>
            </View>
            
            <View style={styles.monthlyData}>
              <View style={styles.monthRow}>
                <Text style={styles.monthLabel}>Mar</Text>
                <Text style={styles.monthValue}>₹0</Text>
              </View>
              <View style={styles.monthRow}>
                <Text style={styles.monthLabel}>Apr</Text>
                <Text style={styles.monthValue}>₹0</Text>
              </View>
              <View style={styles.monthRow}>
                <Text style={styles.monthLabel}>May</Text>
                <Text style={styles.monthValue}>₹0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Advanced Analytics */}
        <View style={styles.section}>
          <View style={styles.premiumHeader}>
            <Text style={styles.sectionTitle}>Advanced Analytics</Text>
            {!isPremium && (
              <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
                <Ionicons name="diamond" size={16} color="#FF9500" />
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.premiumCard, !isPremium && styles.premiumCardLocked]}>
            <View style={styles.premiumFeatureHeader}>
              <Ionicons name="diamond" size={24} color="#FF9500" />
              <Text style={styles.premiumFeatureTitle}>Recurring Transaction Detection</Text>
            </View>
            <Text style={styles.premiumFeatureDescription}>
              Automatically identify and track your recurring expenses and income
            </Text>
            
            {!isPremium && (
              <View style={styles.premiumOverlay}>
                <Ionicons name="lock-closed" size={30} color="#8E8E93" />
                <Text style={styles.premiumOverlayText}>Premium Feature</Text>
              </View>
            )}

            {isPremium && (
              <View style={styles.recurringList}>
                <View style={styles.recurringItem}>
                  <Text style={styles.recurringName}>Monthly Rent</Text>
                  <Text style={styles.recurringAmount}>₹15,000</Text>
                </View>
                <View style={styles.recurringItem}>
                  <Text style={styles.recurringName}>Netflix Subscription</Text>
                  <Text style={styles.recurringAmount}>₹649</Text>
                </View>
              </View>
            )}
          </View>

          {/* Additional Premium Features */}
          {isPremium ? (
            <>
              <View style={styles.premiumCard}>
                <Text style={styles.premiumFeatureTitle}>Cashflow Forecast</Text>
                <Text style={styles.premiumFeatureDescription}>
                  Predict your financial position for the next 3 months
                </Text>
                <View style={styles.forecastChart}>
                  <Ionicons name="trending-up" size={40} color="#34C759" />
                  <Text style={styles.forecastText}>Positive trend expected</Text>
                </View>
              </View>

              <View style={styles.premiumCard}>
                <Text style={styles.premiumFeatureTitle}>Spending Insights</Text>
                <Text style={styles.premiumFeatureDescription}>
                  AI-powered analysis of your spending patterns
                </Text>
                <View style={styles.insightsList}>
                  <Text style={styles.insightItem}>• Food expenses increased 15% this month</Text>
                  <Text style={styles.insightItem}>• Consider setting a budget for entertainment</Text>
                  <Text style={styles.insightItem}>• Good job staying within transportation budget!</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={[styles.premiumCard, styles.premiumCardLocked]}>
              <Text style={styles.premiumFeatureTitle}>More Premium Features</Text>
              <Text style={styles.premiumFeatureDescription}>
                • Cashflow forecasting{'\n'}
                • AI spending insights{'\n'}
                • Custom date ranges{'\n'}
                • Export detailed reports{'\n'}
                • Advanced filtering
              </Text>
              <View style={styles.premiumOverlay}>
                <TouchableOpacity style={styles.upgradeButtonLarge} onPress={handleUpgrade}>
                  <Text style={styles.upgradeButtonLargeText}>Upgrade to Premium</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <View style={styles.categoryCard}>
            <View style={styles.emptyState}>
              <Ionicons name="pie-chart-outline" size={60} color="#8E8E93" />
              <Text style={styles.emptyStateTitle}>No data to display</Text>
              <Text style={styles.emptyStateSubtitle}>
                Add some transactions to see your spending breakdown
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
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
    color: '#8E8E93',
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
    color: '#000',
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
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  chartPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    marginBottom: 20,
  },
  chartPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 8,
  },
  chartSubtext: {
    fontSize: 12,
    color: '#C7C7CC',
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
    color: '#666',
  },
  monthValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  premiumCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
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
    color: '#000',
  },
  premiumFeatureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  premiumOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  premiumOverlayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 8,
  },
  upgradeButtonLarge: {
    backgroundColor: '#007AFF',
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
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  recurringName: {
    fontSize: 14,
    color: '#000',
  },
  recurringAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  forecastChart: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 16,
  },
  forecastText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
    marginTop: 8,
  },
  insightsList: {
    marginTop: 16,
    gap: 8,
  },
  insightItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
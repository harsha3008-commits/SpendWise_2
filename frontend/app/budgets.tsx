import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  category: string;
  period: 'monthly' | 'weekly' | 'yearly';
}

export default function BudgetsScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBudget, setNewBudget] = useState({
    name: '',
    amount: '',
    category: '',
    period: 'monthly' as 'monthly' | 'weekly' | 'yearly',
  });

  const { theme } = useTheme();

  const categories = [
    '🍽️ Food & Dining',
    '🚗 Transportation', 
    '🛍️ Shopping',
    '🎬 Entertainment',
    '📋 Bills & Utilities',
    '🏥 Healthcare',
    '📝 Other'
  ];

  const addBudget = () => {
    if (!newBudget.name || !newBudget.amount || !newBudget.category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const budget: Budget = {
      id: Date.now().toString(),
      name: newBudget.name,
      amount: parseFloat(newBudget.amount),
      spent: 0,
      category: newBudget.category,
      period: newBudget.period,
    };

    setBudgets([budget, ...budgets]);
    setNewBudget({
      name: '',
      amount: '',
      category: '',
      period: 'monthly',
    });
    setShowAddModal(false);
    Alert.alert('Success', 'Budget created successfully!');
  };

  const getProgressColor = (percentage: number) => {
    if (percentage <= 60) return theme.colors.success;
    if (percentage <= 80) return theme.colors.warning;
    return theme.colors.error;
  };

  const renderBudget = (budget: Budget) => {
    const percentage = (budget.spent / budget.amount) * 100;
    const progressColor = getProgressColor(percentage);

    return (
      <View key={budget.id} style={[styles.budgetCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.budgetHeader}>
          <View>
            <Text style={[styles.budgetName, { color: theme.colors.text }]}>{budget.name}</Text>
            <Text style={[styles.budgetCategory, { color: theme.colors.textSecondary }]}>{budget.category}</Text>
          </View>
          <View style={styles.budgetAmounts}>
            <Text style={[styles.budgetSpent, { color: theme.colors.text }]}>₹{budget.spent.toFixed(0)}</Text>
            <Text style={[styles.budgetTotal, { color: theme.colors.textSecondary }]}>of ₹{budget.amount.toFixed(0)}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: progressColor
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: progressColor }]}>
            {percentage.toFixed(0)}%
          </Text>
        </View>

        <View style={styles.budgetFooter}>
          <Text style={[styles.budgetPeriod, { color: theme.colors.textSecondary }]}>
            {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} budget
          </Text>
          <Text style={[styles.budgetRemaining, { color: theme.colors.textSecondary }]}>
            ₹{(budget.amount - budget.spent).toFixed(0)} remaining
          </Text>
        </View>
      </View>
    );
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Budget Management</Text>
      </View>

      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Budget by Category</Text>
          <TouchableOpacity
            style={styles.addBudgetButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add-circle" size={20} color={theme.colors.primary} />
            <Text style={[styles.addBudgetText, { color: theme.colors.primary }]}>Add Budget</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="pie-chart-outline" size={80} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No budgets set</Text>
            <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
              Set budgets for your expense categories to track your spending
            </Text>
            <TouchableOpacity
              style={[styles.createFirstBudgetButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.createFirstBudgetText}>Create First Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.budgetsList}>
            {budgets.map(renderBudget)}
          </View>
        )}
      </ScrollView>

      {/* Add Budget Modal */}
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
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create Budget</Text>
            <TouchableOpacity onPress={addBudget}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Budget Name */}
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Budget Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="e.g., Monthly Food Budget"
              placeholderTextColor={theme.colors.textSecondary}
              value={newBudget.name}
              onChangeText={(text) => setNewBudget({...newBudget, name: text})}
            />

            {/* Amount */}
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Budget Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="₹0"
              placeholderTextColor={theme.colors.textSecondary}
              value={newBudget.amount}
              onChangeText={(text) => setNewBudget({...newBudget, amount: text})}
              keyboardType="numeric"
            />

            {/* Period */}
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Period</Text>
            <View style={styles.periodSelector}>
              {(['weekly', 'monthly', 'yearly'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                    newBudget.period === period && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                  ]}
                  onPress={() => setNewBudget({...newBudget, period})}
                >
                  <Text style={[
                    styles.periodButtonText,
                    { color: theme.colors.text },
                    newBudget.period === period && { color: 'white' }
                  ]}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
                      newBudget.category === category && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => setNewBudget({...newBudget, category})}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      { color: theme.colors.text },
                      newBudget.category === category && { color: 'white' }
                    ]}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
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
  headerSection: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addBudgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBudgetText: {
    fontSize: 16,
    fontWeight: '600',
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
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  createFirstBudgetButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  createFirstBudgetText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  budgetsList: {
    padding: 16,
  },
  budgetCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  budgetName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  budgetCategory: {
    fontSize: 14,
  },
  budgetAmounts: {
    alignItems: 'flex-end',
  },
  budgetSpent: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  budgetTotal: {
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetPeriod: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  budgetRemaining: {
    fontSize: 14,
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
  periodSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodButtonText: {
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
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
import { Ionicons } from '@expo/vector-icons';

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
    if (percentage <= 60) return '#34C759';
    if (percentage <= 80) return '#FF9500';
    return '#FF3B30';
  };

  const renderBudget = (budget: Budget) => {
    const percentage = (budget.spent / budget.amount) * 100;
    const progressColor = getProgressColor(percentage);

    return (
      <View key={budget.id} style={styles.budgetCard}>
        <View style={styles.budgetHeader}>
          <View>
            <Text style={styles.budgetName}>{budget.name}</Text>
            <Text style={styles.budgetCategory}>{budget.category}</Text>
          </View>
          <View style={styles.budgetAmounts}>
            <Text style={styles.budgetSpent}>₹{budget.spent.toFixed(0)}</Text>
            <Text style={styles.budgetTotal}>of ₹{budget.amount.toFixed(0)}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
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
          <Text style={styles.budgetPeriod}>
            {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} budget
          </Text>
          <Text style={styles.budgetRemaining}>
            ₹{(budget.amount - budget.spent).toFixed(0)} remaining
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Budget Management</Text>
      </View>

      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Budget by Category</Text>
          <TouchableOpacity
            style={styles.addBudgetButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add-circle" size={20} color="#007AFF" />
            <Text style={styles.addBudgetText}>Add Budget</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="pie-chart-outline" size={80} color="#C7C7CC" />
            </View>
            <Text style={styles.emptyStateTitle}>No budgets set</Text>
            <Text style={styles.emptyStateSubtitle}>
              Set budgets for your expense categories to track your spending
            </Text>
            <TouchableOpacity
              style={styles.createFirstBudgetButton}
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
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Budget</Text>
            <TouchableOpacity onPress={addBudget}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Budget Name */}
            <Text style={styles.inputLabel}>Budget Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Monthly Food Budget"
              value={newBudget.name}
              onChangeText={(text) => setNewBudget({...newBudget, name: text})}
            />

            {/* Amount */}
            <Text style={styles.inputLabel}>Budget Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="₹0"
              value={newBudget.amount}
              onChangeText={(text) => setNewBudget({...newBudget, amount: text})}
              keyboardType="numeric"
            />

            {/* Period */}
            <Text style={styles.inputLabel}>Period</Text>
            <View style={styles.periodSelector}>
              {(['weekly', 'monthly', 'yearly'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    newBudget.period === period && styles.periodButtonSelected
                  ]}
                  onPress={() => setNewBudget({...newBudget, period})}
                >
                  <Text style={[
                    styles.periodButtonText,
                    newBudget.period === period && styles.periodButtonTextSelected
                  ]}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categorySelector}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      newBudget.category === category && styles.categoryButtonSelected
                    ]}
                    onPress={() => setNewBudget({...newBudget, category})}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      newBudget.category === category && styles.categoryButtonTextSelected
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
  headerSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addBudgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBudgetText: {
    fontSize: 16,
    color: '#007AFF',
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
    color: '#000',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  createFirstBudgetButton: {
    backgroundColor: '#007AFF',
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
    color: '#000',
    marginBottom: 4,
  },
  budgetCategory: {
    fontSize: 14,
    color: '#666',
  },
  budgetAmounts: {
    alignItems: 'flex-end',
  },
  budgetSpent: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  budgetTotal: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#F2F2F7',
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
    color: '#8E8E93',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  budgetRemaining: {
    fontSize: 14,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
  },
  modalCancel: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalSave: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  periodButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  periodButtonTextSelected: {
    color: 'white',
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  categoryButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#000',
  },
  categoryButtonTextSelected: {
    color: 'white',
  },
});
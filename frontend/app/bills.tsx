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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, addMonths } from 'date-fns';

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  category: string;
  isRecurring: boolean;
  isPaid: boolean;
  reminderDays: number[];
}

export default function BillsScreen() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBill, setNewBill] = useState({
    name: '',
    amount: '',
    dueDate: new Date(),
    category: '',
    isRecurring: false,
    reminderDays: [7, 1],
  });

  const categories = [
    '📋 Bills & Utilities',
    '🏠 Rent/Mortgage',
    '📱 Phone/Internet',
    '⚡ Electricity',
    '💧 Water',
    '📺 Streaming Services',
    '🏥 Insurance',
    '📝 Other'
  ];

  const addBill = () => {
    if (!newBill.name || !newBill.amount || !newBill.category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const bill: Bill = {
      id: Date.now().toString(),
      name: newBill.name,
      amount: parseFloat(newBill.amount),
      dueDate: newBill.dueDate,
      category: newBill.category,
      isRecurring: newBill.isRecurring,
      isPaid: false,
      reminderDays: newBill.reminderDays,
    };

    setBills([bill, ...bills]);
    setNewBill({
      name: '',
      amount: '',
      dueDate: new Date(),
      category: '',
      isRecurring: false,
      reminderDays: [7, 1],
    });
    setShowAddModal(false);
    Alert.alert('Success', 'Bill added successfully!');
  };

  const markAsPaid = (billId: string) => {
    setBills(bills.map(bill => 
      bill.id === billId 
        ? { ...bill, isPaid: true, dueDate: bill.isRecurring ? addMonths(bill.dueDate, 1) : bill.dueDate }
        : bill
    ));
    Alert.alert('Success', 'Bill marked as paid!');
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getBillStatusColor = (bill: Bill) => {
    if (bill.isPaid) return '#34C759';
    const daysUntil = getDaysUntilDue(bill.dueDate);
    if (daysUntil < 0) return '#FF3B30'; // Overdue
    if (daysUntil <= 3) return '#FF9500'; // Due soon
    return '#007AFF'; // Normal
  };

  const getBillStatusText = (bill: Bill) => {
    if (bill.isPaid) return 'Paid';
    const daysUntil = getDaysUntilDue(bill.dueDate);
    if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)} days`;
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    return `Due in ${daysUntil} days`;
  };

  const upcomingBills = bills.filter(bill => !bill.isPaid && getDaysUntilDue(bill.dueDate) >= 0).length;

  const renderBill = (bill: Bill) => {
    const statusColor = getBillStatusColor(bill);
    const statusText = getBillStatusText(bill);

    return (
      <View key={bill.id} style={styles.billCard}>
        <View style={styles.billHeader}>
          <View style={styles.billInfo}>
            <Text style={styles.billName}>{bill.name}</Text>
            <Text style={styles.billCategory}>{bill.category}</Text>
            <Text style={styles.billDueDate}>
              Due {format(bill.dueDate, 'MMM dd, yyyy')}
            </Text>
          </View>
          <View style={styles.billAmountContainer}>
            <Text style={styles.billAmount}>₹{bill.amount.toFixed(0)}</Text>
            <Text style={[styles.billStatus, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>
        
        <View style={styles.billFooter}>
          <View style={styles.billTags}>
            {bill.isRecurring && (
              <View style={styles.recurringTag}>
                <Ionicons name="repeat" size={12} color="#007AFF" />
                <Text style={styles.recurringText}>Recurring</Text>
              </View>
            )}
          </View>
          
          {!bill.isPaid && (
            <TouchableOpacity
              style={[styles.payButton, { backgroundColor: statusColor }]}
              onPress={() => markAsPaid(bill.id)}
            >
              <Text style={styles.payButtonText}>Mark as Paid</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bills & Reminders</Text>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.statsTitle}>Upcoming Bills ({upcomingBills})</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {bills.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateSection}>
              <Ionicons name="receipt-outline" size={60} color="#C7C7CC" />
              <Text style={styles.emptyStateTitle}>No upcoming bills</Text>
              <Text style={styles.emptyStateSubtitle}>
                All your bills are up to date!
              </Text>
            </View>
            
            <View style={styles.emptyStateSection}>
              <Ionicons name="calendar-outline" size={60} color="#C7C7CC" />
              <Text style={styles.emptyStateTitle}>No bills yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Add your first bill to get started with reminders
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.billsList}>
            {bills
              .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
              .map(renderBill)}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Add Bill Modal */}
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
            <Text style={styles.modalTitle}>Add Bill</Text>
            <TouchableOpacity onPress={addBill}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Bill Name */}
            <Text style={styles.inputLabel}>Bill Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Electricity Bill"
              value={newBill.name}
              onChangeText={(text) => setNewBill({...newBill, name: text})}
            />

            {/* Amount */}
            <Text style={styles.inputLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="₹0"
              value={newBill.amount}
              onChangeText={(text) => setNewBill({...newBill, amount: text})}
              keyboardType="numeric"
            />

            {/* Category */}
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categorySelector}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      newBill.category === category && styles.categoryButtonSelected
                    ]}
                    onPress={() => setNewBill({...newBill, category})}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      newBill.category === category && styles.categoryButtonTextSelected
                    ]}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Due Date */}
            <Text style={styles.inputLabel}>Due Date</Text>
            <TouchableOpacity style={styles.dateButton}>
              <Text style={styles.dateButtonText}>
                {format(newBill.dueDate, 'MMM dd, yyyy')}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            </TouchableOpacity>

            {/* Recurring */}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.inputLabel}>Recurring Bill</Text>
                <Text style={styles.switchDescription}>
                  Automatically create next bill when marked as paid
                </Text>
              </View>
              <Switch
                value={newBill.isRecurring}
                onValueChange={(value) => setNewBill({...newBill, isRecurring: value})}
              />
            </View>

            {/* Reminder Settings */}
            <Text style={styles.inputLabel}>Reminder Days</Text>
            <Text style={styles.reminderDescription}>
              Get notified 7 days and 1 day before due date
            </Text>
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
  statsSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
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
  billsList: {
    padding: 16,
  },
  billCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  billCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  billDueDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  billAmountContainer: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  billStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billTags: {
    flexDirection: 'row',
  },
  recurringTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recurringText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  payButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  payButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  reminderDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
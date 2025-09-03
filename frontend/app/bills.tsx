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
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, addMonths, parseISO } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDateString, setTempDateString] = useState('');
  const [newBill, setNewBill] = useState({
    name: '',
    amount: '',
    dueDate: new Date(),
    category: '',
    isRecurring: false,
    reminderDays: [7, 1],
  });

  const { theme } = useTheme();

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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNewBill({ ...newBill, dueDate: selectedDate });
    }
  };

  const handleDateInputChange = (dateString: string) => {
    setTempDateString(dateString);
  };

  const handleDateConfirm = () => {
    try {
      const parsedDate = new Date(tempDateString);
      if (!isNaN(parsedDate.getTime()) && parsedDate >= new Date()) {
        setNewBill({ ...newBill, dueDate: parsedDate });
        setShowDatePicker(false);
        setTempDateString('');
      } else {
        Alert.alert('Invalid Date', 'Please enter a valid future date');
      }
    } catch (error) {
      Alert.alert('Invalid Date', 'Please enter a valid date');
    }
  };

  const showDatePickerModal = () => {
    setTempDateString(format(newBill.dueDate, 'yyyy-MM-dd'));
    setShowDatePicker(true);
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getBillStatusColor = (bill: Bill) => {
    if (bill.isPaid) return theme.colors.success;
    const daysUntil = getDaysUntilDue(bill.dueDate);
    if (daysUntil < 0) return theme.colors.error; // Overdue
    if (daysUntil <= 3) return theme.colors.warning; // Due soon
    return theme.colors.info; // Normal
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
      <View key={bill.id} style={[styles.billCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.billHeader}>
          <View style={styles.billInfo}>
            <Text style={[styles.billName, { color: theme.colors.text }]}>{bill.name}</Text>
            <Text style={[styles.billCategory, { color: theme.colors.textSecondary }]}>{bill.category}</Text>
            <Text style={[styles.billDueDate, { color: theme.colors.textSecondary }]}>
              Due {format(bill.dueDate, 'MMM dd, yyyy')}
            </Text>
          </View>
          <View style={styles.billAmountContainer}>
            <Text style={[styles.billAmount, { color: theme.colors.text }]}>₹{bill.amount.toFixed(0)}</Text>
            <Text style={[styles.billStatus, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>
        
        <View style={styles.billFooter}>
          <View style={styles.billTags}>
            {bill.isRecurring && (
              <View style={[styles.recurringTag, { backgroundColor: theme.mode === 'dark' ? 'rgba(100, 210, 255, 0.2)' : '#E3F2FD' }]}>
                <Ionicons name="repeat" size={12} color={theme.colors.primary} />
                <Text style={[styles.recurringText, { color: theme.colors.primary }]}>Recurring</Text>
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

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bills & Reminders</Text>
      </View>

      <View style={styles.statsSection}>
        <Text style={[styles.statsTitle, { color: theme.colors.text }]}>Upcoming Bills ({upcomingBills})</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {bills.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateSection}>
              <Ionicons name="receipt-outline" size={60} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No upcoming bills</Text>
              <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
                All your bills are up to date!
              </Text>
            </View>
            
            <View style={styles.emptyStateSection}>
              <Ionicons name="calendar-outline" size={60} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No bills yet</Text>
              <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
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
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
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
          <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
          
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Bill</Text>
            <TouchableOpacity onPress={addBill}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Bill Name */}
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Bill Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="e.g., Electricity Bill"
              placeholderTextColor={theme.colors.textSecondary}
              value={newBill.name}
              onChangeText={(text) => setNewBill({...newBill, name: text})}
            />

            {/* Amount */}
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="₹0"
              placeholderTextColor={theme.colors.textSecondary}
              value={newBill.amount}
              onChangeText={(text) => setNewBill({...newBill, amount: text})}
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
                      newBill.category === category && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => setNewBill({...newBill, category})}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      { color: theme.colors.text },
                      newBill.category === category && { color: 'white' }
                    ]}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Due Date */}
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Due Date</Text>
            <TouchableOpacity 
              style={[styles.dateButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={showDatePickerModal}
            >
              <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                {format(newBill.dueDate, 'MMM dd, yyyy')}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>

            {/* Date Picker Modal */}
            {showDatePicker && (
              <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={[styles.datePickerModal, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Due Date</Text>
                    
                    <TextInput
                      style={[styles.dateInput, { 
                        backgroundColor: theme.colors.background, 
                        borderColor: theme.colors.border,
                        color: theme.colors.text 
                      }]}
                      value={tempDateString}
                      onChangeText={handleDateInputChange}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                    
                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: theme.colors.textSecondary }]}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.modalButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleDateConfirm}
                      >
                        <Text style={styles.modalButtonText}>Confirm</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}

            {/* Recurring */}
            <View style={styles.switchRow}>
              <View>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Recurring Bill</Text>
                <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                  Automatically create next bill when marked as paid
                </Text>
              </View>
              <Switch
                value={newBill.isRecurring}
                onValueChange={(value) => setNewBill({...newBill, isRecurring: value})}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={newBill.isRecurring ? '#FFFFFF' : '#F4F3F4'}
              />
            </View>

            {/* Reminder Settings */}
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Reminder Days</Text>
            <Text style={[styles.reminderDescription, { color: theme.colors.textSecondary }]}>
              Get notified 7 days and 1 day before due date
            </Text>
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
  statsSection: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  billsList: {
    padding: 16,
  },
  billCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
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
    marginBottom: 4,
  },
  billCategory: {
    fontSize: 14,
    marginBottom: 4,
  },
  billDueDate: {
    fontSize: 14,
  },
  billAmountContainer: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: 20,
    fontWeight: 'bold',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recurringText: {
    fontSize: 12,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  switchDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  reminderDescription: {
    fontSize: 14,
    marginTop: 4,
  },
});
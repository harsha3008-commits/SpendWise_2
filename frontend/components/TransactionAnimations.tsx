/**
 * Transaction Animations and UI Components
 * Provides smooth animations and visual indicators for transactions
 */

import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface TransactionItemProps {
  transaction: {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    description: string;
    date: string;
    isAutoDetected?: boolean;
    smsReference?: string;
  };
  onPress?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onPress }) => {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      Food: 'restaurant',
      Shopping: 'bag',
      Transport: 'car',
      Entertainment: 'film',
      Bills: 'receipt',
      Healthcare: 'medical',
      Travel: 'airplane',
      Investment: 'trending-up',
      Cash: 'cash',
      Income: 'arrow-down-circle',
      Other: 'ellipse'
    };
    return icons[category] || 'ellipse';
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Food: '#FF6B6B',
      Shopping: '#4ECDC4',
      Transport: '#45B7D1',
      Entertainment: '#96CEB4',
      Bills: '#FECA57',
      Healthcare: '#FF9FF3',
      Travel: '#54A0FF',
      Investment: '#5F27CD',
      Cash: '#00D2D3',
      Income: '#10AC84',
      Other: '#C7ECEE'
    };
    return colors[category] || theme.colors.textSecondary;
  };

  const styles = createStyles(theme);

  return (
    <Animated.View 
      style={[
        styles.transactionItem,
        {
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.transactionContent}>
        {/* Category Icon */}
        <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(transaction.category) + '20' }]}>
          <Ionicons 
            name={getCategoryIcon(transaction.category) as any} 
            size={20} 
            color={getCategoryColor(transaction.category)} 
          />
        </View>

        {/* Transaction Details */}
        <View style={styles.transactionDetails}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionDescription} numberOfLines={1}>
              {transaction.description}
            </Text>
            
            {/* Auto-Detection Indicator */}
            <View style={styles.indicatorContainer}>
              {transaction.isAutoDetected ? (
                <View style={styles.autoDetectedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
                  <Text style={[styles.badgeText, { color: theme.colors.success }]}>Auto</Text>
                </View>
              ) : (
                <View style={styles.manualBadge}>
                  <Ionicons name="create" size={12} color={theme.colors.warning} />
                  <Text style={[styles.badgeText, { color: theme.colors.warning }]}>Manual</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.transactionMeta}>
            <Text style={styles.transactionCategory}>{transaction.category}</Text>
            <Text style={styles.transactionDate}>
              {new Date(transaction.date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={[
            styles.transactionAmount,
            { color: transaction.type === 'income' ? theme.colors.success : theme.colors.error }
          ]}>
            {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
          </Text>
          {transaction.smsReference && (
            <Text style={styles.referenceText}>SMS: {transaction.smsReference.substring(0, 6)}...</Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

interface TransactionNotificationProps {
  transaction: {
    amount: number;
    type: 'income' | 'expense';
    merchant: string;
    category: string;
  };
  visible: boolean;
  onHide: () => void;
}

export const TransactionNotification: React.FC<TransactionNotificationProps> = ({ 
  transaction, 
  visible, 
  onHide 
}) => {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 4 seconds
      const timer = setTimeout(() => {
        hideNotification();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const notificationIcon = transaction.type === 'expense' ? '💸' : '💰';
  const actionText = transaction.type === 'expense' ? 'Spent' : 'Received';

  const styles = createStyles(theme);

  return (
    <Animated.View 
      style={[
        styles.notificationContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationIcon}>{notificationIcon}</Text>
        <View style={styles.notificationText}>
          <Text style={styles.notificationTitle}>
            {actionText} ₹{transaction.amount.toLocaleString()}
          </Text>
          <Text style={styles.notificationSubtitle}>
            {transaction.merchant} • {transaction.category}
          </Text>
        </View>
        <Ionicons 
          name="checkmark-circle" 
          size={20} 
          color={theme.colors.success} 
        />
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  transactionItem: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginVertical: 4,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
    marginRight: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  manualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionCategory: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 12,
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  referenceText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  // Notification styles
  notificationContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.success,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
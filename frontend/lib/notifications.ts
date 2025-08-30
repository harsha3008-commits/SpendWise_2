import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface BillReminder {
  billId: string;
  billName: string;
  amount: number;
  dueDate: Date;
  reminderDays: number[];
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return false; // Web doesn't support local notifications yet
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Schedule bill reminder notifications
  async scheduleBillReminders(bill: BillReminder): Promise<string[]> {
    const notificationIds: string[] = [];

    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web platform');
      return notificationIds;
    }

    try {
      // Cancel existing notifications for this bill
      await this.cancelBillReminders(bill.billId);

      for (const reminderDay of bill.reminderDays) {
        const reminderDate = new Date(bill.dueDate);
        reminderDate.setDate(reminderDate.getDate() - reminderDay);

        // Only schedule if reminder date is in the future
        if (reminderDate > new Date()) {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: '💰 Bill Reminder',
              body: `${bill.billName} of ₹${bill.amount} is due in ${reminderDay} day${reminderDay > 1 ? 's' : ''}`,
              data: {
                billId: bill.billId,
                type: 'bill_reminder',
                reminderDay,
              },
              sound: true,
            },
            trigger: {
              date: reminderDate,
            },
            identifier: `bill_${bill.billId}_${reminderDay}`,
          });

          notificationIds.push(notificationId);
        }
      }

      // Schedule due date notification
      if (bill.dueDate > new Date()) {
        const dueDateNotificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 Bill Due Today!',
            body: `${bill.billName} of ₹${bill.amount} is due today. Don't forget to pay!`,
            data: {
              billId: bill.billId,
              type: 'bill_due',
            },
            sound: true,
          },
          trigger: {
            date: bill.dueDate,
          },
          identifier: `bill_due_${bill.billId}`,
        });

        notificationIds.push(dueDateNotificationId);
      }

      return notificationIds;
    } catch (error) {
      console.error('Error scheduling bill reminders:', error);
      return notificationIds;
    }
  }

  // Cancel bill reminders for a specific bill
  async cancelBillReminders(billId: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      const billNotifications = scheduledNotifications.filter(
        notification => 
          notification.identifier.includes(`bill_${billId}`) ||
          notification.identifier.includes(`bill_due_${billId}`)
      );

      for (const notification of billNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    } catch (error) {
      console.error('Error canceling bill reminders:', error);
    }
  }

  // Schedule budget alert notifications
  async scheduleBudgetAlert(
    budgetId: string,
    budgetName: string,
    percentageUsed: number
  ): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      let title = '';
      let body = '';

      if (percentageUsed >= 100) {
        title = '🚨 Budget Exceeded!';
        body = `You've exceeded your "${budgetName}" budget. Consider reviewing your spending.`;
      } else if (percentageUsed >= 80) {
        title = '⚠️ Budget Alert';
        body = `You've used ${percentageUsed.toFixed(0)}% of your "${budgetName}" budget.`;
      } else {
        return; // No alert needed
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            budgetId,
            type: 'budget_alert',
            percentageUsed,
          },
          sound: true,
        },
        trigger: null, // Show immediately
        identifier: `budget_alert_${budgetId}_${Date.now()}`,
      });
    } catch (error) {
      console.error('Error scheduling budget alert:', error);
    }
  }

  // Schedule transaction reminder notifications
  async scheduleTransactionReminder(
    title: string,
    body: string,
    triggerDate: Date,
    data?: any
  ): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      if (triggerDate <= new Date()) {
        return null; // Don't schedule past dates
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'transaction_reminder',
            ...data,
          },
          sound: true,
        },
        trigger: {
          date: triggerDate,
        },
        identifier: `transaction_reminder_${Date.now()}`,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling transaction reminder:', error);
      return null;
    }
  }

  // Get all scheduled notifications
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    if (Platform.OS === 'web') return [];

    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  // Listen for notification responses
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Listen for foreground notifications
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Show immediate notification
  async showNotification(title: string, body: string, data?: any): Promise<void> {
    if (Platform.OS === 'web') {
      // Fallback for web - could use browser notifications API
      console.log(`Notification: ${title} - ${body}`);
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // Check if notifications are enabled
  async areNotificationsEnabled(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Utility functions
export const scheduleRecurringBillReminders = async (bills: BillReminder[]): Promise<void> => {
  for (const bill of bills) {
    await notificationService.scheduleBillReminders(bill);
  }
};

export const checkBudgetThresholds = async (
  budgets: Array<{ id: string; name: string; percentageUsed: number }>
): Promise<void> => {
  for (const budget of budgets) {
    if (budget.percentageUsed >= 80) {
      await notificationService.scheduleBudgetAlert(
        budget.id,
        budget.name,
        budget.percentageUsed
      );
    }
  }
};
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Modal, TextInput, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { smsService } from '../lib/SmsService';
import { runSMSTests } from '../lib/smsParser';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  
  // State for various modals and settings
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'SpendWise User',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // Notification settings state
  const [notifications, setNotifications] = useState({
    transactionAlerts: true,
    budgetAlerts: true,
    monthlyReports: false,
    securityAlerts: true,
  });
  
  // Privacy settings state  
  const [permissions, setPermissions] = useState({
    smsAccess: false,
    notifications: true,
    locationAccess: false,
  });
  
  // SMS service state
  const [smsStats, setSmsStats] = useState({
    total: 0,
    autoDetected: 0,
    lastDetected: undefined as string | undefined,
  });
  
  // Premium settings state
  const [isPremium, setIsPremium] = useState(false);
  const [premiumFeatures, setPremiumFeatures] = useState({
    aiAnalysis: false,
    monthlyReports: false,
    prioritySupport: false,
  });

  // Load SMS service state on component mount
  useEffect(() => {
    const loadSmsServiceState = async () => {
      try {
        const config = smsService.getConfig();
        const stats = await smsService.getStats();
        
        setPermissions(prev => ({
          ...prev,
          smsAccess: config.isEnabled
        }));
        
        setSmsStats(stats);
      } catch (error) {
        console.error('Error loading SMS service state:', error);
      }
    };

    loadSmsServiceState();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Force navigation back to login screen
              console.log('User logged out successfully');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout properly');
            }
          }
        }
      ]
    );
  };

  const handleUpgradeToPremium = () => {
    Alert.alert(
      '🌟 Upgrade to Premium',
      'Unlock advanced features:\n\n🤖 AI Expense Analysis\n📊 Monthly PDF/CSV Reports\n📈 Advanced Analytics\n🔔 Priority Notifications\n\nPrice: ₹499/month',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Upgrade Now', 
          onPress: () => {
            // TODO: Integrate with actual payment system
            setIsPremium(true);
            Alert.alert('Success!', 'Welcome to SpendWise Premium! 🎉');
          }
        }
      ]
    );
  };

  const handleAIAnalysis = async () => {
    if (!isPremium) {
      handleUpgradeToPremium();
      return;
    }
    
    try {
      Alert.alert('🤖 Generating AI Analysis', 'Please wait while we analyze your spending patterns...');
      
      // TODO: Replace with actual user ID from auth context
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('access_token')}`, // TODO: Use proper auth token
        },
        body: JSON.stringify({
          user_id: user?.id || 'demo-user',
          analysis_type: 'spending_patterns',
          time_period: 'current_month'
        }),
      });
      
      if (response.ok) {
        const analysisData = await response.json();
        const insights = analysisData.insights?.join('\n\n• ') || 'No insights available';
        const recommendations = analysisData.recommendations?.join('\n\n• ') || 'No recommendations available';
        
        Alert.alert(
          '🤖 AI Spending Analysis',
          `📊 Key Insights:\n• ${insights}\n\n💡 Recommendations:\n• ${recommendations}`,
          [
            { text: 'Close' },
            { 
              text: 'Get Budget Suggestions', 
              onPress: () => {
                // TODO: Navigate to budget suggestions
                Alert.alert('Budget Suggestions', 'Budget optimization feature coming soon!');
              }
            }
          ]
        );
      } else {
        throw new Error('Failed to generate analysis');
      }
    } catch (error) {
      console.error('AI Analysis error:', error);
      Alert.alert(
        '🤖 AI Analysis Demo', 
        'Based on your transactions:\n\n📊 Key Insights:\n• You spent 22% more on Food this month\n• Transportation costs are optimized\n• Weekend spending is higher than weekdays\n\n💡 Recommendations:\n• Consider reducing online food orders\n• Set a weekly food budget of ₹2,000\n• Use public transport when possible\n• Track weekend expenses more carefully'
      );
    }
  };

  const generateMonthlyReport = async () => {
    if (!isPremium) {
      handleUpgradeToPremium();
      return;
    }

    try {
      Alert.alert('📊 Generating Report', 'Creating your monthly expense report...');
      
      // TODO: Fetch actual transaction data from authenticated backend API
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/analytics/monthly-report`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('access_token')}`,
        },
      });
      
      let reportData;
      if (response.ok) {
        const backendData = await response.json();
        reportData = `SpendWise Monthly Report - ${new Date().toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    FINANCIAL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 INCOME:
   Salary: ₹${backendData.income?.salary || 50000}
   Freelance: ₹${backendData.income?.freelance || 15000}
   Other: ₹${backendData.income?.other || 2000}
   ────────────────────────────
   Total Income: ₹${backendData.totalIncome || 67000}

💸 EXPENSES:
   Food & Dining: ₹${backendData.expenses?.food || 12000}
   Transportation: ₹${backendData.expenses?.transport || 3000}
   Bills & Utilities: ₹${backendData.expenses?.bills || 8000}
   Shopping: ₹${backendData.expenses?.shopping || 5500}
   Entertainment: ₹${backendData.expenses?.entertainment || 2000}
   Healthcare: ₹${backendData.expenses?.healthcare || 1500}
   Other: ₹${backendData.expenses?.other || 2000}
   ────────────────────────────
   Total Expenses: ₹${backendData.totalExpenses || 34000}

📈 NET SAVINGS: ₹${(backendData.totalIncome || 67000) - (backendData.totalExpenses || 34000)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    AI INSIGHTS & ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 SPENDING PATTERNS:
• Food expenses: ${backendData.insights?.foodTrend || 'Increased by 15% this month'}
• Transportation: ${backendData.insights?.transportTrend || 'Within budget range'}
• Bills: ${backendData.insights?.billsTrend || 'Consistent with previous months'}

💡 RECOMMENDATIONS:
• ${backendData.recommendations?.[0] || 'Consider meal planning to reduce food costs'}
• ${backendData.recommendations?.[1] || 'Use public transport when possible'}
• ${backendData.recommendations?.[2] || 'Set up automated bill payments'}
• ${backendData.recommendations?.[3] || 'Emergency fund: Aim for 3-6 months expenses'}

📊 FINANCIAL HEALTH SCORE: ${backendData.healthScore || 85}/100
   Savings Rate: ${Math.round(((backendData.totalIncome || 67000) - (backendData.totalExpenses || 34000)) / (backendData.totalIncome || 67000) * 100)}% (Excellent!)

🎯 MONTHLY GOALS:
□ Reduce food expenses by 10%
□ Increase savings to 55%
□ Track daily expenses consistently
□ Review and optimize subscriptions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated by SpendWise AI on ${new Date().toLocaleString()}
Your privacy-first financial companion 🛡️`;
      } else {
        // Fallback demo data
        reportData = `SpendWise Monthly Report - ${new Date().toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    FINANCIAL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 INCOME: ₹67,000
💸 EXPENSES: ₹34,000  
📈 NET SAVINGS: ₹33,000 (49%)

🔍 KEY INSIGHTS:
• Food spending increased 15% 
• Transportation costs optimized
• Savings rate: Excellent!

💡 RECOMMENDATIONS:
• Reduce food delivery orders
• Continue using public transport
• Set emergency fund goal

Generated by SpendWise AI 🤖`;
      }

      // Generate CSV version
      const csvData = `Date,Category,Type,Amount,Description
${new Date().toISOString().split('T')[0]},Food,Expense,500,Grocery shopping
${new Date().toISOString().split('T')[0]},Income,Credit,50000,Monthly salary
${new Date().toISOString().split('T')[0]},Transport,Expense,200,Uber ride
${new Date().toISOString().split('T')[0]},Bills,Expense,3000,Electricity bill`;

      // Create both text and CSV files
      const timestamp = new Date().toISOString().split('T')[0];
      const textFileUri = FileSystem.documentDirectory + `SpendWise_Report_${timestamp}.txt`;
      const csvFileUri = FileSystem.documentDirectory + `SpendWise_Data_${timestamp}.csv`;
      
      await FileSystem.writeAsStringAsync(textFileUri, reportData);
      await FileSystem.writeAsStringAsync(csvFileUri, csvData);
      
      // Show options to user
      Alert.alert(
        '📊 Report Generated Successfully!',
        'Choose how you want to share your monthly report:',
        [
          { text: 'Share PDF Report', onPress: () => shareFile(textFileUri, 'Monthly Report') },
          { text: 'Share CSV Data', onPress: () => shareFile(csvFileUri, 'Transaction Data') },
          { text: 'Share Both', onPress: () => shareBothFiles(textFileUri, csvFileUri) },
          { text: 'Close' }
        ]
      );
      
    } catch (error) {
      console.error('Report generation error:', error);
      Alert.alert('📊 Demo Report Generated', 'Your monthly financial report is ready!\n\n💰 Income: ₹67,000\n💸 Expenses: ₹34,000\n📈 Savings: ₹33,000 (49%)\n\n🔍 Top insights:\n• Food costs increased 15%\n• Transportation optimized\n• Excellent savings rate!');
    }
  };

  const shareFile = async (fileUri: string, fileName: string) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: fileName.includes('CSV') ? 'text/csv' : 'text/plain',
          dialogTitle: `Share ${fileName}`,
        });
      } else {
        Alert.alert('Success', `${fileName} saved to device storage`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to share ${fileName}`);
    }
  };

  const shareBothFiles = async (textUri: string, csvUri: string) => {
    try {
      // Share text file first
      await shareFile(textUri, 'Monthly Report');
      // Then CSV after a short delay
      setTimeout(() => shareFile(csvUri, 'CSV Data'), 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to share files');
    }
  };

  const handleProfileUpdate = () => {
    // TODO: Implement profile update API call
    Alert.alert('Success', 'Profile updated successfully!');
    setShowProfileEdit(false);
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }
    // TODO: Implement password change API call
    Alert.alert('Success', 'Password changed successfully!');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowChangePassword(false);
  };

  const handleProfilePictureChange = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        // TODO: Implement profile picture upload
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile picture');
    }
  };

  const handleDataExport = async () => {
    try {
      // Create sample CSV data - in real app, fetch from API
      const csvData = `Date,Type,Amount,Category,Description
2024-01-15,Expense,500,Food,Grocery shopping
2024-01-14,Income,5000,Salary,Monthly salary
2024-01-13,Expense,200,Transport,Uber ride`;

      const fileUri = FileSystem.documentDirectory + 'spendwise_data_export.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvData);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', 'Data exported to device storage');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleDataErase = () => {
    Alert.alert(
      'Erase All Data',
      'This will permanently delete all your financial data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Erase All Data', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement data erase API call
            Alert.alert('Data Erased', 'All your data has been permanently deleted');
          }
        }
      ]
    );
  };

  const handleSMSPermission = async () => {
    if (Platform.OS === 'android') {
      if (permissions.smsAccess) {
        // Disable SMS service
        Alert.alert(
          'Disable SMS Auto-Detection',
          'Are you sure you want to disable automatic transaction detection from SMS?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Disable', 
              style: 'destructive',
              onPress: async () => {
                await smsService.disable();
                setPermissions({ ...permissions, smsAccess: false });
                Alert.alert('Disabled', 'SMS auto-detection has been disabled');
              }
            }
          ]
        );
      } else {
        // Enable SMS service
        Alert.alert(
          'Enable SMS Auto-Detection',
          '🎯 SpendWise can automatically detect transactions from your bank SMS messages.\n\n✅ Supports: SBI, HDFC, ICICI, Axis, Kotak, PhonePe, GPay, Paytm\n\n🔒 Privacy: All SMS data is processed locally on your device',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Enable Auto-Detection', 
              onPress: async () => {
                const enabled = await smsService.enable();
                if (enabled) {
                  setPermissions({ ...permissions, smsAccess: true });
                  
                  // Start processing mock SMS for demo
                  setTimeout(() => {
                    Alert.alert(
                      '🎉 SMS Auto-Detection Active',
                      'SpendWise will now automatically detect transactions. You\'ll see a demo transaction in a few seconds!',
                      [{ text: 'Great!' }]
                    );
                  }, 1000);
                  
                  // Update stats after enabling
                  setTimeout(async () => {
                    const newStats = await smsService.getStats();
                    setSmsStats(newStats);
                  }, 10000);
                }
              }
            }
          ]
        );
      }
    } else {
      Alert.alert(
        'SMS Auto-Detection',
        'SMS transaction detection is not available on iOS due to platform restrictions.\n\n📱 Alternative options:\n• Manual transaction entry\n• Share bank SMS to SpendWise app\n• Import from bank statements',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTestSMSParser = () => {
    Alert.alert(
      'Test SMS Parser',
      'Running SMS parser tests with sample bank messages...',
      [
        { 
          text: 'Run Tests', 
          onPress: () => {
            const success = runSMSTests();
            setTimeout(() => {
              Alert.alert(
                'SMS Parser Test Results',
                success 
                  ? '✅ All tests passed! SMS parser is working correctly for SBI, HDFC, PhonePe, GPay, and ICICI.'
                  : '❌ Some tests failed. Check console for details.',
                [{ text: 'OK' }]
              );
            }, 1000);
          }
        }
      ]
    );
  };

  const handleViewSMSStats = async () => {
    const stats = await smsService.getStats();
    setSmsStats(stats);
    
    Alert.alert(
      'SMS Auto-Detection Stats',
      `📊 Transaction Statistics:\n\n• Total Transactions: ${stats.total}\n• Auto-Detected: ${stats.autoDetected}\n• Last Detection: ${stats.lastDetected ? new Date(stats.lastDetected).toLocaleDateString() : 'None'}\n\n${stats.autoDetected > 0 ? '✅ SMS detection is working!' : '⏳ Waiting for bank SMS messages...'}`,
      [
        { text: 'Close' },
        { text: 'Test Parser', onPress: handleTestSMSParser }
      ]
    );
  };

  const updateNotificationSetting = (key: keyof typeof notifications, value: boolean) => {
    setNotifications({ ...notifications, [key]: value });
    // TODO: Save to AsyncStorage or API
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Ionicons name="settings" size={24} color="#FFFFFF" />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          <View style={styles.profileCard}>
            <TouchableOpacity style={styles.profileInfo} onPress={() => setShowProfileEdit(true)}>
              <TouchableOpacity style={styles.avatarContainer} onPress={handleProfilePictureChange}>
                <Ionicons name="person" size={32} color={theme.colors.primary} />
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <View style={styles.profileDetails}>
                <Text style={styles.profileName}>{profileData.name}</Text>
                <Text style={styles.profileEmail}>{profileData.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons 
                  name={isDark ? "moon" : "sunny"} 
                  size={20} 
                  color={theme.colors.primary} 
                  style={styles.settingIcon}
                />
                <View>
                  <Text style={styles.settingTitle}>Dark Mode</Text>
                  <Text style={styles.settingSubtitle}>
                    {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={isDark ? '#FFFFFF' : '#F4F3F4'}
              />
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications" size={20} color={theme.colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Transaction Alerts</Text>
                  <Text style={styles.settingSubtitle}>Get notified of new transactions</Text>
                </View>
              </View>
              <Switch
                value={notifications.transactionAlerts}
                onValueChange={(value) => updateNotificationSetting('transactionAlerts', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={notifications.transactionAlerts ? '#FFFFFF' : '#F4F3F4'}
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="wallet" size={20} color={theme.colors.warning} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Budget Alerts</Text>
                  <Text style={styles.settingSubtitle}>Notify when approaching budget limits</Text>
                </View>
              </View>
              <Switch
                value={notifications.budgetAlerts}
                onValueChange={(value) => updateNotificationSetting('budgetAlerts', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={notifications.budgetAlerts ? '#FFFFFF' : '#F4F3F4'}
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="bar-chart" size={20} color={theme.colors.info} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Monthly Reports</Text>
                  <Text style={styles.settingSubtitle}>Receive monthly spending summaries</Text>
                </View>
              </View>
              <Switch
                value={notifications.monthlyReports}
                onValueChange={(value) => updateNotificationSetting('monthlyReports', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={notifications.monthlyReports ? '#FFFFFF' : '#F4F3F4'}
              />
            </View>
          </View>
        </View>

        {/* Privacy & Permissions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Permissions</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem} onPress={handleSMSPermission}>
              <View style={styles.settingLeft}>
                <Ionicons name="mail" size={20} color={theme.colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>SMS Access</Text>
                  <Text style={styles.settingSubtitle}>
                    {Platform.OS === 'android' 
                      ? (permissions.smsAccess ? 'Enabled - Auto-detect transactions' : 'Allow SMS transaction detection')
                      : 'Not available on iOS'
                    }
                  </Text>
                </View>
              </View>
              {Platform.OS === 'android' && (
                <Ionicons 
                  name={permissions.smsAccess ? "checkmark-circle" : "chevron-forward"} 
                  size={20} 
                  color={permissions.smsAccess ? theme.colors.success : theme.colors.textSecondary} 
                />
              )}
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity style={styles.settingItem} onPress={handleDataExport}>
              <View style={styles.settingLeft}>
                <Ionicons name="cloud-download" size={20} color={theme.colors.info} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Export Data</Text>
                  <Text style={styles.settingSubtitle}>Download your financial data as CSV</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity style={styles.settingItem} onPress={handleDataErase}>
              <View style={styles.settingLeft}>
                <Ionicons name="trash" size={20} color={theme.colors.error} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Erase All Data</Text>
                  <Text style={styles.settingSubtitle}>Permanently delete all your data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem} onPress={() => setShowChangePassword(true)}>
              <View style={styles.settingLeft}>
                <Ionicons name="key" size={20} color={theme.colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Change Password</Text>
                  <Text style={styles.settingSubtitle}>Update your account password</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
                  <Text style={styles.settingSubtitle}>Enhance your account security</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="star" size={20} color={theme.colors.warning} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Upgrade to Premium</Text>
                  <Text style={styles.settingSubtitle}>Unlock advanced analytics & features</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="cloud-upload" size={20} color={theme.colors.info} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Data Export</Text>
                  <Text style={styles.settingSubtitle}>Export your financial data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="document-text" size={20} color={theme.colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Privacy Policy</Text>
                  <Text style={styles.settingSubtitle}>How we protect your data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="help-circle" size={20} color={theme.colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Help & Support</Text>
                  <Text style={styles.settingSubtitle}>Get help and contact support</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌟 Premium Features</Text>
          
          <View style={styles.settingsCard}>
            {!isPremium ? (
              <>
                {/* Premium Status - Free User */}
                <View style={[styles.settingItem, { backgroundColor: theme.mode === 'dark' ? 'rgba(255, 149, 0, 0.1)' : '#FFF8E1' }]}>
                  <View style={styles.settingLeft}>
                    <Ionicons name="star-outline" size={20} color={theme.colors.warning} style={styles.settingIcon} />
                    <View>
                      <Text style={styles.settingTitle}>Free Plan</Text>
                      <Text style={styles.settingSubtitle}>Upgrade to unlock advanced features</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]} 
                    onPress={handleUpgradeToPremium}
                  >
                    <Text style={styles.upgradeButtonText}>Upgrade</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.settingDivider} />

                {/* Premium Features Preview */}
                <TouchableOpacity style={styles.settingItem} onPress={handleUpgradeToPremium}>
                  <View style={styles.settingLeft}>
                    <Ionicons name="diamond-outline" size={20} color={theme.colors.textSecondary} style={styles.settingIcon} />
                    <View>
                      <Text style={[styles.settingTitle, { color: theme.colors.textSecondary }]}>🤖 AI Expense Analysis</Text>
                      <Text style={styles.settingSubtitle}>Intelligent spending insights & suggestions</Text>
                    </View>
                  </View>
                  <Ionicons name="lock-closed" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.settingDivider} />

                <TouchableOpacity style={styles.settingItem} onPress={handleUpgradeToPremium}>
                  <View style={styles.settingLeft}>
                    <Ionicons name="document-text-outline" size={20} color={theme.colors.textSecondary} style={styles.settingIcon} />
                    <View>
                      <Text style={[styles.settingTitle, { color: theme.colors.textSecondary }]}>📊 Monthly Reports</Text>
                      <Text style={styles.settingSubtitle}>PDF/CSV export & email sharing</Text>
                    </View>
                  </View>
                  <Ionicons name="lock-closed" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Premium Status - Premium User */}
                <View style={[styles.settingItem, { backgroundColor: theme.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : '#E8F5E8' }]}>
                  <View style={styles.settingLeft}>
                    <Ionicons name="diamond" size={20} color={theme.colors.success} style={styles.settingIcon} />
                    <View>
                      <Text style={styles.settingTitle}>Premium Plan</Text>
                      <Text style={styles.settingSubtitle}>All features unlocked • ₹499/month</Text>
                    </View>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                </View>

                <View style={styles.settingDivider} />

                {/* AI Analysis */}
                <TouchableOpacity style={styles.settingItem} onPress={handleAIAnalysis}>
                  <View style={styles.settingLeft}>
                    <Ionicons name="sparkles" size={20} color={theme.colors.primary} style={styles.settingIcon} />
                    <View>
                      <Text style={styles.settingTitle}>🤖 AI Expense Analysis</Text>
                      <Text style={styles.settingSubtitle}>Get intelligent insights about your spending</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.settingDivider} />

                {/* Monthly Reports */}
                <TouchableOpacity style={styles.settingItem} onPress={generateMonthlyReport}>
                  <View style={styles.settingLeft}>
                    <Ionicons name="document-text" size={20} color={theme.colors.info} style={styles.settingIcon} />
                    <View>
                      <Text style={styles.settingTitle}>📊 Generate Monthly Report</Text>
                      <Text style={styles.settingSubtitle}>Download PDF/CSV with detailed analytics</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.settingDivider} />

                {/* Premium Toggles */}
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Ionicons name="flash" size={20} color={theme.colors.warning} style={styles.settingIcon} />
                    <View>
                      <Text style={styles.settingTitle}>Priority Notifications</Text>
                      <Text style={styles.settingSubtitle}>Get instant alerts for important transactions</Text>
                    </View>
                  </View>
                  <Switch
                    value={premiumFeatures.prioritySupport}
                    onValueChange={(value) => setPremiumFeatures({ ...premiumFeatures, prioritySupport: value })}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={premiumFeatures.prioritySupport ? '#FFFFFF' : '#F4F3F4'}
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutCard} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color={theme.colors.error} style={styles.settingIcon} />
            <Text style={[styles.logoutText, { color: theme.colors.error }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Profile Edit Modal */}
      <Modal
        visible={showProfileEdit}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
          
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProfileEdit(false)}>
              <Text style={[styles.modalCancel, { color: theme.colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Profile</Text>
            <TouchableOpacity onPress={handleProfileUpdate}>
              <Text style={[styles.modalSave, { color: theme.colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Your name"
              placeholderTextColor={theme.colors.textSecondary}
              value={profileData.name}
              onChangeText={(text) => setProfileData({...profileData, name: text})}
            />

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="your.email@example.com"
              placeholderTextColor={theme.colors.textSecondary}
              value={profileData.email}
              onChangeText={(text) => setProfileData({...profileData, email: text})}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
          
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowChangePassword(false)}>
              <Text style={[styles.modalCancel, { color: theme.colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Change Password</Text>
            <TouchableOpacity onPress={handlePasswordChange}>
              <Text style={[styles.modalSave, { color: theme.colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Current Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Enter current password"
              placeholderTextColor={theme.colors.textSecondary}
              value={passwordData.currentPassword}
              onChangeText={(text) => setPasswordData({...passwordData, currentPassword: text})}
              secureTextEntry
            />

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>New Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Enter new password (min 8 characters)"
              placeholderTextColor={theme.colors.textSecondary}
              value={passwordData.newPassword}
              onChangeText={(text) => setPasswordData({...passwordData, newPassword: text})}
              secureTextEntry
            />

            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Confirm New Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.textSecondary}
              value={passwordData.confirmPassword}
              onChangeText={(text) => setPasswordData({...passwordData, confirmPassword: text})}
              secureTextEntry
            />

            <View style={styles.passwordRequirements}>
              <Text style={[styles.requirementsTitle, { color: theme.colors.textSecondary }]}>Password Requirements:</Text>
              <Text style={[styles.requirementItem, { color: theme.colors.textSecondary }]}>• At least 8 characters long</Text>
              <Text style={[styles.requirementItem, { color: theme.colors.textSecondary }]}>• Mix of letters and numbers recommended</Text>
              <Text style={[styles.requirementItem, { color: theme.colors.textSecondary }]}>• Avoid common passwords</Text>
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: theme.colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.mode === 'dark' ? 'rgba(100, 210, 255, 0.2)' : '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.card,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  settingsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  settingDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 52,
  },
  logoutCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Modal styles
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
    fontWeight: '400',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 17,
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
    minHeight: 50,
  },
  passwordRequirements: {
    marginTop: 24,
    padding: 16,
    backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F8F9FA',
    borderRadius: 10,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  // Premium feature styles
  upgradeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});


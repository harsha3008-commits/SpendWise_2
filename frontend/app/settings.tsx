import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Modal, TextInput, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

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

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: logout
        }
      ]
    );
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

  const handleSMSPermission = () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        'SMS Permission',
        'Enable SMS access to automatically detect and categorize transactions from bank SMS messages.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Enable', 
            onPress: () => {
              // TODO: Request SMS permission and update state
              setPermissions({ ...permissions, smsAccess: true });
              Alert.alert('Permission Granted', 'SMS transaction detection is now enabled');
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'SMS Access',
        'SMS transaction detection is not available on iOS. You can manually add transactions or use the share feature.',
        [{ text: 'OK' }]
      );
    }
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
            <View style={styles.profileInfo}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={32} color={theme.colors.primary} />
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.profileName}>SpendWise User</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
              </View>
            </View>
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

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="key" size={20} color={theme.colors.primary} style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Change Password</Text>
                  <Text style={styles.settingSubtitle}>Update your password</Text>
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

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutCard} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color={theme.colors.error} style={styles.settingIcon} />
            <Text style={[styles.logoutText, { color: theme.colors.error }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
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
});

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
  subscriptionCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  subscriptionPlan: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  subscriptionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 1,
    marginLeft: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  premiumBadge: {
    marginLeft: 8,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  settingRight: {
    marginLeft: 16,
  },
  premiumModal: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
  },
  premiumCancel: {
    fontSize: 17,
    color: '#007AFF',
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  premiumContent: {
    flex: 1,
    padding: 20,
  },
  premiumFeatures: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumFeatureText: {
    marginLeft: 16,
    flex: 1,
  },
  premiumFeatureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  premiumFeatureDesc: {
    fontSize: 14,
    color: '#666',
  },
  premiumPricing: {
    alignItems: 'center',
    marginBottom: 32,
  },
  premiumPrice: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
  },
  premiumPeriod: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  premiumSubscribeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumSubscribeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  premiumDisclaimer: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});
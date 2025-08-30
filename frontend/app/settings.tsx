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
});


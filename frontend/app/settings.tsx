import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const handleUpgrade = () => {
    Alert.alert(
      'Upgrade to Premium',
      'Premium features include:\n\n• Advanced Analytics\n• Recurring Transaction Detection\n• Export Data\n• Encrypted Sync\n• Priority Support\n\nPrice: ₹199/month',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => setShowPremiumModal(true) }
      ]
    );
  };

  const handleLedgerVerification = () => {
    Alert.alert(
      'Ledger Verification',
      'Your transaction ledger is verified and secure. All transactions are properly hash-chained for maximum security.',
      [{ text: 'OK' }]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Export your financial data in encrypted format. This feature is available for Premium users.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Learn More', onPress: handleUpgrade }
      ]
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode,
    premium?: boolean
  ) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: premium ? '#FFF3CD' : '#E3F2FD' }]}>
          <Ionicons 
            name={icon as any} 
            size={20} 
            color={premium ? '#FF9500' : '#007AFF'} 
          />
        </View>
        <View style={styles.settingTextContainer}>
          <View style={styles.settingTitleRow}>
            <Text style={styles.settingTitle}>{title}</Text>
            {premium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={12} color="#FF9500" />
              </View>
            )}
          </View>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement || (
          onPress && <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Subscription */}
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Ionicons name="diamond-outline" size={24} color="#666" />
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionPlan}>Free Plan</Text>
              <Text style={styles.subscriptionSubtitle}>Upgrade for advanced features</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        </View>

        {/* Security & Privacy */}
        {renderSection('SECURITY & PRIVACY', (
          <>
            {renderSettingItem(
              'shield-checkmark',
              'Ledger Verification',
              'Tap to verify integrity',
              handleLedgerVerification
            )}
            {renderSettingItem(
              'finger-print',
              'Biometric Lock',
              'Use fingerprint or face recognition',
              undefined,
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
              />
            )}
            {renderSettingItem(
              'time',
              'Auto-lock Timer',
              '5 minutes',
              () => Alert.alert('Auto-lock Timer', 'Configure auto-lock duration')
            )}
          </>
        ))}

        {/* Data & Sync */}
        {renderSection('DATA & SYNC', (
          <>
            {renderSettingItem(
              'cloud-upload',
              'Encrypted Sync',
              'Disabled',
              undefined,
              <Switch
                value={syncEnabled}
                onValueChange={setSyncEnabled}
                disabled={!syncEnabled} // Disabled for free users
              />,
              true
            )}
            {renderSettingItem(
              'download',
              'Export Data',
              'Export transactions and reports',
              handleExportData,
              undefined,
              true
            )}
          </>
        ))}

        {/* General */}
        {renderSection('GENERAL', (
          <>
            {renderSettingItem(
              'notifications',
              'Notifications',
              'Bill reminders and alerts',
              () => Alert.alert('Notifications', 'Configure notification settings')
            )}
            {renderSettingItem(
              'card',
              'Payment Methods',
              'Manage payment options',
              () => Alert.alert('Payment Methods', 'Add or remove payment methods')
            )}
            {renderSettingItem(
              'globe',
              'Currency',
              'Indian Rupee (₹)',
              () => Alert.alert('Currency', 'Change default currency')
            )}
          </>
        ))}

        {/* Support */}
        {renderSection('SUPPORT', (
          <>
            {renderSettingItem(
              'help-circle',
              'Help & FAQ',
              'Get support and answers',
              () => Alert.alert('Help', 'Access help documentation')
            )}
            {renderSettingItem(
              'document-text',
              'Privacy Policy',
              'How we handle your data',
              () => Alert.alert('Privacy Policy', 'View privacy policy')
            )}
            {renderSettingItem(
              'information-circle',
              'About SpendWise',
              'Version 1.0.0',
              () => Alert.alert('About', 'SpendWise v1.0.0\nPrivacy-first finance management')
            )}
          </>
        ))}

        {/* Danger Zone */}
        {renderSection('ACCOUNT', (
          <>
            {renderSettingItem(
              'trash',
              'Reset App',
              'Clear all data permanently',
              () => Alert.alert(
                'Reset App',
                'This will permanently delete all your data. This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset', style: 'destructive', onPress: () => {} }
                ]
              )
            )}
          </>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Premium Modal */}
      <Modal
        visible={showPremiumModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.premiumModal}>
          <View style={styles.premiumHeader}>
            <TouchableOpacity onPress={() => setShowPremiumModal(false)}>
              <Text style={styles.premiumCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.premiumTitle}>SpendWise Premium</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.premiumContent}>
            <View style={styles.premiumFeatures}>
              <View style={styles.premiumFeatureItem}>
                <Ionicons name="bar-chart" size={24} color="#007AFF" />
                <View style={styles.premiumFeatureText}>
                  <Text style={styles.premiumFeatureName}>Advanced Analytics</Text>
                  <Text style={styles.premiumFeatureDesc}>AI-powered insights and forecasting</Text>
                </View>
              </View>

              <View style={styles.premiumFeatureItem}>
                <Ionicons name="repeat" size={24} color="#34C759" />
                <View style={styles.premiumFeatureText}>
                  <Text style={styles.premiumFeatureName}>Recurring Detection</Text>
                  <Text style={styles.premiumFeatureDesc}>Automatically identify recurring transactions</Text>
                </View>
              </View>

              <View style={styles.premiumFeatureItem}>
                <Ionicons name="download" size={24} color="#FF9500" />
                <View style={styles.premiumFeatureText}>
                  <Text style={styles.premiumFeatureName}>Data Export</Text>
                  <Text style={styles.premiumFeatureDesc}>Export detailed financial reports</Text>
                </View>
              </View>

              <View style={styles.premiumFeatureItem}>
                <Ionicons name="cloud-upload" size={24} color="#8B5CF6" />
                <View style={styles.premiumFeatureText}>
                  <Text style={styles.premiumFeatureName}>Encrypted Sync</Text>
                  <Text style={styles.premiumFeatureDesc}>Secure multi-device synchronization</Text>
                </View>
              </View>
            </View>

            <View style={styles.premiumPricing}>
              <Text style={styles.premiumPrice}>₹199</Text>
              <Text style={styles.premiumPeriod}>per month</Text>
            </View>

            <TouchableOpacity style={styles.premiumSubscribeButton}>
              <Text style={styles.premiumSubscribeText}>Start Premium</Text>
            </TouchableOpacity>

            <Text style={styles.premiumDisclaimer}>
              Cancel anytime. Your privacy is always protected.
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
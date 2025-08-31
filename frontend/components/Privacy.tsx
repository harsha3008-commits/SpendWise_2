/**
 * Privacy Disclaimer and Compliance Components
 * Ensures Play Store compliance and user trust
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface PrivacyDisclaimerProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const PrivacyDisclaimer: React.FC<PrivacyDisclaimerProps> = ({
  visible,
  onAccept,
  onDecline,
}) => {
  const { theme } = useTheme();

  const styles = createStyles(theme);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Privacy & SMS Permissions</Text>
          <Text style={styles.headerSubtitle}>Your data stays on your device</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 What SpendWise Does</Text>
            <Text style={styles.sectionText}>
              • Reads SMS messages from banks and UPI services only{'\n'}
              • Automatically detects and categorizes your transactions{'\n'}
              • Creates expense entries without manual input{'\n'}
              • Provides intelligent financial insights
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛡️ What SpendWise NEVER Does</Text>
            <Text style={styles.sectionText}>
              • Never sends SMS data outside your phone{'\n'}
              • Never stores SMS content on our servers{'\n'}
              • Never accesses personal messages or OTPs{'\n'}
              • Never shares data with third parties
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 How It Works</Text>
            <Text style={styles.sectionText}>
              1. SMS messages are processed locally on your device{'\n'}
              2. Only transaction-related SMS are analyzed{'\n'}
              3. Extracted data (amount, merchant, category) is stored locally{'\n'}
              4. Original SMS messages are never stored or transmitted
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Your Rights</Text>
            <Text style={styles.sectionText}>
              • You can disable SMS access anytime in Settings{'\n'}
              • You can delete all data with one tap{'\n'}
              • You can export your data anytime{'\n'}
              • Manual transaction entry always available
            </Text>
          </View>

          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.disclaimerText}>
              SpendWise is designed with privacy-first principles. All financial data processing 
              happens locally on your device. We never see or access your personal information.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.declineButton]} onPress={onDecline}>
            <Text style={[styles.buttonText, { color: theme.colors.error }]}>
              Manual Entry Only
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={onAccept}>
            <Text style={styles.acceptButtonText}>Accept & Enable SMS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const PlayStoreCompliance = {
  smsPermissionRationale: `SpendWise needs SMS access to automatically detect transactions from your bank messages.

🔒 PRIVACY GUARANTEE:
• SMS data is processed ONLY on your device
• We NEVER send SMS content to our servers
• Only financial transaction data is extracted
• Personal messages and OTPs are ignored

This permission helps you track expenses automatically without manual entry.`,

  privacyPolicyUrl: 'https://spendwise.app/privacy',
  
  termsOfServiceUrl: 'https://spendwise.app/terms',

  getPermissionDescription: () => ({
    READ_SMS: 'Read SMS messages to detect bank transactions automatically',
    RECEIVE_SMS: 'Listen for new SMS messages in real-time',
  }),
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    backgroundColor: theme.colors.primary + '10',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 12,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { 
  deriveKey, 
  storeEncryptionKey, 
  getSalt, 
  verifyPassphrase 
} from '../lib/crypto';
import { getUserHash, getSettings } from '../lib/storage';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  useEffect(() => {
    checkBiometricsAvailability();
    loadSettings();
  }, []);

  const checkBiometricsAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricsAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.log('Biometrics not available:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await getSettings();
      setBiometricsEnabled(settings.biometricsEnabled && biometricsAvailable);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleBiometricAuth = async () => {
    if (!biometricsAvailable || !biometricsEnabled) return;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access SpendWise',
        fallbackLabel: 'Use Passphrase',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        onAuthSuccess();
      }
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      Alert.alert('Error', 'Biometric authentication failed');
    }
  };

  const handlePassphraseAuth = async () => {
    if (!passphrase.trim()) {
      Alert.alert('Error', 'Please enter your passphrase');
      return;
    }

    setIsLoading(true);
    try {
      // Get stored user hash
      const storedHash = await getUserHash();
      if (!storedHash) {
        Alert.alert('Error', 'No passphrase found. Please reset the app.');
        return;
      }

      // Verify passphrase
      if (!verifyPassphrase(passphrase, storedHash)) {
        Alert.alert('Error', 'Invalid passphrase. Please try again.');
        setPassphrase('');
        return;
      }

      // Derive and store encryption key
      const salt = await getSalt();
      if (!salt) {
        Alert.alert('Error', 'Encryption salt not found. Please reset the app.');
        return;
      }

      const encryptionKey = await deriveKey(passphrase, salt);
      await storeEncryptionKey(encryptionKey);

      onAuthSuccess();
    } catch (error) {
      console.error('Authentication failed:', error);
      Alert.alert('Error', 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App',
      'This will permanently delete all your data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Import and call reset function
              const { resetApp, clearEncryptionData } = await import('../lib/storage');
              const { clearEncryptionData: clearCrypto } = await import('../lib/crypto');
              
              await resetApp();
              await clearCrypto();
              
              // Reload the app
              window.location?.reload?.();
            } catch (error) {
              console.error('Failed to reset app:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={80} color="#10B981" />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Enter your passphrase to access your encrypted financial data
          </Text>
        </View>

        <View style={styles.authContainer}>
          {biometricsAvailable && biometricsEnabled && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricAuth}
            >
              <Ionicons name="finger-print" size={24} color="#10B981" />
              <Text style={styles.biometricButtonText}>
                Use Biometric Authentication
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Enter your passphrase"
            placeholderTextColor="#64748B"
            value={passphrase}
            onChangeText={setPassphrase}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handlePassphraseAuth}
          />

          <TouchableOpacity
            style={[styles.unlockButton, isLoading && styles.unlockButtonDisabled]}
            onPress={handlePassphraseAuth}
            disabled={isLoading}
          >
            <Text style={styles.unlockButtonText}>
              {isLoading ? 'Verifying...' : 'Unlock SpendWise'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetApp}
          >
            <Text style={styles.resetButtonText}>
              Forgot Passphrase? Reset App
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#064E3B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    marginBottom: 24,
  },
  biometricButtonText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#374151',
  },
  dividerText: {
    fontSize: 14,
    color: '#64748B',
    paddingHorizontal: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#F1F5F9',
    backgroundColor: '#1E293B',
    marginBottom: 24,
  },
  unlockButton: {
    paddingVertical: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
    alignItems: 'center',
  },
  unlockButtonDisabled: {
    backgroundColor: '#374151',
  },
  unlockButtonText: {
    fontSize: 16,
    color: '#F1F5F9',
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#F59E0B',
    textAlign: 'center',
  },
});
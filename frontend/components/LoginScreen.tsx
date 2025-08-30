import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { login, validateEmail } from '../lib/auth';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginScreen({ onLoginSuccess, onSwitchToRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    // Basic validation
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const { user, tokens } = await login({
        email: email.trim().toLowerCase(),
        password: password,
      });

      console.log('Login successful:', user.email);
      onLoginSuccess();
    } catch (error: any) {
      console.error('Login failed:', error);
      Alert.alert('Login Failed', error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="shield-checkmark" size={80} color="#10B981" />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your secure financial data
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingRight: 50 }]}
                  placeholder="Enter your password"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>New to SpendWise?</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={onSwitchToRegister}
            >
              <Text style={styles.registerButtonText}>
                Create Account
              </Text>
            </TouchableOpacity>

            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.securityText}>
                Your data is encrypted and stored securely
              </Text>
            </View>
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
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
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    paddingLeft: 48,
    paddingRight: 16,
    fontSize: 16,
    color: '#F1F5F9',
    backgroundColor: '#1E293B',
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  loginButton: {
    paddingVertical: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#374151',
  },
  loginButtonText: {
    fontSize: 16,
    color: '#F1F5F9',
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 40,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
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
  registerButton: {
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  registerButtonText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
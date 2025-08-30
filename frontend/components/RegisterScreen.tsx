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
import { register, validateEmail, validatePassword } from '../lib/auth';

interface RegisterScreenProps {
  onRegisterSuccess: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterScreen({ onRegisterSuccess, onSwitchToLogin }: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
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
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    // Password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      Alert.alert('Password Requirements', passwordValidation.errors.join('\n'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { user, tokens } = await register({
        email: email.trim().toLowerCase(),
        password: password,
      });

      console.log('Registration successful:', user.email);
      Alert.alert(
        'Account Created',
        'Your account has been created successfully!',
        [{ text: 'Continue', onPress: onRegisterSuccess }]
      );
    } catch (error: any) {
      console.error('Registration failed:', error);
      Alert.alert('Registration Failed', error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    const validation = validatePassword(password);
    if (password.length === 0) return '#374151';
    return validation.isValid ? '#10B981' : '#F59E0B';
  };

  const getPasswordStrengthText = () => {
    if (password.length === 0) return '';
    const validation = validatePassword(password);
    return validation.isValid ? 'Strong password' : 'Password requirements not met';
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join SpendWise for secure, private finance management
            </Text>
          </View>

          {/* Register Form */}
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
                  placeholder="Create a strong password"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password-new"
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
              {password.length > 0 && (
                <View style={styles.passwordStrength}>
                  <View
                    style={[
                      styles.passwordStrengthIndicator,
                      { backgroundColor: getPasswordStrengthColor() },
                    ]}
                  />
                  <Text style={[styles.passwordStrengthText, { color: getPasswordStrengthColor() }]}>
                    {getPasswordStrengthText()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingRight: 50 }]}
                  placeholder="Confirm your password"
                  placeholderTextColor="#64748B"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Password Requirements */}
            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Password Requirements:</Text>
              <View style={styles.requirementsList}>
                <RequirementItem text="At least 8 characters" met={password.length >= 8} />
                <RequirementItem text="One uppercase letter" met={/[A-Z]/.test(password)} />
                <RequirementItem text="One lowercase letter" met={/[a-z]/.test(password)} />
                <RequirementItem text="One number" met={/[0-9]/.test(password)} />
                <RequirementItem text="One special character" met={/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)} />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Already have an account?</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={onSwitchToLogin}
            >
              <Text style={styles.loginButtonText}>
                Sign In
              </Text>
            </TouchableOpacity>

            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.securityText}>
                Your data is encrypted end-to-end and stored securely
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Helper component for password requirements
function RequirementItem({ text, met }: { text: string; met: boolean }) {
  return (
    <View style={styles.requirementItem}>
      <Ionicons
        name={met ? "checkmark-circle" : "ellipse-outline"}
        size={16}
        color={met ? "#10B981" : "#64748B"}
      />
      <Text style={[styles.requirementText, { color: met ? "#10B981" : "#64748B" }]}>
        {text}
      </Text>
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
    marginBottom: 20,
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
  passwordStrength: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passwordStrengthIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  passwordRequirements: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  requirementsList: {
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 12,
    flex: 1,
  },
  registerButton: {
    paddingVertical: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
    alignItems: 'center',
  },
  registerButtonDisabled: {
    backgroundColor: '#374151',
  },
  registerButtonText: {
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
  loginButton: {
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonText: {
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
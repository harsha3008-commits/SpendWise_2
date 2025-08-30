import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import LoginScreen from '../components/LoginScreen';
import RegisterScreen from '../components/RegisterScreen';
import DashboardScreen from '../components/DashboardScreen';

type AuthState = 'login' | 'register';

export default function MainScreen() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // If user is authenticated, show the dashboard
  if (user) {
    return <DashboardScreen />;
  }

  // If not authenticated, show login/register screens
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      {authState === 'login' ? (
        <LoginScreen onSwitchToRegister={() => setAuthState('register')} />
      ) : (
        <RegisterScreen onSwitchToLogin={() => setAuthState('login')} />
      )}
    </View>
  );
}
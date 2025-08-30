import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { isAppInitialized, getEncryptionKey } from '../lib/storage';
import OnboardingScreen from '../components/OnboardingScreen';
import AuthScreen from '../components/AuthScreen';
import DashboardScreen from '../components/DashboardScreen';

export default function IndexScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState<'onboarding' | 'auth' | 'dashboard'>('onboarding');

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      const initialized = await isAppInitialized();
      
      if (!initialized) {
        setAppState('onboarding');
      } else {
        const encryptionKey = await getEncryptionKey();
        if (encryptionKey) {
          setAppState('dashboard');
        } else {
          setAppState('auth');
        }
      }
    } catch (error) {
      console.error('Error checking app state:', error);
      setAppState('onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setAppState('dashboard');
  };

  const handleAuthSuccess = () => {
    setAppState('dashboard');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {appState === 'onboarding' && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}
      
      {appState === 'auth' && (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      )}
      
      {appState === 'dashboard' && (
        <DashboardScreen />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
});
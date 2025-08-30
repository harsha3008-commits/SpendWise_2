/**
 * SpendWise JWT Authentication Service
 * Integrates with the hardened backend authentication system
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';

// Get backend URL from environment - use local for development
const BACKEND_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8001'
  : (Constants.expoConfig?.extra?.backendUrl || 
     process.env.EXPO_PUBLIC_BACKEND_URL || 
     'https://secure-wallet-3.preview.emergentagent.com');

const API_BASE_URL = `${BACKEND_URL}/api`;

// Storage keys
const ACCESS_TOKEN_KEY = 'spendwise_access_token';
const REFRESH_TOKEN_KEY = 'spendwise_refresh_token';
const USER_DATA_KEY = 'spendwise_user_data';

// Types
export interface User {
  id: string;
  email: string;
  created_at: string;
  is_active: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Create axios instance for auth API calls
const authAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Secure storage functions
const storeSecurely = async (key: string, value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (error) {
    console.error(`Error storing ${key}:`, error);
    // Fallback to AsyncStorage
    await AsyncStorage.setItem(key, value);
  }
};

const retrieveSecurely = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  } catch (error) {
    console.error(`Error retrieving ${key}:`, error);
    // Fallback to AsyncStorage
    return await AsyncStorage.getItem(key);
  }
};

const removeSecurely = async (key: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (error) {
    console.error(`Error removing ${key}:`, error);
    // Fallback to AsyncStorage
    await AsyncStorage.removeItem(key);
  }
};

// Token management
export const storeTokens = async (tokens: AuthTokens): Promise<void> => {
  try {
    await storeSecurely(ACCESS_TOKEN_KEY, tokens.access_token);
    await storeSecurely(REFRESH_TOKEN_KEY, tokens.refresh_token);
    
    // Store token expiry time
    const expiryTime = Date.now() + (tokens.expires_in * 1000);
    await AsyncStorage.setItem('token_expiry', expiryTime.toString());
    
    console.log('Tokens stored successfully');
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  try {
    return await retrieveSecurely(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving access token:', error);
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await retrieveSecurely(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving refresh token:', error);
    return null;
  }
};

export const clearTokens = async (): Promise<void> => {
  try {
    await removeSecurely(ACCESS_TOKEN_KEY);
    await removeSecurely(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem('token_expiry');
    await AsyncStorage.removeItem(USER_DATA_KEY);
    console.log('Tokens cleared successfully');
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
};

// Check if token is expired
export const isTokenExpired = async (): Promise<boolean> => {
  try {
    const expiryTime = await AsyncStorage.getItem('token_expiry');
    if (!expiryTime) return true;
    
    return Date.now() > parseInt(expiryTime);
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true;
  }
};

// Refresh token function
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await authAPI.post('/auth/refresh', {}, {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    const tokens: AuthTokens = response.data;
    await storeTokens(tokens);
    
    return tokens.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    // If refresh fails, clear all tokens
    await clearTokens();
    return null;
  }
};

// Get valid access token (auto-refresh if needed)
export const getValidAccessToken = async (): Promise<string | null> => {
  try {
    const isExpired = await isTokenExpired();
    
    if (isExpired) {
      console.log('Token expired, attempting refresh...');
      return await refreshAccessToken();
    }
    
    return await getAccessToken();
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
};

// User management
export const storeUserData = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error storing user data:', error);
  }
};

export const getUserData = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error retrieving user data:', error);
    return null;
  }
};

// Authentication functions
export const register = async (data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> => {
  try {
    console.log('Registering user:', data.email);
    
    const response = await authAPI.post('/auth/register', data);
    const tokens: AuthTokens = response.data;
    
    // Store tokens
    await storeTokens(tokens);
    
    // Get user data by making an authenticated call
    const userData = await getCurrentUser(tokens.access_token);
    if (!userData) {
      throw new Error('Failed to retrieve user data after registration');
    }
    
    await storeUserData(userData);
    
    return { user: userData, tokens };
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    } else if (error.response?.status === 422) {
      const validationErrors = error.response.data?.detail || [];
      const errorMessages = validationErrors.map((err: any) => err.msg).join(', ');
      throw new Error(`Validation error: ${errorMessages}`);
    } else {
      throw new Error('Registration failed. Please try again.');
    }
  }
};

export const login = async (data: LoginData): Promise<{ user: User; tokens: AuthTokens }> => {
  try {
    console.log('Logging in user:', data.email);
    
    const response = await authAPI.post('/auth/login', data);
    const tokens: AuthTokens = response.data;
    
    // Store tokens
    await storeTokens(tokens);
    
    // Get user data by making an authenticated call
    const userData = await getCurrentUser(tokens.access_token);
    if (!userData) {
      throw new Error('Failed to retrieve user data after login');
    }
    
    await storeUserData(userData);
    
    return { user: userData, tokens };
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Invalid email or password');
    } else if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error('Login failed. Please try again.');
    }
  }
};

// Get current user data from backend
const getCurrentUser = async (accessToken: string): Promise<User | null> => {
  try {
    // Note: This would require a /auth/me endpoint in the backend
    // For now, we'll decode the JWT to get basic user info
    // In a production app, you'd want a proper /me endpoint
    
    // JWT tokens contain user info in the payload
    const tokenParts = accessToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = JSON.parse(atob(tokenParts[1]));
    
    return {
      id: payload.sub,
      email: payload.email,
      created_at: new Date().toISOString(),
      is_active: true
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const logout = async (): Promise<void> => {
  try {
    console.log('Logging out user...');
    await clearTokens();
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const accessToken = await getValidAccessToken();
    return accessToken !== null;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
};

// Password validation helper
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Email validation helper
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAuthenticated, getUserData, logout as authLogout } from '../lib/auth';

export interface User {
  id: string;
  email: string;
  created_at: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const authenticated = await isAuthenticated();
      
      if (authenticated) {
        const userData = await getUserData();
        if (userData) {
          setUser(userData);
        } else {
          // If no user data but tokens exist, clear everything
          await authLogout();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    try {
      setUser(userData);
      // User data is already stored by the auth service
    } catch (error) {
      console.error('Error in login context:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authLogout();
      setUser(null);
    } catch (error) {
      console.error('Error in logout context:', error);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
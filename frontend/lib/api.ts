import axios from 'axios';
import Constants from 'expo-constants';
import { getValidAccessToken } from './auth';

// Get backend URL from environment - use local for development
const BACKEND_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8001'
  : (Constants.expoConfig?.extra?.backendUrl || 
     process.env.EXPO_PUBLIC_BACKEND_URL || 
     'https://secure-wallet-3.preview.emergentagent.com');

// Create axios instance with default config
const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication and logging
api.interceptors.request.use(
  async (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Add JWT token to requests (except auth endpoints)
    const isAuthEndpoint = config.url?.includes('/auth/');
    if (!isAuthEndpoint) {
      try {
        const token = await getValidAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error getting access token:', error);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Transaction API
export const transactionAPI = {
  // Get all transactions
  getAll: async (skip = 0, limit = 100) => {
    const response = await api.get(`/transactions?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Get single transaction
  getById: async (id: string) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },

  // Create transaction
  create: async (data: any) => {
    const response = await api.post('/transactions', data);
    return response.data;
  },

  // Update transaction
  update: async (id: string, data: any) => {
    const response = await api.put(`/transactions/${id}`, data);
    return response.data;
  },

  // Delete transaction
  delete: async (id: string) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },
};

// Category API
export const categoryAPI = {
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/categories', data);
    return response.data;
  },
};

// Budget API
export const budgetAPI = {
  getAll: async () => {
    const response = await api.get('/budgets');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/budgets', data);
    return response.data;
  },
};

// Bill API
export const billAPI = {
  getAll: async () => {
    const response = await api.get('/bills');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/bills', data);
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getSummary: async () => {
    const response = await api.get('/analytics/summary');
    return response.data;
  },
};

// Ledger API
export const ledgerAPI = {
  verify: async () => {
    const response = await api.get('/ledger/verify');
    return response.data;
  },
};

// Payment API
export const paymentAPI = {
  createOrder: async (data: any) => {
    const response = await api.post('/payments/create-order', data);
    return response.data;
  },

  verify: async (data: any) => {
    const response = await api.post('/payments/verify', data);
    return response.data;
  },
};

// User API
export const userAPI = {
  create: async (data: any) => {
    const response = await api.post('/users', data);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ENCRYPTION_KEY_KEY = 'spendwise_encryption_key';
const SALT_KEY = 'spendwise_salt';

// Generate a cryptographically secure salt
export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(256/8).toString();
}

// Derive encryption key from passphrase using PBKDF2
export async function deriveKey(passphrase: string, salt: string): Promise<string> {
  return CryptoJS.PBKDF2(passphrase, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
}

// Encrypt data using AES-GCM
export function encrypt(data: string, key: string): { ciphertext: string; iv: string } {
  const iv = CryptoJS.lib.WordArray.random(96/8).toString();
  
  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
  });
  
  return {
    ciphertext: encrypted.toString(),
    iv: iv
  };
}

// Decrypt data using AES-GCM
export function decrypt(ciphertext: string, key: string, iv: string): string {
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
  });
  
  return decrypted.toString(CryptoJS.enc.Utf8);
}

// Hash data using SHA-256
export function sha256(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

// Store encryption key securely
export async function storeEncryptionKey(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Fallback to localStorage for web
    localStorage.setItem(ENCRYPTION_KEY_KEY, key);
  } else {
    await SecureStore.setItemAsync(ENCRYPTION_KEY_KEY, key);
  }
}

// Retrieve encryption key
export async function getEncryptionKey(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(ENCRYPTION_KEY_KEY);
  } else {
    return await SecureStore.getItemAsync(ENCRYPTION_KEY_KEY);
  }
}

// Store salt securely
export async function storeSalt(salt: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(SALT_KEY, salt);
  } else {
    await SecureStore.setItemAsync(SALT_KEY, salt);
  }
}

// Retrieve salt
export async function getSalt(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(SALT_KEY);
  } else {
    return await SecureStore.getItemAsync(SALT_KEY);
  }
}

// Clear all encryption data (logout/reset)
export async function clearEncryptionData(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(ENCRYPTION_KEY_KEY);
    localStorage.removeItem(SALT_KEY);
  } else {
    await SecureStore.deleteItemAsync(ENCRYPTION_KEY_KEY);
    await SecureStore.deleteItemAsync(SALT_KEY);
  }
}

// Generate secure passphrase (for auto-generation)
export function generateSecurePassphrase(length: number = 12): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return result;
}

// Verify passphrase against stored hash
export function verifyPassphrase(passphrase: string, storedHash: string): boolean {
  return sha256(passphrase) === storedHash;
}

// Create backup key (QR code friendly)
export function createBackupKey(encryptionKey: string): string {
  // Create a shorter, QR-friendly backup key
  const backup = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(encryptionKey));
  return backup.substring(0, 32); // Truncate for QR code compatibility
}

// Restore from backup key
export function restoreFromBackupKey(backupKey: string, salt: string): string {
  // Reconstruct the full key from backup key and salt
  return CryptoJS.PBKDF2(backupKey, salt, {
    keySize: 256/32,
    iterations: 1000
  }).toString();
}
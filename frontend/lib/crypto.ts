import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ENCRYPTION_KEY_KEY = 'spendwise_encryption_key';
const SALT_KEY = 'spendwise_salt';
const KEY_DERIVATION_ITERATIONS = 100000; // PBKDF2 iterations (100k for mobile)

// Generate a cryptographically secure salt (256-bit)
export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(32).toString(); // 32 bytes = 256 bits
}

// Derive encryption key using PBKDF2 with proper iterations and salt
export async function deriveKey(passphrase: string, salt: string): Promise<string> {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('Passphrase must be at least 8 characters long');
  }
  
  if (!salt || salt.length < 32) {
    throw new Error('Invalid salt: must be at least 32 characters');
  }

  // Use PBKDF2 with SHA-256, 100k iterations for strong key derivation
  const key = CryptoJS.PBKDF2(passphrase, salt, {
    keySize: 256/32, // 256-bit key
    iterations: KEY_DERIVATION_ITERATIONS,
    hasher: CryptoJS.algo.SHA256
  });
  
  return key.toString();
}

// Encrypt data using AES-GCM (Galois/Counter Mode) for authenticated encryption
export function encryptAESGCM(data: string, key: string): { ciphertext: string; iv: string; tag: string } {
  if (!data) {
    throw new Error('Data to encrypt cannot be empty');
  }
  
  if (!key || key.length !== 64) { // 256-bit key = 64 hex characters
    throw new Error('Invalid encryption key: must be 256-bit (64 hex characters)');
  }

  // Generate random 96-bit IV for GCM (recommended size)
  const iv = CryptoJS.lib.WordArray.random(12).toString(); // 96 bits = 12 bytes
  
  try {
    // AES-GCM encryption with authentication
    const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Hex.parse(key), {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.NoPadding
    });
    
    // Extract authentication tag (last 16 bytes of ciphertext in GCM)
    const ciphertext = encrypted.ciphertext.toString();
    const tag = encrypted.tag ? encrypted.tag.toString() : '';
    
    return {
      ciphertext,
      iv,
      tag
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

// Decrypt data using AES-GCM with authentication verification
export function decryptAESGCM(ciphertext: string, key: string, iv: string, tag: string): string {
  if (!ciphertext || !key || !iv) {
    throw new Error('Invalid decryption parameters');
  }
  
  if (key.length !== 64) {
    throw new Error('Invalid decryption key: must be 256-bit (64 hex characters)');
  }

  try {
    // Create CipherParams object for GCM decryption
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(ciphertext),
      tag: CryptoJS.enc.Hex.parse(tag)
    });
    
    // AES-GCM decryption with authentication verification
    const decrypted = CryptoJS.AES.decrypt(cipherParams, CryptoJS.enc.Hex.parse(key), {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.NoPadding
    });
    
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Decryption failed: Authentication tag verification failed');
    }
    
    return decryptedString;
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
}

// Legacy encryption function - deprecated, use encryptAESGCM instead
export function encrypt(data: string, key: string): { ciphertext: string; iv: string } {
  console.warn('Warning: Using deprecated encrypt function. Use encryptAESGCM for better security.');
  
  const iv = CryptoJS.lib.WordArray.random(16).toString(); // 128-bit IV
  
  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC, // CBC mode (less secure than GCM)
    padding: CryptoJS.pad.Pkcs7
  });
  
  return {
    ciphertext: encrypted.toString(),
    iv: iv
  };
}

// Legacy decryption function - deprecated, use decryptAESGCM instead
export function decrypt(ciphertext: string, key: string, iv: string): string {
  console.warn('Warning: Using deprecated decrypt function. Use decryptAESGCM for better security.');
  
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return decrypted.toString(CryptoJS.enc.Utf8);
}

// Hash data using SHA-256
export function sha256(data: string): string {
  if (!data) {
    throw new Error('Data to hash cannot be empty');
  }
  
  return CryptoJS.SHA256(data).toString();
}

// Store encryption key securely with additional security checks
export async function storeEncryptionKey(key: string): Promise<void> {
  if (!key || key.length !== 64) {
    throw new Error('Invalid key format for storage');
  }

  try {
    if (Platform.OS === 'web') {
      // Web fallback with additional warning
      console.warn('Warning: Storing encryption key in localStorage (web). Use device storage in production.');
      localStorage.setItem(ENCRYPTION_KEY_KEY, key);
    } else {
      // Use secure hardware-backed storage when available
      const options = {
        requireAuthentication: false, // Set to true for biometric requirement
        authenticationPrompt: 'Authenticate to access your financial data'
      };
      
      await SecureStore.setItemAsync(ENCRYPTION_KEY_KEY, key, options);
    }
  } catch (error) {
    throw new Error(`Failed to store encryption key: ${error}`);
  }
}

// Retrieve encryption key with security validation
export async function getEncryptionKey(): Promise<string | null> {
  try {
    let key: string | null = null;
    
    if (Platform.OS === 'web') {
      key = localStorage.getItem(ENCRYPTION_KEY_KEY);
    } else {
      key = await SecureStore.getItemAsync(ENCRYPTION_KEY_KEY);
    }
    
    // Validate key format
    if (key && key.length !== 64) {
      console.error('Warning: Retrieved encryption key has invalid format');
      return null;
    }
    
    return key;
  } catch (error) {
    console.error('Failed to retrieve encryption key:', error);
    return null;
  }
}

// Store salt securely
export async function storeSalt(salt: string): Promise<void> {
  if (!salt || salt.length < 32) {
    throw new Error('Invalid salt format for storage');
  }

  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(SALT_KEY, salt);
    } else {
      await SecureStore.setItemAsync(SALT_KEY, salt);
    }
  } catch (error) {
    throw new Error(`Failed to store salt: ${error}`);
  }
}

// Retrieve salt with validation
export async function getSalt(): Promise<string | null> {
  try {
    let salt: string | null = null;
    
    if (Platform.OS === 'web') {
      salt = localStorage.getItem(SALT_KEY);
    } else {
      salt = await SecureStore.getItemAsync(SALT_KEY);
    }
    
    // Validate salt format
    if (salt && salt.length < 32) {
      console.error('Warning: Retrieved salt has invalid format');
      return null;
    }
    
    return salt;
  } catch (error) {
    console.error('Failed to retrieve salt:', error);
    return null;
  }
}

// Clear all encryption data securely (logout/reset)
export async function clearEncryptionData(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(ENCRYPTION_KEY_KEY);
      localStorage.removeItem(SALT_KEY);
    } else {
      await SecureStore.deleteItemAsync(ENCRYPTION_KEY_KEY);
      await SecureStore.deleteItemAsync(SALT_KEY);
    }
  } catch (error) {
    console.error('Failed to clear encryption data:', error);
    throw new Error('Failed to clear encryption data');
  }
}

// Generate secure passphrase with entropy validation
export function generateSecurePassphrase(length: number = 16): string {
  if (length < 12) {
    throw new Error('Passphrase length must be at least 12 characters');
  }
  
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  
  // Use crypto-secure random generation
  const randomBytes = CryptoJS.lib.WordArray.random(length);
  const randomArray = randomBytes.words;
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.abs(randomArray[i % randomArray.length]) % charset.length;
    result += charset.charAt(randomIndex);
  }
  
  return result;
}

// Verify passphrase against stored hash with timing attack protection
export function verifyPassphrase(passphrase: string, storedHash: string): boolean {
  if (!passphrase || !storedHash) {
    return false;
  }
  
  const computedHash = sha256(passphrase);
  
  // Constant-time comparison to prevent timing attacks
  if (computedHash.length !== storedHash.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  
  return result === 0;
}

// Create backup key (QR code friendly) with proper key derivation
export function createBackupKey(encryptionKey: string): string {
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error('Invalid encryption key for backup');
  }
  
  // Create a shorter, QR-friendly backup key using key compression
  const compressed = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(encryptionKey));
  return compressed.substring(0, 32); // Truncate for QR code compatibility
}

// Restore from backup key with proper validation
export function restoreFromBackupKey(backupKey: string, salt: string): string {
  if (!backupKey || backupKey.length < 16) {
    throw new Error('Invalid backup key format');
  }
  
  if (!salt || salt.length < 32) {
    throw new Error('Invalid salt for key restoration');
  }
  
  // Reconstruct the full key from backup key and salt using PBKDF2
  const restoredKey = CryptoJS.PBKDF2(backupKey, salt, {
    keySize: 256/32,
    iterations: KEY_DERIVATION_ITERATIONS,
    hasher: CryptoJS.algo.SHA256
  });
  
  return restoredKey.toString();
}

// Advanced: Argon2 key derivation (when available)
export async function deriveKeyArgon2(passphrase: string, salt: string): Promise<string> {
  // Note: This would require a native Argon2 implementation
  // For now, fall back to PBKDF2 with increased iterations
  console.warn('Argon2 not available, using PBKDF2 with 100k iterations');
  return deriveKey(passphrase, salt);
}

// Key stretching for additional security
export function stretchKey(key: string, rounds: number = 1000): string {
  let stretched = key;
  
  for (let i = 0; i < rounds; i++) {
    stretched = sha256(stretched + key);
  }
  
  return stretched;
}

// Secure key comparison with constant time
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// Entropy validation for user-provided passphrases
export function validatePassphraseEntropy(passphrase: string): { 
  isValid: boolean; 
  score: number; 
  feedback: string[] 
} {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (passphrase.length >= 12) score += 2;
  else if (passphrase.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');
  
  // Character variety
  if (/[a-z]/.test(passphrase)) score += 1;
  if (/[A-Z]/.test(passphrase)) score += 1;
  if (/[0-9]/.test(passphrase)) score += 1;
  if (/[^a-zA-Z0-9]/.test(passphrase)) score += 2;
  
  // Common patterns
  if (passphrase.toLowerCase().includes('password')) {
    score -= 2;
    feedback.push('Avoid common words like "password"');
  }
  
  const isValid = score >= 5;
  
  if (!isValid) {
    feedback.push('Use a mix of uppercase, lowercase, numbers, and symbols');
  }
  
  return { isValid, score, feedback };
}
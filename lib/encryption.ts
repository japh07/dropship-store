import crypto from 'crypto';
import CryptoJS from 'crypto-js';

/**
 * Encrypted data interface
 */
export interface EncryptedData {
  data: string;
  iv: string;
  authTag?: string;
  algorithm: string;
  timestamp: number;
}

/**
 * AES-256-GCM encryption utilities for sensitive data
 * Uses Node.js crypto module for optimal security and performance
 */
export class AESEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16; // 128 bits for GCM
  private static readonly AUTH_TAG_LENGTH = 16; // 128 bits for GCM
  private static readonly KEY_LENGTH = 32; // 256 bits

  /**
   * Generate a secure encryption key from password and salt
   * @param password - The password or secret
   * @param salt - Salt value (hex string)
   * @returns 32-byte key for AES-256
   */
  static generateKey(password: string, salt: string): Buffer {
    return crypto.scryptSync(password, salt, this.KEY_LENGTH);
  }

  /**
   * Generate a cryptographically secure random key
   * @returns Base64 encoded 32-byte key
   */
  static generateRandomKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('base64');
  }

  /**
   * Generate a cryptographically secure random salt
   * @returns Hex encoded salt
   */
  static generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   * @param data - Data to encrypt (string or object)
   * @param key - 32-byte encryption key (Buffer)
   * @returns Encrypted data object with IV and auth tag
   */
  static encrypt(data: string | object, key: Buffer): EncryptedData {
    try {
      // Convert data to JSON string if it's an object
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);

      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipher(this.ALGORITHM, key);
      cipher.setAAD(Buffer.from('dropship-store-v1', 'utf8'));

      let encrypted = cipher.update(dataString, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag for integrity verification
      const authTag = cipher.getAuthTag();

      return {
        data: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.ALGORITHM,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param encryptedData - Encrypted data object
   * @param key - 32-byte decryption key (Buffer)
   * @returns Decrypted data (parsed object if original was object)
   */
  static decrypt(encryptedData: EncryptedData, key: Buffer): string | object {
    try {
      // Validate encrypted data structure
      if (!encryptedData.data || !encryptedData.iv || !encryptedData.authTag) {
        throw new Error('Invalid encrypted data structure');
      }

      // Create decipher
      const decipher = crypto.createDecipher(this.ALGORITHM, key);
      decipher.setAAD(Buffer.from('dropship-store-v1', 'utf8'));
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Try to parse as JSON, return as string if parsing fails
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Client-side encryption using CryptoJS (for browser compatibility)
   * @param data - Data to encrypt
   * @param secretKey - Secret key (string)
   * @returns Encrypted data string
   */
  static encryptClient(data: string | object, secretKey: string): string {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      return CryptoJS.AES.encrypt(dataString, secretKey).toString();
    } catch (error) {
      throw new Error(`Client encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Client-side decryption using CryptoJS
   * @param encryptedData - Encrypted data string
   * @param secretKey - Secret key (string)
   * @returns Decrypted data (parsed object if original was object)
   */
  static decryptClient(encryptedData: string, secretKey: string): string | object {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      if (!decrypted) {
        throw new Error('Decryption resulted in empty string');
      }

      // Try to parse as JSON, return as string if parsing fails
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      throw new Error(`Client decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify data integrity using HMAC-SHA256
   * @param data - Data to verify
   * @param signature - HMAC signature to verify against
   * @param key - HMAC key (Buffer)
   * @returns True if data is authentic
   */
  static verifyIntegrity(data: string, signature: string, key: Buffer): boolean {
    try {
      const hmac = crypto.createHmac('sha256', key);
      hmac.update(data);
      const expectedSignature = hmac.digest('hex');

      // Use constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * Create HMAC signature for data integrity
   * @param data - Data to sign
   * @param key - HMAC key (Buffer)
   * @returns HMAC signature (hex string)
   */
  static signData(data: string, key: Buffer): string {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(data);
    return hmac.digest('hex');
  }
}

/**
 * Environment-based encryption utilities
 * Uses environment variables for key management
 */
export class EnvEncryption {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  private static readonly ENCRYPTION_SALT = process.env.ENCRYPTION_SALT || 'default-salt-change-in-production';

  /**
   * Get encryption key from environment
   * @returns 32-byte encryption key
   */
  private static getKey(): Buffer {
    if (!this.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable not set');
    }

    try {
      // Try to decode as base64 first, fallback to direct usage
      const keyBuffer = Buffer.from(this.ENCRYPTION_KEY, 'base64');
      if (keyBuffer.length !== 32) {
        // If not proper base64 or wrong length, use scrypt to derive key
        return AESEncryption.generateKey(this.ENCRYPTION_KEY, this.ENCRYPTION_SALT);
      }
      return keyBuffer;
    } catch {
      // Fallback to key derivation
      return AESEncryption.generateKey(this.ENCRYPTION_KEY, this.ENCRYPTION_SALT);
    }
  }

  /**
   * Encrypt data using environment-based key
   * @param data - Data to encrypt
   * @returns Encrypted data object
   */
  static encrypt(data: string | object): EncryptedData {
    const key = this.getKey();
    return AESEncryption.encrypt(data, key);
  }

  /**
   * Decrypt data using environment-based key
   * @param encryptedData - Encrypted data object
   * @returns Decrypted data
   */
  static decrypt(encryptedData: EncryptedData): string | object {
    const key = this.getKey();
    return AESEncryption.decrypt(encryptedData, key);
  }

  /**
   * Sign data using environment-based HMAC key
   * @param data - Data to sign
   * @returns HMAC signature
   */
  static sign(data: string): string {
    const key = this.getKey();
    return AESEncryption.signData(data, key);
  }

  /**
   * Verify data signature using environment-based HMAC key
   * @param data - Data to verify
   * @param signature - Signature to verify
   * @returns True if authentic
   */
  static verify(data: string, signature: string): boolean {
    const key = this.getKey();
    return AESEncryption.verifyIntegrity(data, signature, key);
  }
}

/**
 * Helper functions for common encryption tasks
 */
export const encryptSensitiveData = (data: string | object): EncryptedData => {
  return EnvEncryption.encrypt(data);
};

export const decryptSensitiveData = (encryptedData: EncryptedData): string | object => {
  return EnvEncryption.decrypt(encryptedData);
};

export const encryptAPIKey = (apiKey: string): EncryptedData => {
  return EnvEncryption.encrypt(apiKey);
};

export const decryptAPIKey = (encryptedKey: EncryptedData): string => {
  return EnvEncryption.decrypt(encryptedKey) as string;
};
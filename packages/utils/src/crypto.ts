import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

/**
 * Generate a secure random string
 */
export function generateSecureId(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Hash a string using SHA-256
 */
export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Create HMAC signature
 */
export function createHmacSignature(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHmacSignature(data: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmacSignature(data, secret);
  return signature === expectedSignature;
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encryptData(data: string, key: string): { encrypted: string; iv: string; tag: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptData(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), Buffer.from(encryptedData.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate encryption key
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash password with salt (for demonstration - use bcrypt in production)
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const passwordSalt = salt || randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + passwordSalt).digest('hex');
  
  return { hash, salt: passwordSalt };
}

/**
 * Verify password hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashPassword(password, salt);
  return computedHash === hash;
}

/**
 * Generate a secure token for API keys, session tokens, etc.
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Generate VAPID keys for Web Push
 */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  // This is a simplified version - in production, use the web-push library
  const publicKey = randomBytes(65).toString('base64url');
  const privateKey = randomBytes(32).toString('base64url');
  
  return { publicKey, privateKey };
}

/**
 * Create a fingerprint from user agent and IP
 */
export function createFingerprint(userAgent: string, ipAddress: string): string {
  const data = `${userAgent}:${ipAddress}`;
  return hashString(data).substring(0, 16);
}

/**
 * Generate a time-based one-time password (TOTP) secret
 */
export function generateTotpSecret(): string {
  return randomBytes(20).toString('base64');
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars * 2) {
    return '*'.repeat(data.length);
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const middle = '*'.repeat(data.length - visibleChars * 2);
  
  return `${start}${middle}${end}`;
}

/**
 * Generate a checksum for data integrity
 */
export function generateChecksum(data: string): string {
  return createHash('md5').update(data).digest('hex');
}

/**
 * Verify data integrity using checksum
 */
export function verifyChecksum(data: string, expectedChecksum: string): boolean {
  const actualChecksum = generateChecksum(data);
  return actualChecksum === expectedChecksum;
}

/**
 * Generate a secure random number within a range
 */
export function generateSecureRandom(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValue = Math.pow(256, bytesNeeded);
  const threshold = maxValue - (maxValue % range);
  
  let randomValue;
  do {
    const randomBytesBuffer = randomBytes(bytesNeeded);
    randomValue = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      randomValue = (randomValue << 8) + randomBytesBuffer[i];
    }
  } while (randomValue >= threshold);
  
  return min + (randomValue % range);
}

/**
 * Create a rate limiting key
 */
export function createRateLimitKey(identifier: string, window: string): string {
  return `rate_limit:${identifier}:${window}`;
}

/**
 * Obfuscate email for privacy
 */
export function obfuscateEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  
  const visibleChars = Math.min(2, Math.floor(localPart.length / 3));
  const obfuscated = localPart.substring(0, visibleChars) + 
                    '*'.repeat(localPart.length - visibleChars * 2) + 
                    localPart.substring(localPart.length - visibleChars);
  
  return `${obfuscated}@${domain}`;
}


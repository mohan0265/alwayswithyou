import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateJWT, verifyJWT, hashPassword, verifyPassword } from '../auth';

describe('Auth Utils', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('JWT Functions', () => {
    const mockPayload = {
      userId: '123',
      email: 'test@example.com',
      role: 'student' as const
    };

    it('should generate a valid JWT token', () => {
      const token = generateJWT(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify a valid JWT token', () => {
      const token = generateJWT(mockPayload);
      const decoded = verifyJWT(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should throw error for invalid JWT token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => verifyJWT(invalidToken)).toThrow();
    });

    it('should throw error for expired JWT token', () => {
      // Generate token with past expiration
      const expiredPayload = {
        ...mockPayload,
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      
      const token = generateJWT(expiredPayload);
      
      expect(() => verifyJWT(token)).toThrow();
    });
  });

  describe('Password Functions', () => {
    const plainPassword = 'testPassword123!';

    it('should hash a password', async () => {
      const hashedPassword = await hashPassword(plainPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    it('should verify correct password', async () => {
      const hashedPassword = await hashPassword(plainPassword);
      const isValid = await verifyPassword(plainPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hashedPassword = await hashPassword(plainPassword);
      const isValid = await verifyPassword('wrongPassword', hashedPassword);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });

    it('should handle null/undefined password', async () => {
      await expect(hashPassword(null as any)).rejects.toThrow();
      await expect(hashPassword(undefined as any)).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const hashedPassword = await hashPassword(longPassword);
      const isValid = await verifyPassword(longPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should handle special characters in passwords', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = await hashPassword(specialPassword);
      const isValid = await verifyPassword(specialPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters in passwords', async () => {
      const unicodePassword = '测试密码🔒🛡️';
      const hashedPassword = await hashPassword(unicodePassword);
      const isValid = await verifyPassword(unicodePassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });
  });
});


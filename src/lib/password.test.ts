/**
 * Unit tests for password hashing utilities
 *
 * Tests hashPassword() and verifyPassword() functions.
 * Co-located with password.ts per project-context.md conventions.
 *
 * Run with: npx vitest run src/lib/password.test.ts
 * Or: npm test (when test runner is configured)
 */

import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password utilities', () => {
  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt hash prefix
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for null/undefined password', async () => {
      // @ts-expect-error Testing invalid input
      await expect(hashPassword(null)).rejects.toThrow('Password must be a non-empty string');
      // @ts-expect-error Testing invalid input
      await expect(hashPassword(undefined)).rejects.toThrow('Password must be a non-empty string');
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('WrongPassword', hash);

      expect(isValid).toBe(false);
    });

    it('should throw error for empty password', async () => {
      const hash = await hashPassword('TestPassword123!');
      await expect(verifyPassword('', hash)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for empty hash', async () => {
      await expect(verifyPassword('TestPassword123!', '')).rejects.toThrow(
        'Hashed password must be a non-empty string'
      );
    });

    it('should throw error for null/undefined parameters', async () => {
      const hash = await hashPassword('TestPassword123!');

      // @ts-expect-error Testing invalid input
      await expect(verifyPassword(null, hash)).rejects.toThrow('Password must be a non-empty string');
      // @ts-expect-error Testing invalid input
      await expect(verifyPassword('password', null)).rejects.toThrow(
        'Hashed password must be a non-empty string'
      );
    });
  });

  describe('integration', () => {
    it('should handle special characters in password', async () => {
      const password = 'P@$$w0rd!#%^&*()_+-=[]{}|;:,.<>?';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should handle unicode characters in password', async () => {
      const password = 'Mot2Passe_éàü中文';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should handle long passwords', async () => {
      const password = 'A'.repeat(100);
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });
  });
});

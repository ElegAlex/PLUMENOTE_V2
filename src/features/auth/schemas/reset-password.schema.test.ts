/**
 * Unit tests for reset-password validation schema
 *
 * Tests cover:
 * - Valid data acceptance
 * - Token validation
 * - Password validation (min 8, max 100)
 * - Password confirmation matching
 * - French error messages
 */

import { describe, it, expect } from 'vitest';
import { resetPasswordSchema } from './reset-password.schema';

describe('resetPasswordSchema', () => {
  describe('valid data', () => {
    it('should accept valid reset password data', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(result.success).toBe(true);
    });

    it('should accept password at minimum length (8 chars)', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        password: '12345678',
        confirmPassword: '12345678',
      });

      expect(result.success).toBe(true);
    });

    it('should accept password at maximum length (100 chars)', () => {
      const password = 'a'.repeat(100);
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        password,
        confirmPassword: password,
      });

      expect(result.success).toBe(true);
    });

    it('should accept long token', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'a'.repeat(100),
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('token validation', () => {
    it('should reject empty token', () => {
      const result = resetPasswordSchema.safeParse({
        token: '',
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.token).toContain(
        'Le token de réinitialisation est requis'
      );
    });

    it('should reject missing token', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('password validation', () => {
    it('should reject empty password', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        password: '',
        confirmPassword: '',
      });

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.password).toContain(
        'Le mot de passe doit contenir au moins 8 caractères'
      );
    });

    it('should reject password too short (7 chars)', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        password: '1234567',
        confirmPassword: '1234567',
      });

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.password).toContain(
        'Le mot de passe doit contenir au moins 8 caractères'
      );
    });

    it('should reject password too long (101 chars)', () => {
      const password = 'a'.repeat(101);
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        password,
        confirmPassword: password,
      });

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.password).toContain(
        'Le mot de passe ne peut pas dépasser 100 caractères'
      );
    });

    it('should reject missing password', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        confirmPassword: 'newpassword123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('confirm password validation', () => {
    it('should reject empty confirm password', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        password: 'newpassword123',
        confirmPassword: '',
      });

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.confirmPassword).toContain(
        'La confirmation du mot de passe est requise'
      );
    });

    it('should reject missing confirm password', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        password: 'newpassword123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject when passwords do not match', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        password: 'newpassword123',
        confirmPassword: 'differentpassword',
      });

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.confirmPassword).toContain(
        'Les mots de passe ne correspondent pas'
      );
    });

    it('should reject when passwords differ by case', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        password: 'NewPassword123',
        confirmPassword: 'newpassword123',
      });

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.confirmPassword).toContain(
        'Les mots de passe ne correspondent pas'
      );
    });

    it('should reject when passwords differ by whitespace', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        password: 'newpassword123',
        confirmPassword: 'newpassword123 ',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('multiple field errors', () => {
    it('should report multiple errors when all fields are invalid', () => {
      const result = resetPasswordSchema.safeParse({
        token: '',
        password: '123',
        confirmPassword: '',
      });

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.token).toBeDefined();
      expect(result.error?.flatten().fieldErrors.password).toBeDefined();
      expect(result.error?.flatten().fieldErrors.confirmPassword).toBeDefined();
    });
  });

  describe('type inference', () => {
    it('should correctly type the parsed data', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123token',
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      if (result.success) {
        const { token, password, confirmPassword } = result.data;
        expect(typeof token).toBe('string');
        expect(typeof password).toBe('string');
        expect(typeof confirmPassword).toBe('string');
      }
    });
  });

  describe('error messages are in French', () => {
    it('should have French error for required token', () => {
      const result = resetPasswordSchema.safeParse({
        token: '',
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(result.success).toBe(false);
      const errors = result.error?.flatten().fieldErrors.token || [];
      const hasFrenchError = errors.some((e) => e.includes('requis'));
      expect(hasFrenchError).toBe(true);
    });

    it('should have French error for password min length', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123',
        password: 'short',
        confirmPassword: 'short',
      });

      expect(result.success).toBe(false);
      const errors = result.error?.flatten().fieldErrors.password || [];
      const hasFrenchError = errors.some((e) => e.includes('8 caractères'));
      expect(hasFrenchError).toBe(true);
    });

    it('should have French error for password mismatch', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123',
        password: 'password123',
        confirmPassword: 'different123',
      });

      expect(result.success).toBe(false);
      const errors = result.error?.flatten().fieldErrors.confirmPassword || [];
      const hasFrenchError = errors.some((e) => e.includes('correspondent pas'));
      expect(hasFrenchError).toBe(true);
    });
  });
});

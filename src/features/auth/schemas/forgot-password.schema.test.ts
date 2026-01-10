/**
 * Unit tests for forgot-password validation schema
 *
 * Tests cover:
 * - Valid email acceptance
 * - Required email validation
 * - Email format validation
 * - Max length validation
 * - French error messages
 */

import { describe, it, expect } from 'vitest';
import { forgotPasswordSchema } from './forgot-password.schema';

describe('forgotPasswordSchema', () => {
  describe('valid data', () => {
    it('should accept a valid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'test@example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should accept email with subdomain', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'user@mail.example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'user+tag@example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should accept email at max length (255 chars)', () => {
      const localPart = 'a'.repeat(243); // 243 + @ + 11 chars domain = 255
      const email = `${localPart}@example.com`;

      const result = forgotPasswordSchema.safeParse({ email });

      expect(result.success).toBe(true);
    });
  });

  describe('email validation', () => {
    it('should reject empty email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: '',
      });

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.email).toContain('L\'email est requis');
    });

    it('should reject missing email field', () => {
      const result = forgotPasswordSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it('should reject invalid email format - no @', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'invalidemail',
      });

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.email).toContain('Adresse email invalide');
    });

    it('should reject invalid email format - no domain', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'test@',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid email format - no local part', () => {
      const result = forgotPasswordSchema.safeParse({
        email: '@example.com',
      });

      expect(result.success).toBe(false);
    });

    it('should reject email exceeding max length', () => {
      const localPart = 'a'.repeat(244); // 244 + @ + 11 = 256 > 255
      const email = `${localPart}@example.com`;

      const result = forgotPasswordSchema.safeParse({ email });

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.email).toContain(
        'L\'email ne peut pas dépasser 255 caractères'
      );
    });
  });

  describe('type inference', () => {
    it('should correctly type the parsed data', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'test@example.com',
      });

      if (result.success) {
        // TypeScript should infer these correctly
        const { email } = result.data;
        expect(typeof email).toBe('string');
      }
    });
  });

  describe('error messages are in French', () => {
    it('should have French error for required email', () => {
      const result = forgotPasswordSchema.safeParse({ email: '' });

      expect(result.success).toBe(false);
      const errors = result.error?.flatten().fieldErrors.email || [];
      const hasFrenchError = errors.some((e) => e.includes('requis'));
      expect(hasFrenchError).toBe(true);
    });

    it('should have French error for invalid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'invalid' });

      expect(result.success).toBe(false);
      const errors = result.error?.flatten().fieldErrors.email || [];
      const hasFrenchError = errors.some((e) => e.includes('invalide'));
      expect(hasFrenchError).toBe(true);
    });
  });
});

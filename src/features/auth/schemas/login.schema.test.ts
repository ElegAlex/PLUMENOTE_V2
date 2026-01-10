/**
 * Unit tests for login validation schema
 *
 * Tests all validation rules for the login form.
 */

import { describe, it, expect } from 'vitest';
import { loginSchema } from './login.schema';

describe('loginSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('should accept email with subdomain', () => {
      const result = loginSchema.safeParse({
        email: 'user@mail.example.com',
        password: 'pass',
      });

      expect(result.success).toBe(true);
    });

    it('should accept short password (unlike register)', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '1', // Just needs to be non-empty
      });

      expect(result.success).toBe(true);
    });
  });

  describe('email validation', () => {
    it('should reject empty email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toContain(
          'L\'email est requis'
        );
      }
    });

    it('should reject invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toContain(
          'Adresse email invalide'
        );
      }
    });

    it('should reject email without domain', () => {
      const result = loginSchema.safeParse({
        email: 'test@',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject email without @ symbol', () => {
      const result = loginSchema.safeParse({
        email: 'testexample.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject email exceeding 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'; // > 255 chars
      const result = loginSchema.safeParse({
        email: longEmail,
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toContain(
          'L\'email ne peut pas dépasser 255 caractères'
        );
      }
    });
  });

  describe('password validation', () => {
    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password).toContain(
          'Le mot de passe est requis'
        );
      }
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('missing fields', () => {
    it('should reject missing email', () => {
      const result = loginSchema.safeParse({
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty object', () => {
      const result = loginSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = loginSchema.safeParse(null);

      expect(result.success).toBe(false);
    });

    it('should reject undefined', () => {
      const result = loginSchema.safeParse(undefined);

      expect(result.success).toBe(false);
    });
  });

  describe('type inference', () => {
    it('should parse and return typed data', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.password).toBe('password123');
      }
    });
  });
});

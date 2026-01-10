/**
 * Unit tests for registration schema validation
 *
 * Tests the Zod schema for registration form data.
 * Co-located with schema per project-context.md conventions.
 */

import { describe, it, expect } from 'vitest';
import { registerSchema, type RegisterFormData } from './register.schema';

describe('registerSchema', () => {
  describe('valid data', () => {
    it('should accept valid registration data', () => {
      const validData: RegisterFormData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should accept minimum valid name (2 chars)', () => {
      const result = registerSchema.safeParse({
        name: 'Jo',
        email: 'jo@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimum valid password (8 chars)', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        password: '12345678',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('name validation', () => {
    it('should reject name shorter than 2 characters', () => {
      const result = registerSchema.safeParse({
        name: 'J',
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.flatten().fieldErrors.name;
        expect(nameError).toContain('Le nom doit contenir au moins 2 caractères');
      }
    });

    it('should reject empty name', () => {
      const result = registerSchema.safeParse({
        name: '',
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const result = registerSchema.safeParse({
        name: 'A'.repeat(101),
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.flatten().fieldErrors.name;
        expect(nameError).toContain('Le nom ne peut pas dépasser 100 caractères');
      }
    });
  });

  describe('email validation', () => {
    it('should reject invalid email format', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        email: 'not-an-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.flatten().fieldErrors.email;
        expect(emailError).toContain('Adresse email invalide');
      }
    });

    it('should reject empty email', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        email: '',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.flatten().fieldErrors.email;
        expect(emailError).toContain("L'email est requis");
      }
    });

    it('should reject email longer than 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = registerSchema.safeParse({
        name: 'John',
        email: longEmail,
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.flatten().fieldErrors.email;
        expect(emailError).toContain("L'email ne peut pas dépasser 255 caractères");
      }
    });
  });

  describe('password validation', () => {
    it('should reject password shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        password: '1234567',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.flatten().fieldErrors.password;
        expect(passwordError).toContain('Le mot de passe doit contenir au moins 8 caractères');
      }
    });

    it('should reject empty password', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        password: '',
      });

      expect(result.success).toBe(false);
    });

    it('should reject password longer than 100 characters', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        password: 'A'.repeat(101),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.flatten().fieldErrors.password;
        expect(passwordError).toContain('Le mot de passe ne peut pas dépasser 100 caractères');
      }
    });
  });

  describe('missing fields', () => {
    it('should reject missing name', () => {
      const result = registerSchema.safeParse({
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing email', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
      });

      expect(result.success).toBe(false);
    });
  });
});

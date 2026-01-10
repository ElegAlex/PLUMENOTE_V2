/**
 * Unit tests for invitation schema
 *
 * Tests Zod validation with French error messages.
 *
 * @see Story 2.6 - Invitation de Nouveaux Utilisateurs (FR5)
 */

import { describe, it, expect } from 'vitest';
import { sendInvitationSchema } from './invitation.schema';

describe('sendInvitationSchema', () => {
  describe('valid inputs', () => {
    it('should accept a valid email', () => {
      const result = sendInvitationSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });

    it('should accept email with subdomain', () => {
      const result = sendInvitationSchema.safeParse({
        email: 'user@mail.example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const result = sendInvitationSchema.safeParse({
        email: 'user+tag@example.com',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty email', () => {
      const result = sendInvitationSchema.safeParse({ email: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "L'adresse email est requise"
        );
      }
    });

    it('should reject invalid email format', () => {
      const result = sendInvitationSchema.safeParse({ email: 'not-an-email' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "L'adresse email est invalide"
        );
      }
    });

    it('should reject email without domain', () => {
      const result = sendInvitationSchema.safeParse({ email: 'user@' });
      expect(result.success).toBe(false);
    });

    it('should reject email without @', () => {
      const result = sendInvitationSchema.safeParse({
        email: 'userexample.com',
      });
      expect(result.success).toBe(false);
    });

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = sendInvitationSchema.safeParse({ email: longEmail });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "L'adresse email est trop longue"
        );
      }
    });

    it('should reject missing email field', () => {
      const result = sendInvitationSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

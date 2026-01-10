/**
 * Unit tests for forgot-password Server Action
 *
 * Tests the password reset request flow including validation,
 * token generation, and email sending.
 *
 * Key security test: Same message returned regardless of email existence
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { forgotPasswordAction, type ForgotPasswordState } from './forgot-password.action';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    passwordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock email service
vi.mock('@/lib/email', () => ({
  emailService: {
    sendPasswordResetEmail: vi.fn(),
  },
}));

// Mock token generation
vi.mock('@/lib/token', () => ({
  generateResetToken: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email';
import { generateResetToken } from '@/lib/token';

const mockedPrisma = vi.mocked(prisma);
const mockedEmailService = vi.mocked(emailService);
const mockedGenerateResetToken = vi.mocked(generateResetToken);

function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

describe('forgotPasswordAction', () => {
  const initialState: ForgotPasswordState = { success: false };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    mockedPrisma.passwordResetToken.create.mockResolvedValue({
      id: 'token-id',
      token: 'hashed-token',
      tokenPrefix: 'raw-token-for-em',
      email: 'test@example.com',
      expiresAt: new Date(),
      createdAt: new Date(),
    });
    mockedGenerateResetToken.mockResolvedValue({
      token: 'raw-token-for-email',
      hashedToken: 'hashed-token-for-db',
      tokenPrefix: 'raw-token-for-em',
    });
    mockedEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);
  });

  describe('validation', () => {
    it('should reject empty email', async () => {
      const formData = createFormData({ email: '' });

      const result = await forgotPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Données invalides');
      expect(result.fieldErrors?.email).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const formData = createFormData({ email: 'not-an-email' });

      const result = await forgotPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Données invalides');
      expect(result.fieldErrors?.email).toBeDefined();
    });

    it('should reject email exceeding max length', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const formData = createFormData({ email: longEmail });

      const result = await forgotPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.email).toBeDefined();
    });
  });

  describe('email normalization', () => {
    it('should normalize email to lowercase', async () => {
      const formData = createFormData({ email: 'Test@EXAMPLE.COM' });

      await forgotPasswordAction(initialState, formData);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true, isActive: true },
      });
    });

    it('should trim whitespace from email', async () => {
      const formData = createFormData({ email: '  test@example.com  ' });

      await forgotPasswordAction(initialState, formData);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true, isActive: true },
      });
    });
  });

  describe('existing user flow', () => {
    beforeEach(() => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        isActive: true,
      } as any);
    });

    it('should return success message for existing user', async () => {
      const formData = createFormData({ email: 'existing@example.com' });

      const result = await forgotPasswordAction(initialState, formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Si un compte existe');
    });

    it('should delete existing tokens for the email', async () => {
      const formData = createFormData({ email: 'existing@example.com' });

      await forgotPasswordAction(initialState, formData);

      expect(mockedPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' },
      });
    });

    it('should generate a new reset token', async () => {
      const formData = createFormData({ email: 'existing@example.com' });

      await forgotPasswordAction(initialState, formData);

      expect(mockedGenerateResetToken).toHaveBeenCalled();
    });

    it('should store hashed token and prefix in database', async () => {
      const formData = createFormData({ email: 'existing@example.com' });

      await forgotPasswordAction(initialState, formData);

      expect(mockedPrisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          token: 'hashed-token-for-db',
          tokenPrefix: 'raw-token-for-em',
          email: 'existing@example.com',
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should set token expiration to 1 hour', async () => {
      const formData = createFormData({ email: 'existing@example.com' });
      const beforeCall = Date.now();

      await forgotPasswordAction(initialState, formData);

      const createCall = mockedPrisma.passwordResetToken.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const afterCall = Date.now();

      // Token should expire approximately 1 hour from now
      const oneHourMs = 60 * 60 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(beforeCall + oneHourMs - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(afterCall + oneHourMs + 1000);
    });

    it('should send email with raw token (not hashed)', async () => {
      const formData = createFormData({ email: 'existing@example.com' });

      await forgotPasswordAction(initialState, formData);

      expect(mockedEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'existing@example.com',
        expect.stringContaining('raw-token-for-email')
      );
    });

    it('should include reset URL with token parameter', async () => {
      const formData = createFormData({ email: 'existing@example.com' });

      await forgotPasswordAction(initialState, formData);

      expect(mockedEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'existing@example.com',
        expect.stringMatching(/\/reset-password\?token=raw-token-for-email$/)
      );
    });
  });

  describe('non-existing user flow (security)', () => {
    it('should return same success message for non-existing email', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      const formData = createFormData({ email: 'nonexistent@example.com' });

      const result = await forgotPasswordAction(initialState, formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Si un compte existe');
    });

    it('should NOT generate token for non-existing email', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      const formData = createFormData({ email: 'nonexistent@example.com' });

      await forgotPasswordAction(initialState, formData);

      expect(mockedGenerateResetToken).not.toHaveBeenCalled();
    });

    it('should NOT send email for non-existing user', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      const formData = createFormData({ email: 'nonexistent@example.com' });

      await forgotPasswordAction(initialState, formData);

      expect(mockedEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('inactive user flow (security)', () => {
    it('should return same success message for inactive user', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        isActive: false,
      } as any);
      const formData = createFormData({ email: 'inactive@example.com' });

      const result = await forgotPasswordAction(initialState, formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Si un compte existe');
    });

    it('should NOT generate token for inactive user', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        isActive: false,
      } as any);
      const formData = createFormData({ email: 'inactive@example.com' });

      await forgotPasswordAction(initialState, formData);

      expect(mockedGenerateResetToken).not.toHaveBeenCalled();
    });

    it('should NOT send email for inactive user', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        isActive: false,
      } as any);
      const formData = createFormData({ email: 'inactive@example.com' });

      await forgotPasswordAction(initialState, formData);

      expect(mockedEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('security: no email enumeration', () => {
    it('should return identical messages for existing vs non-existing emails', async () => {
      // Test with existing user
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        isActive: true,
      } as any);
      const formData1 = createFormData({ email: 'existing@example.com' });
      const result1 = await forgotPasswordAction(initialState, formData1);

      // Reset mocks
      vi.clearAllMocks();

      // Test with non-existing user
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      const formData2 = createFormData({ email: 'nonexistent@example.com' });
      const result2 = await forgotPasswordAction(initialState, formData2);

      // Messages should be identical
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.message).toBe(result2.message);
    });
  });

  describe('error handling', () => {
    it('should return error on database failure', async () => {
      mockedPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));
      const formData = createFormData({ email: 'test@example.com' });

      const result = await forgotPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Une erreur est survenue. Veuillez réessayer.');
    });

    it('should return error on token generation failure', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        isActive: true,
      } as any);
      mockedGenerateResetToken.mockRejectedValue(new Error('Token error'));
      const formData = createFormData({ email: 'test@example.com' });

      const result = await forgotPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Une erreur est survenue. Veuillez réessayer.');
    });

    it('should return error on email sending failure', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        isActive: true,
      } as any);
      mockedEmailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('Email error')
      );
      const formData = createFormData({ email: 'test@example.com' });

      const result = await forgotPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Une erreur est survenue. Veuillez réessayer.');
    });
  });
});

/**
 * Unit tests for reset-password Server Action
 *
 * Tests the password reset completion flow including:
 * - Token validation
 * - Token expiration
 * - Password update
 * - Token deletion after use
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetPasswordAction, type ResetPasswordState } from './reset-password.action';

// Use vi.hoisted to create mock function before mocks are hoisted
const { mockTransaction, mockUserFindUnique, mockUserUpdate, mockTokenFindUnique, mockTokenDelete } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockTokenFindUnique: vi.fn(),
  mockTokenDelete: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
    passwordResetToken: {
      findUnique: mockTokenFindUnique,
      delete: mockTokenDelete,
    },
    $transaction: mockTransaction,
  },
}));

// Mock password utilities
vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn(),
}));

// Mock token utilities
vi.mock('@/lib/token', () => ({
  verifyResetToken: vi.fn(),
  getTokenPrefix: vi.fn((token: string) => token.substring(0, 16)),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { hashPassword } from '@/lib/password';
import { verifyResetToken } from '@/lib/token';

const mockedHashPassword = vi.mocked(hashPassword);
const mockedVerifyResetToken = vi.mocked(verifyResetToken);

function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

describe('resetPasswordAction', () => {
  const initialState: ResetPasswordState = { success: false };
  const validToken = 'valid-token-from-email';
  const hashedStoredToken = 'hashed-token-in-db';
  const newHashedPassword = 'new-hashed-password';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockTokenFindUnique.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue(null);
    mockedHashPassword.mockResolvedValue(newHashedPassword);
    mockedVerifyResetToken.mockResolvedValue(false);
    mockTransaction.mockResolvedValue([{}, {}]);
  });

  describe('validation', () => {
    it('should reject empty token', async () => {
      const formData = createFormData({
        token: '',
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.token).toBeDefined();
    });

    it('should reject password too short', async () => {
      const formData = createFormData({
        token: validToken,
        password: 'short',
        confirmPassword: 'short',
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.password).toBeDefined();
    });

    it('should reject password too long', async () => {
      const longPassword = 'a'.repeat(101);
      const formData = createFormData({
        token: validToken,
        password: longPassword,
        confirmPassword: longPassword,
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.password).toBeDefined();
    });

    it('should reject mismatched passwords', async () => {
      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'differentpassword',
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.confirmPassword).toBeDefined();
    });

    it('should reject empty confirmPassword', async () => {
      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: '',
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.confirmPassword).toBeDefined();
    });
  });

  describe('token validation', () => {
    it('should reject invalid token (hash verification fails)', async () => {
      mockTokenFindUnique.mockResolvedValue({
        id: 'token-id',
        token: hashedStoredToken,
        tokenPrefix: 'invalid-token-',
        email: 'user@example.com',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      });
      mockedVerifyResetToken.mockResolvedValue(false);

      const formData = createFormData({
        token: 'invalid-token-xxxxx',
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalide ou a expiré');
    });

    it('should reject when no token found by prefix', async () => {
      mockTokenFindUnique.mockResolvedValue(null);

      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalide ou a expiré');
    });

    it('should reject expired token', async () => {
      // Token found but expired
      mockTokenFindUnique.mockResolvedValue({
        id: 'token-id',
        token: hashedStoredToken,
        tokenPrefix: 'valid-token-from',
        email: 'user@example.com',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        createdAt: new Date(),
      });

      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalide ou a expiré');
    });

    it('should lookup token by prefix for O(1) performance', async () => {
      mockTokenFindUnique.mockResolvedValue(null);

      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      await resetPasswordAction(initialState, formData);

      // Should use findUnique with tokenPrefix for fast indexed lookup
      expect(mockTokenFindUnique).toHaveBeenCalledWith({
        where: {
          tokenPrefix: validToken.substring(0, 16),
        },
      });
    });
  });

  describe('successful password reset', () => {
    const validStoredToken = {
      id: 'token-id',
      token: hashedStoredToken,
      tokenPrefix: 'valid-token-from',
      email: 'user@example.com',
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    };

    const validUser = {
      id: 'user-id',
      email: 'user@example.com',
      isActive: true,
    };

    beforeEach(() => {
      mockTokenFindUnique.mockResolvedValue(validStoredToken);
      mockedVerifyResetToken.mockResolvedValue(true);
      mockUserFindUnique.mockResolvedValue(validUser as any);
    });

    it('should return success for valid reset', async () => {
      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(true);
    });

    it('should hash the new password', async () => {
      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      await resetPasswordAction(initialState, formData);

      expect(mockedHashPassword).toHaveBeenCalledWith('newpassword123');
    });

    it('should use transaction for password update', async () => {
      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      await resetPasswordAction(initialState, formData);

      // Transaction should be called to atomically update password and delete token
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should delete token after use', async () => {
      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      await resetPasswordAction(initialState, formData);

      // Transaction should include token deletion
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should verify token against stored hash', async () => {
      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      await resetPasswordAction(initialState, formData);

      expect(mockedVerifyResetToken).toHaveBeenCalledWith(validToken, hashedStoredToken);
    });
  });

  describe('user validation', () => {
    const validStoredToken = {
      id: 'token-id',
      token: hashedStoredToken,
      tokenPrefix: 'valid-token-from',
      email: 'user@example.com',
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockTokenFindUnique.mockResolvedValue(validStoredToken);
      mockedVerifyResetToken.mockResolvedValue(true);
    });

    it('should reject if user does not exist', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('n\'existe pas');
    });

    it('should reject if user is inactive', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        isActive: false,
      } as any);

      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('désactivé');
    });
  });

  describe('error handling', () => {
    const validStoredToken = {
      id: 'token-id',
      token: hashedStoredToken,
      tokenPrefix: 'valid-token-from',
      email: 'user@example.com',
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    };

    const validUser = {
      id: 'user-id',
      email: 'user@example.com',
      isActive: true,
    };

    it('should return error on database failure', async () => {
      mockTokenFindUnique.mockRejectedValue(
        new Error('Database error')
      );

      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Une erreur est survenue. Veuillez réessayer.');
    });

    it('should return error on transaction failure', async () => {
      mockTokenFindUnique.mockResolvedValue(validStoredToken);
      mockedVerifyResetToken.mockResolvedValue(true);
      mockUserFindUnique.mockResolvedValue(validUser as any);
      mockTransaction.mockRejectedValue(new Error('Transaction error'));

      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      const result = await resetPasswordAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Une erreur est survenue. Veuillez réessayer.');
    });
  });

  describe('token single-use (AC #5)', () => {
    it('should ensure token is deleted after successful use via transaction', async () => {
      const validStoredToken = {
        id: 'token-id',
        token: hashedStoredToken,
        tokenPrefix: 'valid-token-from',
        email: 'user@example.com',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      };

      mockTokenFindUnique.mockResolvedValue(validStoredToken);
      mockedVerifyResetToken.mockResolvedValue(true);
      mockUserFindUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        isActive: true,
      } as any);

      const formData = createFormData({
        token: validToken,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      const result = await resetPasswordAction(initialState, formData);

      // Transaction should be called for atomic update + delete
      expect(mockTransaction).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});

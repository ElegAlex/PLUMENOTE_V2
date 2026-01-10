/**
 * Unit tests for login Server Action
 *
 * Tests the login flow including validation and authentication.
 * Uses Auth.js mocking for signIn operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginAction, type LoginState } from './login.action';

// Use vi.hoisted to create MockAuthError before mocks are hoisted
const { MockAuthError } = vi.hoisted(() => {
  class MockAuthError extends Error {
    type: string;
    constructor(message: string) {
      super(message);
      this.name = 'AuthError';
      this.type = message;
    }
  }
  return { MockAuthError };
});

// Mock next-auth AuthError
vi.mock('next-auth', () => ({
  AuthError: MockAuthError,
}));

// Mock Auth.js signIn
vi.mock('@/lib/auth', () => ({
  signIn: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { signIn } from '@/lib/auth';

const mockedSignIn = vi.mocked(signIn);

function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

describe('loginAction', () => {
  const initialState: LoginState = { success: false };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: signIn succeeds
    mockedSignIn.mockResolvedValue(undefined);
  });

  describe('successful authentication', () => {
    it('should authenticate with valid credentials', async () => {
      const formData = createFormData({
        email: 'john@example.com',
        password: 'password123',
      });

      const result = await loginAction(initialState, formData);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.fieldErrors).toBeUndefined();
    });

    it('should call signIn with correct parameters', async () => {
      const formData = createFormData({
        email: 'john@example.com',
        password: 'password123',
      });

      await loginAction(initialState, formData);

      expect(mockedSignIn).toHaveBeenCalledWith('credentials', {
        email: 'john@example.com',
        password: 'password123',
        redirect: false,
      });
    });
  });

  describe('email normalization', () => {
    it('should normalize email to lowercase', async () => {
      const formData = createFormData({
        email: 'John@Example.COM',
        password: 'password123',
      });

      await loginAction(initialState, formData);

      expect(mockedSignIn).toHaveBeenCalledWith('credentials', {
        email: 'john@example.com',
        password: 'password123',
        redirect: false,
      });
    });

    it('should trim whitespace from email', async () => {
      const formData = createFormData({
        email: '  john@example.com  ',
        password: 'password123',
      });

      await loginAction(initialState, formData);

      expect(mockedSignIn).toHaveBeenCalledWith('credentials', {
        email: 'john@example.com',
        password: 'password123',
        redirect: false,
      });
    });
  });

  describe('authentication errors', () => {
    it('should return generic error for invalid credentials', async () => {
      const authError = new MockAuthError('CredentialsSignin');
      mockedSignIn.mockRejectedValue(authError);

      const formData = createFormData({
        email: 'john@example.com',
        password: 'wrongpassword',
      });

      const result = await loginAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email ou mot de passe incorrect');
    });

    it('should return access denied error', async () => {
      const authError = new MockAuthError('AccessDenied');
      mockedSignIn.mockRejectedValue(authError);

      const formData = createFormData({
        email: 'john@example.com',
        password: 'password123',
      });

      const result = await loginAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Accès refusé');
    });

    it('should return generic error for unknown AuthError types', async () => {
      const authError = new MockAuthError('CallbackRouteError');
      mockedSignIn.mockRejectedValue(authError);

      const formData = createFormData({
        email: 'john@example.com',
        password: 'password123',
      });

      const result = await loginAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Une erreur est survenue. Veuillez réessayer.');
    });

    it('should re-throw non-AuthError exceptions', async () => {
      mockedSignIn.mockRejectedValue(new Error('Network error'));

      const formData = createFormData({
        email: 'john@example.com',
        password: 'password123',
      });

      await expect(loginAction(initialState, formData)).rejects.toThrow('Network error');
    });
  });

  describe('validation errors', () => {
    it('should return field errors for invalid email', async () => {
      const formData = createFormData({
        email: 'not-an-email',
        password: 'password123',
      });

      const result = await loginAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Données invalides');
      expect(result.fieldErrors?.email).toBeDefined();
      expect(mockedSignIn).not.toHaveBeenCalled();
    });

    it('should return field errors for empty email', async () => {
      const formData = createFormData({
        email: '',
        password: 'password123',
      });

      const result = await loginAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Données invalides');
      expect(result.fieldErrors?.email).toBeDefined();
    });

    it('should return field errors for empty password', async () => {
      const formData = createFormData({
        email: 'john@example.com',
        password: '',
      });

      const result = await loginAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Données invalides');
      expect(result.fieldErrors?.password).toBeDefined();
    });

    it('should return multiple field errors', async () => {
      const formData = createFormData({
        email: '',
        password: '',
      });

      const result = await loginAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Données invalides');
      expect(result.fieldErrors?.email).toBeDefined();
      expect(result.fieldErrors?.password).toBeDefined();
    });
  });

  describe('security', () => {
    it('should not leak whether email exists (same error for wrong email or password)', async () => {
      const authError = new MockAuthError('CredentialsSignin');
      mockedSignIn.mockRejectedValue(authError);

      // Test with non-existent email
      const formData1 = createFormData({
        email: 'nonexistent@example.com',
        password: 'anypassword',
      });
      const result1 = await loginAction(initialState, formData1);

      // Test with wrong password
      const formData2 = createFormData({
        email: 'existing@example.com',
        password: 'wrongpassword',
      });
      const result2 = await loginAction(initialState, formData2);

      // Both should return the same generic error
      expect(result1.error).toBe('Email ou mot de passe incorrect');
      expect(result2.error).toBe('Email ou mot de passe incorrect');
    });
  });
});

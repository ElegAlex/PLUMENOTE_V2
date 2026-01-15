/**
 * Unit tests for register Server Action
 *
 * Tests the registration flow including validation and user creation.
 * Uses Prisma mocking for database operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerAction, type RegisterState } from './register.action';

// Mock transaction helper
const mockTx = {
  user: {
    create: vi.fn(),
  },
  workspace: {
    create: vi.fn(),
  },
  invitation: {
    update: vi.fn(),
  },
};

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    invitation: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx)),
  },
}));

// Mock password utilities
vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2a$10$hashedpassword'),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

const mockedPrisma = vi.mocked(prisma);
const mockedHashPassword = vi.mocked(hashPassword);

function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

describe('registerAction', () => {
  const initialState: RegisterState = { success: false };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing user
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    // Default: user creation succeeds (inside transaction - Story 8.5)
    mockTx.user.create.mockResolvedValue({
      id: 'new-user-id',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: null,
      image: null,
      password: '$2a$10$hashedpassword',
      avatar: null,
      role: 'VIEWER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Default: personal workspace creation succeeds (Story 8.5)
    mockTx.workspace.create.mockResolvedValue({
      id: 'personal-workspace-id',
      name: 'Mon espace',
      isPersonal: true,
    });
  });

  describe('successful registration', () => {
    it('should create a new user with valid data', async () => {
      const formData = createFormData({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      const result = await registerAction(initialState, formData);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.fieldErrors).toBeUndefined();
    });

    it('should hash the password before storing', async () => {
      const formData = createFormData({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      await registerAction(initialState, formData);

      expect(mockedHashPassword).toHaveBeenCalledWith('password123');
      // Story 8.5: User creation happens inside transaction
      expect(mockTx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          password: '$2a$10$hashedpassword',
        }),
        select: { id: true },
      });
    });

    it('should create user with VIEWER role by default', async () => {
      const formData = createFormData({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      await registerAction(initialState, formData);

      // Story 8.5: User creation happens inside transaction
      expect(mockTx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'VIEWER',
        }),
        select: { id: true },
      });
    });

    // Story 8.5: Personal workspace creation on registration
    it('should create personal workspace for new user', async () => {
      const formData = createFormData({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      await registerAction(initialState, formData);

      expect(mockTx.workspace.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Mon espace',
          isPersonal: true,
          ownerId: 'new-user-id',
        }),
        select: { id: true },
      });
    });

    it('should check for existing user before creating', async () => {
      const formData = createFormData({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      await registerAction(initialState, formData);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        select: { id: true },
      });
    });
  });

  describe('duplicate email handling', () => {
    it('should return error when email already exists', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user-id',
        name: 'Existing User',
        email: 'existing@example.com',
        emailVerified: null,
        image: null,
        password: '$2a$10$existinghash',
        avatar: null,
        role: 'VIEWER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const formData = createFormData({
        name: 'John Doe',
        email: 'existing@example.com',
        password: 'password123',
      });

      const result = await registerAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Un compte existe déjà avec cet email');
      // Story 8.5: Transaction shouldn't be called when user already exists
      expect(mockTx.user.create).not.toHaveBeenCalled();
    });
  });

  describe('email normalization', () => {
    it('should normalize email to lowercase', async () => {
      const formData = createFormData({
        name: 'John Doe',
        email: 'John@Example.COM',
        password: 'password123',
      });

      await registerAction(initialState, formData);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        select: { id: true },
      });
      // Story 8.5: User creation happens inside transaction
      expect(mockTx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'john@example.com',
        }),
        select: { id: true },
      });
    });

    it('should trim whitespace from email', async () => {
      const formData = createFormData({
        name: 'John Doe',
        email: '  john@example.com  ',
        password: 'password123',
      });

      await registerAction(initialState, formData);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        select: { id: true },
      });
    });

    it('should trim whitespace from name', async () => {
      const formData = createFormData({
        name: '  John Doe  ',
        email: 'john@example.com',
        password: 'password123',
      });

      await registerAction(initialState, formData);

      // Story 8.5: User creation happens inside transaction
      expect(mockTx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'John Doe',
        }),
        select: { id: true },
      });
    });
  });

  describe('error handling', () => {
    it('should return error when database operation fails', async () => {
      // Story 8.5: Error in transaction causes the whole transaction to fail
      mockTx.user.create.mockRejectedValue(new Error('Database connection failed'));

      const formData = createFormData({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      const result = await registerAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Une erreur est survenue lors de la création du compte. Veuillez réessayer.');
    });
  });

  describe('validation errors', () => {
    it('should return field errors for invalid name', async () => {
      const formData = createFormData({
        name: 'J', // Too short
        email: 'john@example.com',
        password: 'password123',
      });

      const result = await registerAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Données invalides');
      expect(result.fieldErrors?.name).toBeDefined();
      // Story 8.5: Transaction shouldn't be called on validation error
      expect(mockTx.user.create).not.toHaveBeenCalled();
    });

    it('should return field errors for invalid email', async () => {
      const formData = createFormData({
        name: 'John Doe',
        email: 'not-an-email',
        password: 'password123',
      });

      const result = await registerAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Données invalides');
      expect(result.fieldErrors?.email).toBeDefined();
      // Story 8.5: Transaction shouldn't be called on validation error
      expect(mockTx.user.create).not.toHaveBeenCalled();
    });

    it('should return field errors for short password', async () => {
      const formData = createFormData({
        name: 'John Doe',
        email: 'john@example.com',
        password: '1234567', // Too short
      });

      const result = await registerAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Données invalides');
      expect(result.fieldErrors?.password).toBeDefined();
      // Story 8.5: Transaction shouldn't be called on validation error
      expect(mockTx.user.create).not.toHaveBeenCalled();
    });

    it('should return multiple field errors', async () => {
      const formData = createFormData({
        name: 'J', // Too short
        email: 'not-an-email',
        password: '123', // Too short
      });

      const result = await registerAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Données invalides');
      expect(result.fieldErrors?.name).toBeDefined();
      expect(result.fieldErrors?.email).toBeDefined();
      expect(result.fieldErrors?.password).toBeDefined();
    });
  });
});

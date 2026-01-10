/**
 * Unit tests for updateProfile Server Action
 *
 * Tests validation, authentication, database updates, and error handling.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #1: Modify name with toast confirmation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateProfileAction, type UpdateProfileState } from './update-profile.action';

// Mock dependencies
const mockAuth = vi.fn();
const mockPrismaUpdate = vi.fn();
const mockPrismaFindUnique = vi.fn();
const mockRevalidatePath = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: (...args: unknown[]) => mockPrismaUpdate(...args),
      findUnique: (...args: unknown[]) => mockPrismaFindUnique(...args),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

// Helper to create FormData
function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }
  return formData;
}

describe('updateProfileAction', () => {
  const initialState: UpdateProfileState = { success: false };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user is authenticated
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    });
    mockPrismaUpdate.mockResolvedValue({ id: 'user-123', name: 'New Name' });
  });

  describe('authentication', () => {
    it('should return error if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const formData = createFormData({ name: 'John' });
      const result = await updateProfileAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vous devez etre connecte pour modifier votre profil.');
    });

    it('should return error if session has no user id', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@example.com' } });

      const formData = createFormData({ name: 'John' });
      const result = await updateProfileAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vous devez etre connecte pour modifier votre profil.');
    });
  });

  describe('validation', () => {
    it('should reject name exceeding 100 characters', async () => {
      const formData = createFormData({ name: 'a'.repeat(101) });
      const result = await updateProfileAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Donnees invalides');
      expect(result.fieldErrors?.name).toBeDefined();
    });

    it('should accept empty name', async () => {
      const formData = createFormData({ name: '' });
      const result = await updateProfileAction(initialState, formData);

      expect(result.success).toBe(true);
      expect(mockPrismaUpdate).toHaveBeenCalled();
    });

    it('should trim whitespace from name', async () => {
      const formData = createFormData({ name: '  John Doe  ' });
      await updateProfileAction(initialState, formData);

      expect(mockPrismaUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'John Doe' }),
        })
      );
    });
  });

  describe('successful update', () => {
    it('should update user name in database', async () => {
      const formData = createFormData({ name: 'John Doe' });
      const result = await updateProfileAction(initialState, formData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Profil mis a jour avec succes.');
      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { name: 'John Doe' },
      });
    });

    it('should set name to null for empty string', async () => {
      const formData = createFormData({ name: '' });
      await updateProfileAction(initialState, formData);

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { name: null },
      });
    });

    it('should revalidate paths after update', async () => {
      const formData = createFormData({ name: 'John' });
      await updateProfileAction(initialState, formData);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/settings/profile');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/');
    });

    it('should log successful update', async () => {
      const formData = createFormData({ name: 'John' });
      await updateProfileAction(initialState, formData);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        { userId: 'user-123' },
        'Profile updated'
      );
    });
  });

  describe('error handling', () => {
    it('should return error on database failure', async () => {
      mockPrismaUpdate.mockRejectedValue(new Error('Database error'));

      const formData = createFormData({ name: 'John' });
      const result = await updateProfileAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Une erreur est survenue. Veuillez reessayer.');
    });

    it('should log database errors', async () => {
      const dbError = new Error('Database error');
      mockPrismaUpdate.mockRejectedValue(dbError);

      const formData = createFormData({ name: 'John' });
      await updateProfileAction(initialState, formData);

      expect(mockLoggerError).toHaveBeenCalledWith(
        { userId: 'user-123', error: dbError },
        'Error updating profile'
      );
    });
  });

  describe('special characters in name', () => {
    it('should accept name with accents', async () => {
      const formData = createFormData({ name: 'François' });
      const result = await updateProfileAction(initialState, formData);

      expect(result.success).toBe(true);
    });

    it('should accept name with hyphen', async () => {
      const formData = createFormData({ name: 'Jean-Pierre' });
      const result = await updateProfileAction(initialState, formData);

      expect(result.success).toBe(true);
    });

    it('should accept name with apostrophe', async () => {
      const formData = createFormData({ name: "O'Connor" });
      const result = await updateProfileAction(initialState, formData);

      expect(result.success).toBe(true);
    });
  });
});

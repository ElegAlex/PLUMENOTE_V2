/**
 * Unit tests for deleteAvatar Server Action
 *
 * Tests authentication, avatar deletion, and error handling.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #4: Delete avatar
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteAvatarAction, type DeleteAvatarState } from './delete-avatar.action';

// Mock dependencies
const mockAuth = vi.fn();
const mockPrismaUpdate = vi.fn();
const mockPrismaFindUnique = vi.fn();
const mockRevalidatePath = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();
const mockFileStorageDelete = vi.fn();

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

vi.mock('@/lib/file-storage', () => ({
  fileStorage: {
    delete: (...args: unknown[]) => mockFileStorageDelete(...args),
  },
}));

describe('deleteAvatarAction', () => {
  const initialState: DeleteAvatarState = { success: false };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user is authenticated with an existing avatar
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    });
    mockPrismaFindUnique.mockResolvedValue({
      id: 'user-123',
      avatar: '/uploads/avatars/user-123-123.jpg',
    });
    mockPrismaUpdate.mockResolvedValue({ id: 'user-123', avatar: null });
    mockFileStorageDelete.mockResolvedValue(undefined);
  });

  describe('authentication', () => {
    it('should return error if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await deleteAvatarAction(initialState);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vous devez etre connecte pour supprimer votre avatar.');
    });

    it('should return error if session has no user id', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@example.com' } });

      const result = await deleteAvatarAction(initialState);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vous devez etre connecte pour supprimer votre avatar.');
    });
  });

  describe('no avatar to delete', () => {
    it('should return error if user has no avatar', async () => {
      mockPrismaFindUnique.mockResolvedValue({ id: 'user-123', avatar: null });

      const result = await deleteAvatarAction(initialState);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Aucun avatar a supprimer.');
    });
  });

  describe('successful deletion', () => {
    it('should delete file and update database (AC #4)', async () => {
      const result = await deleteAvatarAction(initialState);

      expect(result.success).toBe(true);
      expect(mockFileStorageDelete).toHaveBeenCalledWith('avatars/user-123-123.jpg');
      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { avatar: null },
      });
    });

    it('should revalidate paths after deletion', async () => {
      await deleteAvatarAction(initialState);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/settings/profile');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/');
    });

    it('should log successful deletion', async () => {
      await deleteAvatarAction(initialState);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123' }),
        'Avatar deleted'
      );
    });
  });

  describe('error handling', () => {
    it('should return error on file deletion failure', async () => {
      mockFileStorageDelete.mockRejectedValue(new Error('Permission denied'));

      const result = await deleteAvatarAction(initialState);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Une erreur est survenue lors de la suppression.');
    });

    it('should return error on database failure', async () => {
      mockPrismaUpdate.mockRejectedValue(new Error('Database error'));

      const result = await deleteAvatarAction(initialState);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Une erreur est survenue lors de la suppression.');
    });

    it('should log errors', async () => {
      const error = new Error('Deletion failed');
      mockFileStorageDelete.mockRejectedValue(error);

      await deleteAvatarAction(initialState);

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123', error }),
        'Error deleting avatar'
      );
    });
  });
});

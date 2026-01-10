/**
 * Unit tests for uploadAvatar Server Action
 *
 * Tests validation, authentication, file upload, and error handling.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #2: Upload avatar (JPG/PNG, max 2MB)
 * @see AC #5: Reject non JPG/PNG files
 * @see AC #6: Reject files > 2MB
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadAvatarAction, type UploadAvatarState } from './upload-avatar.action';

// Mock dependencies
const mockAuth = vi.fn();
const mockPrismaUpdate = vi.fn();
const mockPrismaFindUnique = vi.fn();
const mockRevalidatePath = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();
const mockFileStorageSave = vi.fn();
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
    save: (...args: unknown[]) => mockFileStorageSave(...args),
    delete: (...args: unknown[]) => mockFileStorageDelete(...args),
  },
}));

// Helper to create a mock File with proper arrayBuffer
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  // Create actual content for the file
  const content = new Uint8Array(size);
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });

  // Polyfill arrayBuffer if not available
  if (!file.arrayBuffer) {
    (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer = async () => {
      return content.buffer;
    };
  }

  return file;
}

// Helper to create FormData with a file
function createFormDataWithFile(file: File): FormData {
  const formData = new FormData();
  formData.append('avatar', file);
  return formData;
}

describe('uploadAvatarAction', () => {
  const initialState: UploadAvatarState = { success: false };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user is authenticated with no existing avatar
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    });
    mockPrismaFindUnique.mockResolvedValue({ id: 'user-123', avatar: null });
    mockPrismaUpdate.mockResolvedValue({ id: 'user-123', avatar: '/uploads/avatars/user-123-123.jpg' });
    mockFileStorageSave.mockResolvedValue(undefined);
    mockFileStorageDelete.mockResolvedValue(undefined);
  });

  describe('authentication', () => {
    it('should return error if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const file = createMockFile('avatar.jpg', 1024, 'image/jpeg');
      const formData = createFormDataWithFile(file);
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vous devez etre connecte pour uploader un avatar.');
    });

    it('should return error if session has no user id', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@example.com' } });

      const file = createMockFile('avatar.jpg', 1024, 'image/jpeg');
      const formData = createFormDataWithFile(file);
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vous devez etre connecte pour uploader un avatar.');
    });
  });

  describe('file validation', () => {
    it('should return error if no file is provided', async () => {
      const formData = new FormData();
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Aucun fichier selectionne.');
    });

    it('should reject GIF files (AC #5)', async () => {
      const file = createMockFile('avatar.gif', 1024, 'image/gif');
      const formData = createFormDataWithFile(file);
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Format non supporte (JPG, PNG uniquement)');
    });

    it('should reject WebP files (AC #5)', async () => {
      const file = createMockFile('avatar.webp', 1024, 'image/webp');
      const formData = createFormDataWithFile(file);
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Format non supporte (JPG, PNG uniquement)');
    });

    it('should reject PDF files (AC #5)', async () => {
      const file = createMockFile('document.pdf', 1024, 'application/pdf');
      const formData = createFormDataWithFile(file);
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Format non supporte (JPG, PNG uniquement)');
    });

    it('should reject files over 2MB (AC #6)', async () => {
      const file = createMockFile('avatar.jpg', 3 * 1024 * 1024, 'image/jpeg');
      const formData = createFormDataWithFile(file);
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Le fichier ne doit pas depasser 2MB');
    });

    it('should accept JPEG files under 2MB (AC #2)', async () => {
      const file = createMockFile('avatar.jpg', 1024, 'image/jpeg');
      const formData = createFormDataWithFile(file);
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(true);
    });

    it('should accept PNG files under 2MB (AC #2)', async () => {
      const file = createMockFile('avatar.png', 1024, 'image/png');
      const formData = createFormDataWithFile(file);
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(true);
    });
  });

  describe('successful upload', () => {
    it('should save file and update database', async () => {
      const file = createMockFile('avatar.jpg', 1024, 'image/jpeg');
      const formData = createFormDataWithFile(file);
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(true);
      expect(result.avatarUrl).toMatch(/^\/uploads\/avatars\/user-123-\d+\.jpg$/);
      expect(mockFileStorageSave).toHaveBeenCalled();
      expect(mockPrismaUpdate).toHaveBeenCalled();
    });

    it('should use .png extension for PNG files', async () => {
      const file = createMockFile('avatar.png', 1024, 'image/png');
      const formData = createFormDataWithFile(file);
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(true);
      expect(result.avatarUrl).toMatch(/\.png$/);
    });

    it('should delete old avatar if exists', async () => {
      mockPrismaFindUnique.mockResolvedValue({
        id: 'user-123',
        avatar: '/uploads/avatars/old-avatar.jpg',
      });

      const file = createMockFile('avatar.jpg', 1024, 'image/jpeg');
      const formData = createFormDataWithFile(file);
      await uploadAvatarAction(initialState, formData);

      expect(mockFileStorageDelete).toHaveBeenCalledWith('avatars/old-avatar.jpg');
    });

    it('should not try to delete if no existing avatar', async () => {
      mockPrismaFindUnique.mockResolvedValue({ id: 'user-123', avatar: null });

      const file = createMockFile('avatar.jpg', 1024, 'image/jpeg');
      const formData = createFormDataWithFile(file);
      await uploadAvatarAction(initialState, formData);

      expect(mockFileStorageDelete).not.toHaveBeenCalled();
    });

    it('should revalidate paths after upload', async () => {
      const file = createMockFile('avatar.jpg', 1024, 'image/jpeg');
      const formData = createFormDataWithFile(file);
      await uploadAvatarAction(initialState, formData);

      expect(mockRevalidatePath).toHaveBeenCalledWith('/settings/profile');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/');
    });

    it('should log successful upload', async () => {
      const file = createMockFile('avatar.jpg', 1024, 'image/jpeg');
      const formData = createFormDataWithFile(file);
      await uploadAvatarAction(initialState, formData);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123' }),
        'Avatar uploaded'
      );
    });
  });

  describe('error handling', () => {
    it('should return error on file save failure', async () => {
      mockFileStorageSave.mockRejectedValue(new Error('Disk full'));

      const file = createMockFile('avatar.jpg', 1024, 'image/jpeg');
      const formData = createFormDataWithFile(file);
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Une erreur est survenue lors de l'upload.");
    });

    it('should return error on database failure', async () => {
      mockPrismaUpdate.mockRejectedValue(new Error('Database error'));

      const file = createMockFile('avatar.jpg', 1024, 'image/jpeg');
      const formData = createFormDataWithFile(file);
      const result = await uploadAvatarAction(initialState, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Une erreur est survenue lors de l'upload.");
    });

    it('should log errors', async () => {
      const error = new Error('Upload failed');
      mockFileStorageSave.mockRejectedValue(error);

      const file = createMockFile('avatar.jpg', 1024, 'image/jpeg');
      const formData = createFormDataWithFile(file);
      await uploadAvatarAction(initialState, formData);

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123', error }),
        'Error uploading avatar'
      );
    });
  });
});

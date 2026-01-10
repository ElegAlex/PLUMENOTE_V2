/**
 * Unit tests for file storage service
 *
 * Tests file save, delete, and exists operations for local filesystem storage.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #2: Save uploaded avatar
 * @see AC #4: Delete avatar
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalFileStorage, fileStorage } from './file-storage';

// Mock fs/promises with default export
const mockMkdir = vi.fn();
const mockWriteFile = vi.fn();
const mockUnlink = vi.fn();
const mockAccess = vi.fn();

vi.mock('fs/promises', () => ({
  default: {
    mkdir: (...args: unknown[]) => mockMkdir(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    unlink: (...args: unknown[]) => mockUnlink(...args),
    access: (...args: unknown[]) => mockAccess(...args),
  },
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
  access: (...args: unknown[]) => mockAccess(...args),
}));

describe('LocalFileStorage', () => {
  let storage: LocalFileStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new LocalFileStorage();
  });

  describe('save', () => {
    it('should create directory and save file', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const data = Buffer.from('test data');
      await storage.save('avatars/test.jpg', data);

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('avatars'),
        { recursive: true }
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('test.jpg'),
        data
      );
    });

    it('should handle nested directories', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const data = Buffer.from('test data');
      await storage.save('a/b/c/file.png', data);

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('a'),
        { recursive: true }
      );
    });

    it('should propagate write errors', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockRejectedValue(new Error('Disk full'));

      const data = Buffer.from('test data');
      await expect(storage.save('test.jpg', data)).rejects.toThrow('Disk full');
    });
  });

  describe('delete', () => {
    it('should delete existing file', async () => {
      mockUnlink.mockResolvedValue(undefined);

      await storage.delete('avatars/test.jpg');

      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('test.jpg')
      );
    });

    it('should silently ignore non-existent files', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockUnlink.mockRejectedValue(error);

      await expect(storage.delete('nonexistent.jpg')).resolves.not.toThrow();
    });

    it('should propagate other errors', async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      mockUnlink.mockRejectedValue(error);

      await expect(storage.delete('test.jpg')).rejects.toThrow('Permission denied');
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      mockAccess.mockResolvedValue(undefined);

      const result = await storage.exists('avatars/test.jpg');

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith(
        expect.stringContaining('test.jpg')
      );
    });

    it('should return false for non-existent file', async () => {
      mockAccess.mockRejectedValue(new Error('Not found'));

      const result = await storage.exists('nonexistent.jpg');

      expect(result).toBe(false);
    });
  });
});

describe('fileStorage singleton', () => {
  it('should be an instance of LocalFileStorage', () => {
    expect(fileStorage).toBeInstanceOf(LocalFileStorage);
  });
});

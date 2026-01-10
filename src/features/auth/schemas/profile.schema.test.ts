/**
 * Unit tests for profile validation schemas
 *
 * Tests for updateProfileSchema and avatarFileSchema.
 * All error messages should be in French.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #1: Modify name with validation
 * @see AC #5: Reject non JPG/PNG files
 * @see AC #6: Reject files > 2MB
 */

import { describe, it, expect } from 'vitest';
import {
  updateProfileSchema,
  avatarFileSchema,
  MAX_FILE_SIZE,
  ACCEPTED_IMAGE_TYPES,
} from './profile.schema';

describe('updateProfileSchema', () => {
  describe('name field', () => {
    it('should accept valid name', () => {
      const result = updateProfileSchema.safeParse({ name: 'John Doe' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
      }
    });

    it('should accept empty string as name', () => {
      const result = updateProfileSchema.safeParse({ name: '' });
      expect(result.success).toBe(true);
    });

    it('should accept null as name', () => {
      const result = updateProfileSchema.safeParse({ name: null });
      expect(result.success).toBe(true);
    });

    it('should accept undefined as name (optional field)', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject name exceeding 100 characters', () => {
      const longName = 'a'.repeat(101);
      const result = updateProfileSchema.safeParse({ name: longName });
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 uses issues instead of errors
        const issues = result.error.issues || result.error.errors;
        expect(issues[0].message).toBe(
          'Le nom ne peut pas depasser 100 caracteres'
        );
      }
    });

    it('should accept name with exactly 100 characters', () => {
      const name = 'a'.repeat(100);
      const result = updateProfileSchema.safeParse({ name });
      expect(result.success).toBe(true);
    });

    it('should trim whitespace from name', () => {
      const result = updateProfileSchema.safeParse({ name: '  John Doe  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
      }
    });

    it('should accept name with special characters', () => {
      const result = updateProfileSchema.safeParse({ name: 'Jean-Pierre O\'Connor' });
      expect(result.success).toBe(true);
    });

    it('should accept name with accented characters', () => {
      const result = updateProfileSchema.safeParse({ name: 'François Müller' });
      expect(result.success).toBe(true);
    });
  });
});

describe('avatarFileSchema', () => {
  // Helper to create a mock File
  function createMockFile(
    name: string,
    size: number,
    type: string
  ): File {
    const buffer = new ArrayBuffer(size);
    return new File([buffer], name, { type });
  }

  describe('file type validation', () => {
    it('should accept JPEG files', () => {
      const file = createMockFile('avatar.jpg', 1024, 'image/jpeg');
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(true);
    });

    it('should accept PNG files', () => {
      const file = createMockFile('avatar.png', 1024, 'image/png');
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(true);
    });

    it('should reject GIF files', () => {
      const file = createMockFile('avatar.gif', 1024, 'image/gif');
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 uses issues instead of errors
        const issues = result.error.issues || result.error.errors;
        expect(issues[0].message).toBe(
          'Format non supporte (JPG, PNG uniquement)'
        );
      }
    });

    it('should reject WebP files', () => {
      const file = createMockFile('avatar.webp', 1024, 'image/webp');
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(false);
    });

    it('should reject PDF files', () => {
      const file = createMockFile('document.pdf', 1024, 'application/pdf');
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(false);
    });

    it('should reject text files', () => {
      const file = createMockFile('file.txt', 1024, 'text/plain');
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(false);
    });
  });

  describe('file size validation', () => {
    it('should accept file under 2MB', () => {
      const file = createMockFile('avatar.jpg', 1 * 1024 * 1024, 'image/jpeg'); // 1MB
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(true);
    });

    it('should accept file exactly 2MB', () => {
      const file = createMockFile('avatar.jpg', MAX_FILE_SIZE, 'image/jpeg');
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(true);
    });

    it('should reject file over 2MB', () => {
      const file = createMockFile('avatar.jpg', MAX_FILE_SIZE + 1, 'image/jpeg');
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 uses issues instead of errors
        const issues = result.error.issues || result.error.errors;
        expect(issues[0].message).toBe(
          'Le fichier ne doit pas depasser 2MB'
        );
      }
    });

    it('should reject file significantly over 2MB', () => {
      const file = createMockFile('avatar.jpg', 5 * 1024 * 1024, 'image/jpeg'); // 5MB
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(false);
    });

    it('should accept very small file', () => {
      const file = createMockFile('avatar.jpg', 100, 'image/jpeg'); // 100 bytes
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(true);
    });
  });

  describe('combined validation', () => {
    it('should reject wrong type even if size is valid', () => {
      const file = createMockFile('avatar.gif', 1024, 'image/gif');
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(false);
    });

    it('should reject oversized file even if type is valid', () => {
      const file = createMockFile('avatar.jpg', 3 * 1024 * 1024, 'image/jpeg');
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(false);
    });

    it('should reject file with both invalid type and size', () => {
      const file = createMockFile('document.pdf', 5 * 1024 * 1024, 'application/pdf');
      const result = avatarFileSchema.safeParse({ file });
      expect(result.success).toBe(false);
    });
  });

  describe('constants', () => {
    it('should export MAX_FILE_SIZE as 2MB', () => {
      expect(MAX_FILE_SIZE).toBe(2 * 1024 * 1024);
    });

    it('should export ACCEPTED_IMAGE_TYPES with jpeg and png', () => {
      expect(ACCEPTED_IMAGE_TYPES).toContain('image/jpeg');
      expect(ACCEPTED_IMAGE_TYPES).toContain('image/png');
      expect(ACCEPTED_IMAGE_TYPES).toHaveLength(2);
    });
  });
});

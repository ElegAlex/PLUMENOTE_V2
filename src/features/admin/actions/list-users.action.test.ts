/**
 * Unit tests for list users action
 *
 * @see Story 2.7 - Désactivation de Compte Utilisateur (FR6)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the action
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { listUsersAction } from './list-users.action';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

describe('listUsersAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication checks', () => {
    it('should return error if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await listUsersAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain('connecté');
    });

    it('should return error if user is not admin', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', role: 'VIEWER', name: 'Test' },
        expires: '',
      });

      const result = await listUsersAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain('administrateurs');
    });
  });

  describe('listing users', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', name: 'Admin' },
        expires: '',
      });
    });

    it('should return empty array when no users exist', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const result = await listUsersAction();

      expect(result.success).toBe(true);
      expect(result.users).toEqual([]);
    });

    it('should return users with correct fields', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'EDITOR' as const,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'admin-1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN' as const,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

      const result = await listUsersAction();

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(2);
      expect(result.users?.[0].email).toBe('test@example.com');
    });

    it('should include inactive users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'Inactive User',
          email: 'inactive@example.com',
          role: 'VIEWER' as const,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

      const result = await listUsersAction();

      expect(result.success).toBe(true);
      expect(result.users?.[0].isActive).toBe(false);
    });

    it('should not include password field', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-1',
          name: 'Test',
          email: 'test@example.com',
          role: 'VIEWER' as const,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await listUsersAction();

      expect(result.success).toBe(true);
      // Check that findMany was called with select that excludes password
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({
            password: true,
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', name: 'Admin' },
        expires: '',
      });
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('DB Error'));

      const result = await listUsersAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain('erreur est survenue');
    });
  });
});

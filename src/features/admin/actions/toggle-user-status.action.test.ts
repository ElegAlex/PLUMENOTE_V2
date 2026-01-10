/**
 * Unit tests for toggle user status action
 *
 * @see Story 2.7 - Désactivation de Compte Utilisateur (FR6)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the action
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { toggleUserStatusAction } from './toggle-user-status.action';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

describe('toggleUserStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication checks', () => {
    it('should return error if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await toggleUserStatusAction('user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('connecté');
    });

    it('should return error if user is not admin', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', role: 'VIEWER', name: 'Test' },
        expires: '',
      });

      const result = await toggleUserStatusAction('user-2');

      expect(result.success).toBe(false);
      expect(result.error).toContain('administrateurs');
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', name: 'Admin' },
        expires: '',
      });
    });

    it('should return error for empty user id', async () => {
      const result = await toggleUserStatusAction('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalide');
    });

    it('should return error if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await toggleUserStatusAction('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('introuvable');
    });

    it('should prevent admin from deactivating own account', async () => {
      const result = await toggleUserStatusAction('admin-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('propre compte');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('toggle logic', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', name: 'Admin' },
        expires: '',
      });
    });

    it('should deactivate an active user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        isActive: true,
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await toggleUserStatusAction('user-1');

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(false);
      expect(result.message).toContain('désactivé');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isActive: false },
      });
    });

    it('should reactivate an inactive user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        isActive: false,
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await toggleUserStatusAction('user-1');

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(true);
      expect(result.message).toContain('réactivé');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isActive: true },
      });
    });

    it('should use email if name is not set', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: null,
        isActive: true,
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await toggleUserStatusAction('user-1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('user@example.com');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', name: 'Admin' },
        expires: '',
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test',
        isActive: true,
      } as never);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.user.update).mockRejectedValue(new Error('DB Error'));

      const result = await toggleUserStatusAction('user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('erreur est survenue');
    });
  });
});

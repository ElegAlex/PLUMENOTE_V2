/**
 * Unit tests for cancel invitation action
 *
 * @see Story 2.6 - Invitation de Nouveaux Utilisateurs (FR5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the action
vi.mock('@/lib/prisma', () => ({
  prisma: {
    invitation: {
      findUnique: vi.fn(),
      delete: vi.fn(),
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

import { cancelInvitationAction } from './cancel-invitation.action';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

describe('cancelInvitationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication checks', () => {
    it('should return error if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await cancelInvitationAction('inv-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('connecté');
    });

    it('should return error if user is not admin', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', role: 'VIEWER', name: 'Test' },
        expires: '',
      });

      const result = await cancelInvitationAction('inv-1');

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

    it('should return error for empty invitation id', async () => {
      const result = await cancelInvitationAction('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalide');
    });

    it('should return error if invitation not found', async () => {
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue(null);

      const result = await cancelInvitationAction('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('introuvable');
    });
  });

  describe('cancellation logic', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', name: 'Admin' },
        expires: '',
      });
    });

    it('should return error if invitation was already used', async () => {
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        id: 'inv-1',
        email: 'used@example.com',
        usedAt: new Date(),
      } as never);

      const result = await cancelInvitationAction('inv-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('déjà été utilisée');
      expect(prisma.invitation.delete).not.toHaveBeenCalled();
    });

    it('should delete pending invitation successfully', async () => {
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        id: 'inv-1',
        email: 'pending@example.com',
        usedAt: null,
      } as never);
      vi.mocked(prisma.invitation.delete).mockResolvedValue({} as never);

      const result = await cancelInvitationAction('inv-1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('pending@example.com');
      expect(prisma.invitation.delete).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', name: 'Admin' },
        expires: '',
      });
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        id: 'inv-1',
        email: 'test@example.com',
        usedAt: null,
      } as never);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.invitation.delete).mockRejectedValue(
        new Error('DB Error')
      );

      const result = await cancelInvitationAction('inv-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('erreur est survenue');
    });
  });
});

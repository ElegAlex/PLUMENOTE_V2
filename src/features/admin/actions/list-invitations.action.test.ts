/**
 * Unit tests for list invitations action
 *
 * @see Story 2.6 - Invitation de Nouveaux Utilisateurs (FR5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the action
vi.mock('@/lib/prisma', () => ({
  prisma: {
    invitation: {
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

import { listInvitationsAction } from './list-invitations.action';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

describe('listInvitationsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication checks', () => {
    it('should return error if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await listInvitationsAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain('connecté');
    });

    it('should return error if user is not admin', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', role: 'VIEWER', name: 'Test' },
        expires: '',
      });

      const result = await listInvitationsAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain('administrateurs');
    });
  });

  describe('listing invitations', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', name: 'Admin' },
        expires: '',
      });
    });

    it('should return empty array when no invitations exist', async () => {
      vi.mocked(prisma.invitation.findMany).mockResolvedValue([]);

      const result = await listInvitationsAction();

      expect(result.success).toBe(true);
      expect(result.invitations).toEqual([]);
    });

    it('should return invitations with correct status - pending', async () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      vi.mocked(prisma.invitation.findMany).mockResolvedValue([
        {
          id: 'inv-1',
          email: 'pending@example.com',
          token: 'token1',
          createdAt: new Date(),
          expiresAt: futureDate,
          usedAt: null,
          invitedById: 'admin-1',
          invitedBy: { id: 'admin-1', name: 'Admin', email: 'admin@example.com' },
        },
      ] as never);

      const result = await listInvitationsAction();

      expect(result.success).toBe(true);
      expect(result.invitations?.[0].status).toBe('pending');
    });

    it('should return invitations with correct status - used', async () => {
      vi.mocked(prisma.invitation.findMany).mockResolvedValue([
        {
          id: 'inv-2',
          email: 'used@example.com',
          token: 'token2',
          createdAt: new Date(),
          expiresAt: new Date(),
          usedAt: new Date(),
          invitedById: 'admin-1',
          invitedBy: { id: 'admin-1', name: 'Admin', email: 'admin@example.com' },
        },
      ] as never);

      const result = await listInvitationsAction();

      expect(result.success).toBe(true);
      expect(result.invitations?.[0].status).toBe('used');
    });

    it('should return invitations with correct status - expired', async () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      vi.mocked(prisma.invitation.findMany).mockResolvedValue([
        {
          id: 'inv-3',
          email: 'expired@example.com',
          token: 'token3',
          createdAt: new Date(Date.now() - 172800000),
          expiresAt: pastDate,
          usedAt: null,
          invitedById: 'admin-1',
          invitedBy: { id: 'admin-1', name: 'Admin', email: 'admin@example.com' },
        },
      ] as never);

      const result = await listInvitationsAction();

      expect(result.success).toBe(true);
      expect(result.invitations?.[0].status).toBe('expired');
    });

    it('should include invitedBy information', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      vi.mocked(prisma.invitation.findMany).mockResolvedValue([
        {
          id: 'inv-1',
          email: 'test@example.com',
          token: 'token1',
          createdAt: new Date(),
          expiresAt: futureDate,
          usedAt: null,
          invitedById: 'admin-1',
          invitedBy: {
            id: 'admin-1',
            name: 'Admin User',
            email: 'admin@example.com',
          },
        },
      ] as never);

      const result = await listInvitationsAction();

      expect(result.success).toBe(true);
      expect(result.invitations?.[0].invitedBy.name).toBe('Admin User');
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
      vi.mocked(prisma.invitation.findMany).mockRejectedValue(
        new Error('DB Error')
      );

      const result = await listInvitationsAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain('erreur est survenue');
    });
  });
});

/**
 * Unit tests for send invitation action
 *
 * @see Story 2.6 - Invitation de Nouveaux Utilisateurs (FR5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the action
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    invitation: {
      findFirst: vi.fn(),
      create: vi.fn(),
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

vi.mock('@/lib/email', () => ({
  emailService: {
    sendInvitationEmail: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { sendInvitationAction } from './send-invitation.action';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { emailService } from '@/lib/email';

describe('sendInvitationAction', () => {
  const mockFormData = (email: string) => {
    const formData = new FormData();
    formData.set('email', email);
    return formData;
  };

  const initialState = { success: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication checks', () => {
    it('should return error if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await sendInvitationAction(
        initialState,
        mockFormData('test@example.com')
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('connecté');
    });

    it('should return error if user is not admin', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', role: 'VIEWER', name: 'Test' },
        expires: '',
      });

      const result = await sendInvitationAction(
        initialState,
        mockFormData('test@example.com')
      );

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

    it('should return field error for invalid email', async () => {
      const result = await sendInvitationAction(
        initialState,
        mockFormData('invalid-email')
      );

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.email).toBeDefined();
    });

    it('should return field error for empty email', async () => {
      const result = await sendInvitationAction(initialState, mockFormData(''));

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.email).toBeDefined();
    });
  });

  describe('business logic', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN', name: 'Admin User' },
        expires: '',
      });
    });

    it('should return error if email is already registered', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing-user',
      } as never);

      const result = await sendInvitationAction(
        initialState,
        mockFormData('existing@example.com')
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('existe déjà');
    });

    it('should return error if pending invitation exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue({
        id: 'existing-invitation',
      } as never);

      const result = await sendInvitationAction(
        initialState,
        mockFormData('pending@example.com')
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('déjà en cours');
    });

    it('should create invitation and send email on success', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.create).mockResolvedValue({
        id: 'new-invitation',
        email: 'new@example.com',
        token: 'token123',
      } as never);
      vi.mocked(emailService.sendInvitationEmail).mockResolvedValue(undefined);

      const result = await sendInvitationAction(
        initialState,
        mockFormData('new@example.com')
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('new@example.com');
      expect(prisma.invitation.create).toHaveBeenCalled();
      expect(emailService.sendInvitationEmail).toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.create).mockResolvedValue({
        id: 'new-invitation',
      } as never);
      vi.mocked(emailService.sendInvitationEmail).mockResolvedValue(undefined);

      await sendInvitationAction(
        initialState,
        mockFormData('TEST@EXAMPLE.COM')
      );

      expect(prisma.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
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
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.invitation.create).mockRejectedValue(
        new Error('DB Error')
      );

      const result = await sendInvitationAction(
        initialState,
        mockFormData('test@example.com')
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('erreur est survenue');
    });
  });
});

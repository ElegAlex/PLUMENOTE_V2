/**
 * Unit tests for email service
 *
 * Tests cover:
 * - MockEmailService functionality
 * - Interface compliance
 * - Logging behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockEmailService, emailService } from './email';

describe('MockEmailService', () => {
  let mockService: MockEmailService;

  beforeEach(() => {
    mockService = new MockEmailService();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('sendPasswordResetEmail', () => {
    it('should not throw when sending email', async () => {
      await expect(
        mockService.sendPasswordResetEmail('test@example.com', 'https://example.com/reset?token=abc')
      ).resolves.not.toThrow();
    });

    it('should log to console', async () => {
      await mockService.sendPasswordResetEmail('test@example.com', 'https://example.com/reset?token=abc');

      expect(console.log).toHaveBeenCalled();
    });

    it('should include email in console output', async () => {
      await mockService.sendPasswordResetEmail('user@test.com', 'https://example.com/reset?token=xyz');

      const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
      const output = calls.map((call) => call[0]).join('\n');

      expect(output).toContain('user@test.com');
    });

    it('should include reset URL in console output', async () => {
      const resetUrl = 'https://plumenote.app/reset-password?token=abc123';
      await mockService.sendPasswordResetEmail('test@example.com', resetUrl);

      const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
      const output = calls.map((call) => call[0]).join('\n');

      expect(output).toContain(resetUrl);
    });

    it('should include expiration notice', async () => {
      await mockService.sendPasswordResetEmail('test@example.com', 'https://example.com/reset');

      const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
      const output = calls.map((call) => call[0]).join('\n');

      expect(output).toContain('1 heure');
    });

    it('should include French content', async () => {
      await mockService.sendPasswordResetEmail('test@example.com', 'https://example.com/reset');

      const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
      const output = calls.map((call) => call[0]).join('\n');

      expect(output).toContain('Bonjour');
      expect(output).toContain('mot de passe');
      expect(output).toContain('PlumeNote');
    });
  });

  describe('sendInvitationEmail', () => {
    it('should not throw when sending invitation email', async () => {
      await expect(
        mockService.sendInvitationEmail(
          'newuser@example.com',
          'https://plumenote.app/register?token=abc123',
          'Jean Dupont'
        )
      ).resolves.not.toThrow();
    });

    it('should log invitation to console', async () => {
      await mockService.sendInvitationEmail(
        'newuser@example.com',
        'https://plumenote.app/register?token=abc123',
        'Jean Dupont'
      );

      expect(console.log).toHaveBeenCalled();
    });

    it('should include recipient email in console output', async () => {
      await mockService.sendInvitationEmail(
        'invitee@test.com',
        'https://plumenote.app/register?token=xyz',
        'Admin User'
      );

      const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
      const output = calls.map((call) => call[0]).join('\n');

      expect(output).toContain('invitee@test.com');
    });

    it('should include register URL in console output', async () => {
      const registerUrl = 'https://plumenote.app/register?token=invitation123';
      await mockService.sendInvitationEmail('test@example.com', registerUrl, 'Admin');

      const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
      const output = calls.map((call) => call[0]).join('\n');

      expect(output).toContain(registerUrl);
    });

    it('should include inviter name in console output', async () => {
      await mockService.sendInvitationEmail(
        'test@example.com',
        'https://plumenote.app/register',
        'Marie Martin'
      );

      const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
      const output = calls.map((call) => call[0]).join('\n');

      expect(output).toContain('Marie Martin');
    });

    it('should include 7-day expiration notice', async () => {
      await mockService.sendInvitationEmail(
        'test@example.com',
        'https://plumenote.app/register',
        'Admin'
      );

      const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
      const output = calls.map((call) => call[0]).join('\n');

      expect(output).toContain('7 jours');
    });

    it('should include French invitation content', async () => {
      await mockService.sendInvitationEmail(
        'test@example.com',
        'https://plumenote.app/register',
        'Admin'
      );

      const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
      const output = calls.map((call) => call[0]).join('\n');

      expect(output).toContain('invité');
      expect(output).toContain('rejoindre PlumeNote');
      expect(output).toContain('créer votre compte');
    });
  });
});

describe('emailService singleton', () => {
  it('should be an instance of MockEmailService', () => {
    expect(emailService).toBeInstanceOf(MockEmailService);
  });

  it('should have sendPasswordResetEmail method', () => {
    expect(typeof emailService.sendPasswordResetEmail).toBe('function');
  });

  it('should have sendInvitationEmail method', () => {
    expect(typeof emailService.sendInvitationEmail).toBe('function');
  });
});

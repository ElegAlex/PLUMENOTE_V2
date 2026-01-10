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
});

describe('emailService singleton', () => {
  it('should be an instance of MockEmailService', () => {
    expect(emailService).toBeInstanceOf(MockEmailService);
  });

  it('should have sendPasswordResetEmail method', () => {
    expect(typeof emailService.sendPasswordResetEmail).toBe('function');
  });
});

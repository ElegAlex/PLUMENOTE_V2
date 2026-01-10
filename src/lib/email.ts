/**
 * Email service for sending transactional emails
 *
 * MVP Implementation: MockEmailService that logs to console
 * Production: Replace with Nodemailer, Resend, or SendGrid
 *
 * @see Story 2.4 - Réinitialisation de Mot de Passe (FR3)
 */

import { logger } from './logger';

/**
 * Email service interface
 * Implement this interface to swap email providers
 */
export interface EmailService {
  /**
   * Send a password reset email
   *
   * @param email - Recipient email address
   * @param resetUrl - Full URL for password reset (includes token)
   */
  sendPasswordResetEmail(email: string, resetUrl: string): Promise<void>;

  /**
   * Send an invitation email to join PlumeNote
   *
   * @param email - Recipient email address
   * @param registerUrl - Full URL for registration (includes invitation token)
   * @param invitedByName - Name of the user who sent the invitation
   */
  sendInvitationEmail(
    email: string,
    registerUrl: string,
    invitedByName: string
  ): Promise<void>;
}

/**
 * Mock email service for MVP development
 *
 * Logs email content to console instead of sending actual emails.
 * This allows testing the complete flow without email infrastructure.
 *
 * Replace with a real implementation in production:
 * - NodemailerEmailService for SMTP
 * - ResendEmailService for Resend API
 * - SendGridEmailService for SendGrid
 */
export class MockEmailService implements EmailService {
  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    // Log for structured logging (pino)
    logger.info(
      { email, resetUrl: resetUrl.substring(0, 50) + '...' },
      'Password reset email requested'
    );

    // Pretty print for development console
    console.log('\n' + '='.repeat(60));
    console.log('📧 PASSWORD RESET EMAIL (MOCK)');
    console.log('='.repeat(60));
    console.log(`To: ${email}`);
    console.log(`Subject: Réinitialisation de votre mot de passe PlumeNote`);
    console.log('-'.repeat(60));
    console.log('');
    console.log('Bonjour,');
    console.log('');
    console.log('Vous avez demandé la réinitialisation de votre mot de passe');
    console.log('pour votre compte PlumeNote.');
    console.log('');
    console.log('Cliquez sur le lien ci-dessous pour définir un nouveau');
    console.log('mot de passe :');
    console.log('');
    console.log(`🔗 ${resetUrl}`);
    console.log('');
    console.log('⏰ Ce lien expire dans 1 heure.');
    console.log('');
    console.log('Si vous n\'avez pas demandé cette réinitialisation,');
    console.log('vous pouvez ignorer cet email en toute sécurité.');
    console.log('');
    console.log('Cordialement,');
    console.log('L\'équipe PlumeNote');
    console.log('='.repeat(60) + '\n');
  }

  async sendInvitationEmail(
    email: string,
    registerUrl: string,
    invitedByName: string
  ): Promise<void> {
    // Log for structured logging (pino)
    logger.info(
      { email, registerUrl: registerUrl.substring(0, 50) + '...', invitedByName },
      'Invitation email requested'
    );

    // Pretty print for development console
    console.log('\n' + '='.repeat(60));
    console.log('📧 INVITATION EMAIL (MOCK)');
    console.log('='.repeat(60));
    console.log(`To: ${email}`);
    console.log(`Subject: ${invitedByName} vous invite à rejoindre PlumeNote`);
    console.log('-'.repeat(60));
    console.log('');
    console.log('Bonjour,');
    console.log('');
    console.log(`${invitedByName} vous a invité(e) à rejoindre PlumeNote,`);
    console.log('la plateforme collaborative de prise de notes.');
    console.log('');
    console.log('Cliquez sur le lien ci-dessous pour créer votre compte :');
    console.log('');
    console.log(`🔗 ${registerUrl}`);
    console.log('');
    console.log('⏰ Ce lien expire dans 7 jours.');
    console.log('');
    console.log('Si vous n\'avez pas demandé cette invitation,');
    console.log('vous pouvez ignorer cet email en toute sécurité.');
    console.log('');
    console.log('Cordialement,');
    console.log('L\'équipe PlumeNote');
    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Default email service instance
 *
 * In production, this should be configured based on environment:
 *
 * @example
 * // In a configuration file or factory:
 * const emailService = process.env.NODE_ENV === 'production'
 *   ? new NodemailerEmailService(smtpConfig)
 *   : new MockEmailService();
 */
export const emailService: EmailService = new MockEmailService();

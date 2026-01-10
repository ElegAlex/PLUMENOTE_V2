/**
 * Token generation utilities for password reset
 *
 * Security approach:
 * - Generate cryptographically secure random token
 * - Hash the token before storing in database (like passwords)
 * - Send unhashed token to user via email
 * - On validation, hash provided token and compare with stored hash
 *
 * This prevents attackers with database access from using tokens.
 *
 * @see OWASP Forgot Password Cheat Sheet
 */

import crypto from 'crypto';
import { hashPassword, verifyPassword } from './password';

/**
 * Token length in bytes (32 bytes = 256 bits of entropy)
 * Encoded as base64url, results in ~43 character string
 */
const TOKEN_LENGTH_BYTES = 32;

/**
 * Length of token prefix for fast database lookup.
 * First 16 characters of the base64url token provide ~96 bits of entropy,
 * which is more than sufficient for uniqueness while enabling indexed lookup.
 */
const TOKEN_PREFIX_LENGTH = 16;

/**
 * Generate a cryptographically secure reset token
 *
 * @returns Object containing:
 *   - token: The raw token to send via email (base64url encoded)
 *   - hashedToken: The bcrypt hash to store in database (security)
 *   - tokenPrefix: First 16 chars for indexed DB lookup (performance)
 *
 * @example
 * const { token, hashedToken, tokenPrefix } = await generateResetToken();
 * // Store hashedToken and tokenPrefix in DB, send token in email
 */
export async function generateResetToken(): Promise<{
  token: string;
  hashedToken: string;
  tokenPrefix: string;
}> {
  // Generate cryptographically secure random bytes
  const tokenBytes = crypto.randomBytes(TOKEN_LENGTH_BYTES);

  // Encode as base64url (URL-safe, no padding)
  const token = tokenBytes.toString('base64url');

  // Extract prefix for fast indexed lookup
  const tokenPrefix = token.substring(0, TOKEN_PREFIX_LENGTH);

  // Hash the token for secure storage
  const hashedToken = await hashPassword(token);

  return { token, hashedToken, tokenPrefix };
}

/**
 * Extract the prefix from a token for database lookup.
 *
 * @param token - The raw token from URL parameter
 * @returns The token prefix for indexed lookup
 */
export function getTokenPrefix(token: string): string {
  return token.substring(0, TOKEN_PREFIX_LENGTH);
}

/**
 * Verify a reset token against its stored hash
 *
 * @param token - The raw token provided by user (from email link)
 * @param hashedToken - The hashed token stored in database
 * @returns Promise<boolean> - True if token matches, false otherwise
 *
 * @example
 * const isValid = await verifyResetToken(userToken, storedHashedToken);
 */
export async function verifyResetToken(
  token: string,
  hashedToken: string
): Promise<boolean> {
  if (!token || !hashedToken) {
    return false;
  }

  try {
    return await verifyPassword(token, hashedToken);
  } catch {
    // verifyPassword throws on invalid input
    return false;
  }
}

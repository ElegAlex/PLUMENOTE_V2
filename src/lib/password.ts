/**
 * Password hashing utilities using bcryptjs
 *
 * This module is kept separate from auth.ts to avoid Edge Runtime issues.
 * bcryptjs requires Node.js APIs not available in Edge environments.
 *
 * @see NFR12: Passwords hashed with bcrypt (cost >= 10)
 */

import bcrypt from 'bcryptjs';

/**
 * Salt rounds for bcrypt hashing.
 * Cost of 10 is the minimum per NFR12 requirements.
 * Higher values increase security but slow down hashing.
 */
const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt.
 *
 * @param password - The plain text password to hash
 * @returns Promise<string> - The hashed password
 * @throws Error if password is empty or invalid
 *
 * @example
 * const hashed = await hashPassword('mySecurePassword123');
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plain text password against a hashed password.
 *
 * @param password - The plain text password to verify
 * @param hashedPassword - The hashed password to compare against
 * @returns Promise<boolean> - True if passwords match, false otherwise
 * @throws Error if either parameter is empty or invalid
 *
 * @example
 * const isValid = await verifyPassword('mySecurePassword123', hashedPassword);
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  if (!password || typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  if (!hashedPassword || typeof hashedPassword !== 'string' || hashedPassword.length === 0) {
    throw new Error('Hashed password must be a non-empty string');
  }
  return bcrypt.compare(password, hashedPassword);
}

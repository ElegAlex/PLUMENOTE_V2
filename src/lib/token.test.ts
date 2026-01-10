/**
 * Unit tests for token generation utilities
 *
 * Tests cover:
 * - Token generation (entropy, uniqueness, format)
 * - Token verification (valid/invalid tokens)
 * - Security properties (hashed storage)
 */

import { describe, it, expect, vi } from 'vitest';
import { generateResetToken, verifyResetToken, getTokenPrefix } from './token';

describe('generateResetToken', () => {
  it('should generate a token, hashed token, and prefix', async () => {
    const result = await generateResetToken();

    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('hashedToken');
    expect(result).toHaveProperty('tokenPrefix');
    expect(typeof result.token).toBe('string');
    expect(typeof result.hashedToken).toBe('string');
    expect(typeof result.tokenPrefix).toBe('string');
  });

  it('should generate tokenPrefix as first 16 chars of token', async () => {
    const { token, tokenPrefix } = await generateResetToken();

    expect(tokenPrefix.length).toBe(16);
    expect(token.startsWith(tokenPrefix)).toBe(true);
  });

  it('should generate base64url encoded token', async () => {
    const { token } = await generateResetToken();

    // base64url uses A-Z, a-z, 0-9, -, _ (no + or /)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('should generate token of expected length (~43 chars for 32 bytes)', async () => {
    const { token } = await generateResetToken();

    // 32 bytes = 256 bits, base64url encodes 6 bits per char
    // 256 / 6 ≈ 43 characters
    expect(token.length).toBeGreaterThanOrEqual(42);
    expect(token.length).toBeLessThanOrEqual(44);
  });

  it('should generate unique tokens on each call', async () => {
    const results = await Promise.all([
      generateResetToken(),
      generateResetToken(),
      generateResetToken(),
    ]);

    const tokens = results.map((r) => r.token);
    const uniqueTokens = new Set(tokens);

    expect(uniqueTokens.size).toBe(3);
  });

  it('should generate unique hashed tokens on each call', async () => {
    const results = await Promise.all([
      generateResetToken(),
      generateResetToken(),
      generateResetToken(),
    ]);

    const hashes = results.map((r) => r.hashedToken);
    const uniqueHashes = new Set(hashes);

    expect(uniqueHashes.size).toBe(3);
  });

  it('should generate hashed token that looks like bcrypt hash', async () => {
    const { hashedToken } = await generateResetToken();

    // bcrypt hashes start with $2a$ or $2b$ and are 60 chars
    expect(hashedToken).toMatch(/^\$2[ab]\$\d{2}\$.{53}$/);
    expect(hashedToken.length).toBe(60);
  });

  it('should generate token different from its hash', async () => {
    const { token, hashedToken } = await generateResetToken();

    expect(token).not.toBe(hashedToken);
  });
});

describe('verifyResetToken', () => {
  it('should verify a valid token against its hash', async () => {
    const { token, hashedToken } = await generateResetToken();

    const isValid = await verifyResetToken(token, hashedToken);

    expect(isValid).toBe(true);
  });

  it('should reject an invalid token', async () => {
    const { hashedToken } = await generateResetToken();
    const wrongToken = 'completely-wrong-token-value';

    const isValid = await verifyResetToken(wrongToken, hashedToken);

    expect(isValid).toBe(false);
  });

  it('should reject token from different generation', async () => {
    const result1 = await generateResetToken();
    const result2 = await generateResetToken();

    // Token from result1 should not match hash from result2
    const isValid = await verifyResetToken(result1.token, result2.hashedToken);

    expect(isValid).toBe(false);
  });

  it('should return false for empty token', async () => {
    const { hashedToken } = await generateResetToken();

    const isValid = await verifyResetToken('', hashedToken);

    expect(isValid).toBe(false);
  });

  it('should return false for empty hashed token', async () => {
    const { token } = await generateResetToken();

    const isValid = await verifyResetToken(token, '');

    expect(isValid).toBe(false);
  });

  it('should return false for null token', async () => {
    const { hashedToken } = await generateResetToken();

    const isValid = await verifyResetToken(null as unknown as string, hashedToken);

    expect(isValid).toBe(false);
  });

  it('should return false for null hashed token', async () => {
    const { token } = await generateResetToken();

    const isValid = await verifyResetToken(token, null as unknown as string);

    expect(isValid).toBe(false);
  });

  it('should return false for undefined token', async () => {
    const { hashedToken } = await generateResetToken();

    const isValid = await verifyResetToken(undefined as unknown as string, hashedToken);

    expect(isValid).toBe(false);
  });

  it('should return false for malformed hash', async () => {
    const { token } = await generateResetToken();
    const malformedHash = 'not-a-valid-bcrypt-hash';

    const isValid = await verifyResetToken(token, malformedHash);

    expect(isValid).toBe(false);
  });

  it('should handle slightly modified token (1 char difference)', async () => {
    const { token, hashedToken } = await generateResetToken();

    // Modify one character
    const modifiedToken = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a');

    const isValid = await verifyResetToken(modifiedToken, hashedToken);

    expect(isValid).toBe(false);
  });
});

describe('getTokenPrefix', () => {
  it('should extract first 16 characters from token', () => {
    const token = 'abcdefghijklmnopqrstuvwxyz123456';
    const prefix = getTokenPrefix(token);

    expect(prefix).toBe('abcdefghijklmnop');
    expect(prefix.length).toBe(16);
  });

  it('should return same prefix as generateResetToken', async () => {
    const { token, tokenPrefix } = await generateResetToken();
    const extractedPrefix = getTokenPrefix(token);

    expect(extractedPrefix).toBe(tokenPrefix);
  });

  it('should handle shorter tokens gracefully', () => {
    const shortToken = 'abc';
    const prefix = getTokenPrefix(shortToken);

    expect(prefix).toBe('abc');
  });
});

describe('Security properties', () => {
  it('should not expose token in hash (hash should not contain token)', async () => {
    const { token, hashedToken } = await generateResetToken();

    // The hash should not contain the token as a substring
    expect(hashedToken).not.toContain(token);
    expect(hashedToken).not.toContain(token.substring(0, 10));
  });

  it('should generate sufficient entropy (all tokens should be different)', async () => {
    // Generate 10 tokens and verify they're all unique
    const tokens: string[] = [];
    for (let i = 0; i < 10; i++) {
      const { token } = await generateResetToken();
      tokens.push(token);
    }

    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(10);
  });

  it('should generate unique prefixes for lookup uniqueness', async () => {
    // Generate 10 tokens and verify prefixes are also unique
    const prefixes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const { tokenPrefix } = await generateResetToken();
      prefixes.push(tokenPrefix);
    }

    const uniquePrefixes = new Set(prefixes);
    expect(uniquePrefixes.size).toBe(10);
  });
});

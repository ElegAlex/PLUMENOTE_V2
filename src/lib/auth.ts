/**
 * Auth.js v5 Configuration (Node.js - Full Configuration)
 *
 * This file contains the full Auth.js configuration with providers.
 * It requires Node.js runtime for bcrypt password verification.
 *
 * Exports:
 * - handlers: GET and POST handlers for the auth API route
 * - auth: Server-side session retrieval function
 * - signIn: Server action to sign in a user
 * - signOut: Server action to sign out a user
 *
 * @see https://authjs.dev/getting-started/installation
 * @see NFR13: Sessions JWT with 24h expiration
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import * as jose from 'jose';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';
import { verifyPassword } from './password';
import { logger } from './logger';

// Encode AUTH_SECRET for jose
const AUTH_SECRET = process.env.AUTH_SECRET;
const wsTokenSecret = AUTH_SECRET ? new TextEncoder().encode(AUTH_SECRET) : null;

/**
 * NextAuth.js v5 instance with Credentials provider
 *
 * @see NFR11: Authentication required for all access
 * @see NFR12: Passwords hashed with bcrypt (cost >= 10)
 * @see NFR13: Sessions JWT with 24h expiration
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  /**
   * Prisma adapter for database session management
   * Required for the Credentials provider to work with database users
   */
  adapter: PrismaAdapter(prisma),

  /**
   * Session configuration
   * Using JWT strategy with 24-hour expiration per NFR13
   */
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours in seconds
  },

  /**
   * Extended callbacks - adds wsToken for WebSocket authentication
   */
  callbacks: {
    ...authConfig.callbacks,

    /**
     * JWT callback - extends base callback to add WebSocket auth token
     * Generates a signed JWT for Hocuspocus authentication
     */
    async jwt({ token, user }) {
      // First run the base callback
      if (user) {
        token.role = user.role;
        token.id = user.id as string;
      }

      // Generate WebSocket auth token (signed JWT for Hocuspocus)
      if (wsTokenSecret && token.sub) {
        try {
          const wsToken = await new jose.SignJWT({
            sub: token.sub,
            name: token.name,
            email: token.email,
          })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(wsTokenSecret);

          token.wsToken = wsToken;
        } catch (error) {
          logger.error({ error }, 'Failed to generate WebSocket token');
        }
      }

      return token;
    },
  },

  /**
   * Authentication providers
   */
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      /**
       * Authorize callback - validates user credentials
       *
       * @param credentials - Email and password from the sign-in form
       * @returns User object if valid, null otherwise
       */
      async authorize(credentials) {
        // Validate that credentials are provided
        if (!credentials?.email || !credentials?.password) {
          logger.warn('Auth attempt with missing credentials');
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email },
          });

          // User not found
          if (!user) {
            logger.info({ email }, 'Auth attempt for non-existent user');
            return null;
          }

          // User has no password (might be OAuth-only account)
          if (!user.password) {
            logger.warn({ userId: user.id }, 'Auth attempt on passwordless account');
            return null;
          }

          // User account is deactivated (FR6)
          if (!user.isActive) {
            logger.warn({ userId: user.id }, 'Auth attempt on deactivated account');
            throw new Error('ACCOUNT_DEACTIVATED');
          }

          // Verify password
          const isValidPassword = await verifyPassword(password, user.password);
          if (!isValidPassword) {
            logger.info({ userId: user.id }, 'Auth attempt with invalid password');
            return null;
          }

          // Return user object (will be added to JWT token)
          logger.info({ userId: user.id }, 'Successful authentication');
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image ?? user.avatar,
            role: user.role,
          };
        } catch (error) {
          logger.error({ error }, 'Error during authentication');
          return null;
        }
      },
    }),
  ],
});

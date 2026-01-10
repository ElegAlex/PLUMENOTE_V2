/**
 * Auth.js v5 Configuration (Edge-compatible)
 *
 * This file contains the Edge-compatible configuration for Auth.js.
 * It's separated from auth.ts to allow the middleware to run in Edge Runtime.
 *
 * @see https://authjs.dev/guides/edge-compatibility
 */

import type { NextAuthConfig } from 'next-auth';

/**
 * Auth.js configuration object
 *
 * This configuration is Edge-compatible and can be used in middleware.
 * The providers array is empty here - actual providers are added in auth.ts.
 */
export const authConfig = {
  /**
   * Custom pages for authentication flows
   */
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },

  /**
   * Callbacks for customizing auth behavior
   */
  callbacks: {
    /**
     * Authorized callback for middleware route protection
     * Runs on every request to protected routes
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnProtectedApi =
        nextUrl.pathname.startsWith('/api/') &&
        !nextUrl.pathname.startsWith('/api/auth');

      // Protect dashboard routes
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to login page
      }

      // Protect API routes (except /api/auth/*)
      if (isOnProtectedApi) {
        if (isLoggedIn) return true;
        return false;
      }

      // Allow access to public routes
      return true;
    },

    /**
     * JWT callback - adds custom claims to the token
     * Called whenever a JWT is created or updated
     */
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id as string;
      }
      return token;
    },

    /**
     * Session callback - exposes token data to the client
     * Called whenever a session is checked
     */
    session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },

  /**
   * Empty providers array - actual providers are added in auth.ts
   * This is intentional for Edge compatibility
   */
  providers: [],
} satisfies NextAuthConfig;

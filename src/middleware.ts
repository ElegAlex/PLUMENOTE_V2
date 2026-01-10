/**
 * Next.js Middleware for Authentication
 *
 * This middleware runs before every request to protect routes.
 * It uses the Edge-compatible auth configuration from auth.config.ts.
 *
 * Protected routes:
 * - /dashboard/* - All dashboard routes require authentication
 * - /api/* (except /api/auth/*) - All API routes require authentication
 *
 * Public routes:
 * - / - Home page
 * - /login - Login page
 * - /register - Registration page
 * - /forgot-password - Password reset request page
 * - /reset-password - Password reset page
 * - /auth/* - Auth.js pages (error, etc.)
 * - /api/auth/* - Auth.js API routes
 *
 * @see https://authjs.dev/guides/edge-compatibility
 * @see NFR11: Authentication required for all access
 */

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

/**
 * NextAuth middleware using Edge-compatible configuration
 * The authorized callback in authConfig handles route protection logic
 */
export default NextAuth(authConfig).auth;

/**
 * Middleware matcher configuration
 *
 * Specifies which routes the middleware should run on.
 * Excludes static files, images, and other assets for performance.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (public assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

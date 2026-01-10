/**
 * Auth.js API Route Handler
 *
 * This file exports the GET and POST handlers for Auth.js.
 * All authentication routes (/api/auth/*) are handled here.
 *
 * Routes:
 * - GET /api/auth/signin - Sign-in page
 * - GET /api/auth/signout - Sign-out page
 * - GET /api/auth/session - Session data
 * - GET /api/auth/csrf - CSRF token
 * - GET /api/auth/providers - Available providers
 * - POST /api/auth/signin/* - Sign-in form submission
 * - POST /api/auth/signout - Sign-out submission
 * - POST /api/auth/callback/* - OAuth callbacks
 *
 * @see https://authjs.dev/getting-started/installation#configure
 */

import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;

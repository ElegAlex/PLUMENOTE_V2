/**
 * NextAuth.js type augmentation for PlumeNote
 *
 * Extends the default NextAuth types to include:
 * - User role (RBAC)
 * - User ID in session
 *
 * @see https://authjs.dev/getting-started/typescript
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { Role } from '@prisma/client';
import NextAuth, { DefaultSession, User as NextAuthUser } from 'next-auth';
import { JWT as NextAuthJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extends the User type to include PlumeNote-specific fields
   */
  interface User {
    role: Role;
  }

  /**
   * Extends the Session type to include user ID and role
   */
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extends the JWT type to include user ID and role for token storage
   */
  interface JWT {
    role: Role;
    id: string;
  }
}

declare module '@auth/core/types' {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession['user'];
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role: Role;
    id: string;
  }
}

'use server';

/**
 * Server Action for listing all users
 *
 * Returns all users with their status for admin management.
 * Excludes sensitive data like passwords.
 *
 * @see Story 2.7 - Désactivation de Compte Utilisateur (FR6)
 */

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import type { Role } from '@prisma/client';

/**
 * User item returned by the list action
 */
export type UserItem = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * State returned by the list users action
 */
export type ListUsersState = {
  success: boolean;
  users?: UserItem[];
  error?: string;
};

/**
 * List all users for admin management
 *
 * SECURITY: Only accessible by authenticated users with ADMIN role.
 *
 * @returns List of users with their status
 */
export async function listUsersAction(): Promise<ListUsersState> {
  // Verify authentication and admin role
  const session = await auth();
  if (!session?.user) {
    logger.warn('List users attempt without authentication');
    return {
      success: false,
      error: 'Vous devez être connecté pour voir la liste des utilisateurs.',
    };
  }

  if (session.user.role !== 'ADMIN') {
    logger.warn(
      { userId: session.user.id },
      'Non-admin user attempted to list users'
    );
    return {
      success: false,
      error: 'Seuls les administrateurs peuvent voir la liste des utilisateurs.',
    };
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Explicitly exclude password and other sensitive fields
      },
      orderBy: [
        { role: 'asc' }, // ADMINs first
        { createdAt: 'desc' },
      ],
    });

    logger.info(
      { adminId: session.user.id, count: users.length },
      'Users list retrieved'
    );

    return {
      success: true,
      users,
    };
  } catch (error) {
    logger.error({ error }, 'Error listing users');
    return {
      success: false,
      error: 'Une erreur est survenue. Veuillez réessayer.',
    };
  }
}

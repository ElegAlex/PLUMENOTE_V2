/**
 * Personal Workspace Service
 *
 * Business logic for managing personal workspaces (private user spaces).
 * - Each user has exactly one personal workspace (isPersonal=true)
 * - Personal workspaces are created at registration or lazily on first access
 * - Personal workspaces cannot be shared (no members allowed)
 * - Personal workspaces cannot be deleted
 *
 * @see Story 8.5: Espace Personnel Prive (FR40, FR41)
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Workspace } from "../types";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Constants for personal workspace
 */
export const PERSONAL_WORKSPACE_NAME = "Mon espace";
export const PERSONAL_WORKSPACE_ICON = "user";

/**
 * Selection fields for Workspace responses
 */
const workspaceSelect = {
  id: true,
  name: true,
  description: true,
  icon: true,
  isPersonal: true,
  createdAt: true,
  updatedAt: true,
  ownerId: true,
} as const;

/**
 * Get or create user's personal workspace (lazy creation)
 *
 * This function ensures a user always has a personal workspace.
 * If one doesn't exist, it creates it atomically.
 *
 * @param userId - ID of the user
 * @returns The user's personal workspace
 */
export async function getOrCreatePersonalWorkspace(
  userId: string
): Promise<Workspace> {
  // Try to find existing personal workspace
  const existing = await prisma.workspace.findFirst({
    where: {
      ownerId: userId,
      isPersonal: true,
    },
    select: workspaceSelect,
  });

  if (existing) {
    return existing;
  }

  // Create new personal workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: PERSONAL_WORKSPACE_NAME,
      icon: PERSONAL_WORKSPACE_ICON,
      isPersonal: true,
      ownerId: userId,
    },
    select: workspaceSelect,
  });

  logger.info({ userId, workspaceId: workspace.id }, "Personal workspace created (lazy)");
  return workspace;
}

/**
 * Get user's personal workspace (returns null if not exists)
 *
 * Use this when you need to check if a personal workspace exists
 * without creating one.
 *
 * @param userId - ID of the user
 * @returns The user's personal workspace, or null if not exists
 */
export async function getPersonalWorkspace(
  userId: string
): Promise<Workspace | null> {
  return prisma.workspace.findFirst({
    where: {
      ownerId: userId,
      isPersonal: true,
    },
    select: workspaceSelect,
  });
}

/**
 * Check if a workspace is a personal workspace
 *
 * @param workspaceId - ID of the workspace to check
 * @returns true if the workspace is a personal workspace
 */
export async function isPersonalWorkspace(
  workspaceId: string
): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { isPersonal: true },
  });
  return workspace?.isPersonal ?? false;
}

/**
 * Ensure personal workspace exists for a user
 *
 * This is an alias for getOrCreatePersonalWorkspace, intended for
 * migration scripts and initialization contexts.
 *
 * @param userId - ID of the user
 * @returns The user's personal workspace
 */
export async function ensurePersonalWorkspaceExists(
  userId: string
): Promise<Workspace> {
  return getOrCreatePersonalWorkspace(userId);
}

/**
 * Create personal workspace within a transaction
 *
 * Use this during user registration to atomically create both
 * the user and their personal workspace.
 *
 * @param tx - Prisma transaction client
 * @param userId - ID of the user
 * @returns The created personal workspace
 */
export async function createPersonalWorkspaceInTransaction(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  userId: string
): Promise<Workspace> {
  const workspace = await tx.workspace.create({
    data: {
      name: PERSONAL_WORKSPACE_NAME,
      icon: PERSONAL_WORKSPACE_ICON,
      isPersonal: true,
      ownerId: userId,
    },
    select: workspaceSelect,
  });

  logger.info({ userId, workspaceId: workspace.id }, "Personal workspace created (registration)");
  return workspace;
}

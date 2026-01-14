/**
 * Workspaces Service
 *
 * Business logic for workspace CRUD operations with ownership-based access control.
 * - All authenticated users can create workspaces
 * - Only the owner can update or delete their workspaces
 * - Workspaces with notes cannot be deleted (must move/delete notes first)
 *
 * @see Story 8.1: Modele Workspace et Infrastructure
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import type { Workspace, CreateWorkspaceInput, UpdateWorkspaceInput } from "../types";

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
 * Get all workspaces for a user
 *
 * Returns all workspaces owned by the user, ordered by:
 * 1. Personal workspaces first
 * 2. Then alphabetically by name
 *
 * @param userId - ID of the user
 * @returns Array of workspaces owned by the user
 */
export async function getWorkspacesByUser(userId: string): Promise<Workspace[]> {
  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: userId },
    select: workspaceSelect,
    orderBy: [
      { isPersonal: "desc" }, // Personal workspaces first
      { name: "asc" },
    ],
  });

  logger.info({ userId, count: workspaces.length }, "Workspaces listed for user");
  return workspaces;
}

/**
 * Get a workspace by ID
 *
 * @param workspaceId - ID of the workspace to retrieve
 * @param userId - ID of the requesting user (for ownership check)
 * @returns The workspace
 * @throws {NotFoundError} If workspace doesn't exist
 * @throws {ForbiddenError} If user is not the owner
 */
export async function getWorkspaceById(
  workspaceId: string,
  userId: string
): Promise<Workspace> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: workspaceSelect,
  });

  if (!workspace) {
    throw new NotFoundError(`Workspace with ID '${workspaceId}' not found`);
  }

  // Only owner can access their workspace
  if (workspace.ownerId !== userId) {
    throw new ForbiddenError("You do not have permission to access this workspace");
  }

  logger.info({ workspaceId, userId }, "Workspace retrieved");
  return workspace;
}

/**
 * Create a new workspace
 *
 * @param userId - ID of the user creating the workspace
 * @param data - Workspace data
 * @returns Created workspace
 */
export async function createWorkspace(
  userId: string,
  data: CreateWorkspaceInput
): Promise<Workspace> {
  const workspace = await prisma.workspace.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      icon: data.icon ?? "folder",
      isPersonal: data.isPersonal ?? false,
      ownerId: userId,
    },
    select: workspaceSelect,
  });

  logger.info({ workspaceId: workspace.id, userId }, "Workspace created");
  return workspace;
}

/**
 * Update a workspace
 *
 * Only the owner can update their workspace.
 * Note: isPersonal cannot be changed after creation.
 *
 * @param workspaceId - ID of the workspace to update
 * @param userId - ID of the user making the update
 * @param data - Fields to update
 * @returns Updated workspace
 * @throws {NotFoundError} If workspace doesn't exist
 * @throws {ForbiddenError} If user is not the owner
 */
export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  data: UpdateWorkspaceInput
): Promise<Workspace> {
  const existing = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });

  if (!existing) {
    throw new NotFoundError(`Workspace with ID '${workspaceId}' not found`);
  }

  // Only owner can update
  if (existing.ownerId !== userId) {
    throw new ForbiddenError("You do not have permission to update this workspace");
  }

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.icon !== undefined && { icon: data.icon }),
    },
    select: workspaceSelect,
  });

  logger.info({ workspaceId, userId }, "Workspace updated");
  return workspace;
}

/**
 * Delete a workspace
 *
 * Only the owner can delete their workspace.
 * Workspaces with notes cannot be deleted (notes must be moved or deleted first).
 *
 * @param workspaceId - ID of the workspace to delete
 * @param userId - ID of the user making the deletion
 * @throws {NotFoundError} If workspace doesn't exist
 * @throws {ForbiddenError} If user is not the owner
 * @throws {ConflictError} If workspace contains notes
 */
export async function deleteWorkspace(
  workspaceId: string,
  userId: string
): Promise<void> {
  const existing = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      ownerId: true,
      _count: {
        select: { notes: true },
      },
    },
  });

  if (!existing) {
    throw new NotFoundError(`Workspace with ID '${workspaceId}' not found`);
  }

  // Only owner can delete
  if (existing.ownerId !== userId) {
    throw new ForbiddenError("You do not have permission to delete this workspace");
  }

  // Cannot delete workspace with notes
  if (existing._count.notes > 0) {
    throw new ConflictError(
      `Cannot delete workspace: it contains ${existing._count.notes} note(s). Move or delete them first.`
    );
  }

  await prisma.workspace.delete({ where: { id: workspaceId } });

  logger.info({ workspaceId, userId }, "Workspace deleted");
}

/**
 * Workspaces Service
 *
 * Business logic for workspace CRUD operations with ownership-based access control.
 * - All authenticated users can create workspaces
 * - Only the owner can update or delete their workspaces
 * - Workspaces with notes cannot be deleted (must move/delete notes first)
 *
 * @see Story 8.1: Modele Workspace et Infrastructure
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import type { Workspace, CreateWorkspaceInput, UpdateWorkspaceInput, WorkspaceWithCount } from "../types";

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
 * Get all workspaces accessible to a user
 *
 * Returns all workspaces where user is owner OR member, ordered by:
 * 1. Personal workspaces first
 * 2. Then alphabetically by name
 *
 * @param userId - ID of the user
 * @returns Array of workspaces accessible to the user
 * @see Story 8.3: Permissions par Workspace - AC #7
 */
export async function getWorkspacesByUser(userId: string): Promise<Workspace[]> {
  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: workspaceSelect,
    orderBy: [
      { isPersonal: "desc" }, // Personal workspaces first
      { name: "asc" },
    ],
  });

  logger.info({ userId, count: workspaces.length }, "Accessible workspaces listed for user");
  return workspaces;
}

/**
 * Get a workspace by ID
 *
 * @param workspaceId - ID of the workspace to retrieve
 * @param userId - ID of the requesting user (for permission check)
 * @returns The workspace
 * @throws {NotFoundError} If workspace doesn't exist
 * @throws {ForbiddenError} If user has no access (not owner and not member)
 * @see Story 8.3: Permissions par Workspace - AC #7
 */
export async function getWorkspaceById(
  workspaceId: string,
  userId: string
): Promise<Workspace> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      ...workspaceSelect,
      members: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  if (!workspace) {
    throw new NotFoundError(`Workspace with ID '${workspaceId}' not found`);
  }

  // Check access: owner OR member
  const isOwner = workspace.ownerId === userId;
  const isMember = workspace.members.length > 0;

  if (!isOwner && !isMember) {
    throw new ForbiddenError("You do not have permission to access this workspace");
  }

  // Return without members field (not part of Workspace type)
  const { members: _, ...workspaceData } = workspace;

  logger.info({ workspaceId, userId }, "Workspace retrieved");
  return workspaceData;
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
 * Owner or ADMIN can update the workspace.
 * Note: isPersonal cannot be changed after creation.
 *
 * @param workspaceId - ID of the workspace to update
 * @param userId - ID of the user making the update
 * @param data - Fields to update
 * @returns Updated workspace
 * @throws {NotFoundError} If workspace doesn't exist
 * @throws {ForbiddenError} If user is not owner or ADMIN
 * @see Story 8.3: Permissions par Workspace - AC #4
 */
export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  data: UpdateWorkspaceInput
): Promise<Workspace> {
  const existing = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      ownerId: true,
      members: {
        where: { userId, role: "ADMIN" },
        select: { id: true },
      },
    },
  });

  if (!existing) {
    throw new NotFoundError(`Workspace with ID '${workspaceId}' not found`);
  }

  // Check permission: owner OR ADMIN
  const isOwner = existing.ownerId === userId;
  const isAdmin = existing.members.length > 0;

  if (!isOwner && !isAdmin) {
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

/**
 * Selection fields for Workspace with note count
 * @see Story 8.2: Creation et Gestion des Workspaces
 */
const workspaceWithCountSelect = {
  id: true,
  name: true,
  description: true,
  icon: true,
  isPersonal: true,
  createdAt: true,
  updatedAt: true,
  ownerId: true,
  _count: {
    select: { notes: true },
  },
} as const;

/**
 * Get all workspaces accessible to a user with note counts
 *
 * Returns all workspaces where user is owner OR member, with note counts, ordered by:
 * 1. Personal workspaces first
 * 2. Then alphabetically by name
 *
 * @param userId - ID of the user
 * @returns Array of workspaces with note counts accessible to the user
 * @see Story 8.2: Creation et Gestion des Workspaces
 * @see Story 8.3: Permissions par Workspace - AC #7
 */
export async function getWorkspacesWithCount(userId: string): Promise<WorkspaceWithCount[]> {
  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: workspaceWithCountSelect,
    orderBy: [
      { isPersonal: "desc" }, // Personal workspaces first
      { name: "asc" },
    ],
  });

  logger.info({ userId, count: workspaces.length }, "Accessible workspaces with count listed for user");
  return workspaces;
}

/**
 * Move all notes from one workspace to another
 *
 * @param sourceWorkspaceId - ID of the source workspace
 * @param targetWorkspaceId - ID of the target workspace
 * @param userId - ID of the user (must own both workspaces)
 * @returns Number of notes moved
 * @throws {NotFoundError} If either workspace doesn't exist
 * @throws {ForbiddenError} If user doesn't own both workspaces
 * @see Story 8.2: Creation et Gestion des Workspaces
 */
export async function moveNotesToWorkspace(
  sourceWorkspaceId: string,
  targetWorkspaceId: string,
  userId: string
): Promise<number> {
  // Verify source workspace exists and user owns it
  const sourceWorkspace = await prisma.workspace.findUnique({
    where: { id: sourceWorkspaceId },
    select: { ownerId: true },
  });

  if (!sourceWorkspace) {
    throw new NotFoundError(`Source workspace with ID '${sourceWorkspaceId}' not found`);
  }

  if (sourceWorkspace.ownerId !== userId) {
    throw new ForbiddenError("You do not have permission to move notes from this workspace");
  }

  // Verify target workspace exists and user owns it
  const targetWorkspace = await prisma.workspace.findUnique({
    where: { id: targetWorkspaceId },
    select: { ownerId: true },
  });

  if (!targetWorkspace) {
    throw new NotFoundError(`Target workspace with ID '${targetWorkspaceId}' not found`);
  }

  if (targetWorkspace.ownerId !== userId) {
    throw new ForbiddenError("You do not have permission to move notes to this workspace");
  }

  // Move all notes from source to target
  const result = await prisma.note.updateMany({
    where: { workspaceId: sourceWorkspaceId },
    data: { workspaceId: targetWorkspaceId },
  });

  logger.info(
    { sourceWorkspaceId, targetWorkspaceId, userId, movedCount: result.count },
    "Notes moved between workspaces"
  );

  return result.count;
}

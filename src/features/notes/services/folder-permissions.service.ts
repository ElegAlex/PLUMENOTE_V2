/**
 * Folder Permissions Service
 *
 * Business logic for managing folder-level permissions.
 * Extends the workspace permission system with granular folder access control.
 *
 * Key concepts:
 * - Folder permissions can only RESTRICT access, never extend beyond workspace permissions
 * - Private folders require explicit permission to access
 * - Permissions use the same WorkspaceRole enum (ADMIN, EDITOR, VIEWER)
 *
 * @see Story 8.4: Permissions par Dossier
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import type { WorkspaceRole } from "@prisma/client";

/**
 * Type for FolderPermission
 */
export interface FolderPermission {
  id: string;
  role: WorkspaceRole;
  folderId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Type for FolderPermission with user info
 */
export interface FolderPermissionWithUser extends FolderPermission {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

/**
 * Input type for setting folder permission
 */
export interface SetFolderPermissionInput {
  userId: string;
  role: WorkspaceRole;
}

/**
 * Selection fields for FolderPermission responses
 */
const permissionSelect = {
  id: true,
  role: true,
  folderId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Selection fields for FolderPermission with user info
 */
const permissionWithUserSelect = {
  ...permissionSelect,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  },
} as const;

/**
 * Get all permissions for a folder
 *
 * Returns all permissions with user info, ordered by role then name.
 *
 * @param folderId - ID of the folder
 * @returns Array of folder permissions with user info
 * @throws {NotFoundError} If folder doesn't exist
 */
export async function getFolderPermissions(
  folderId: string
): Promise<FolderPermissionWithUser[]> {
  // Verify folder exists
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { id: true },
  });

  if (!folder) {
    throw new NotFoundError(`Folder with ID '${folderId}' not found`);
  }

  const permissions = await prisma.folderPermission.findMany({
    where: { folderId },
    select: permissionWithUserSelect,
    orderBy: [
      { role: "asc" }, // ADMIN comes before EDITOR, EDITOR before VIEWER
      { user: { name: "asc" } },
    ],
  });

  logger.info({ folderId, count: permissions.length }, "Folder permissions listed");
  return permissions;
}

/**
 * Set permission for a user on a folder
 *
 * Creates or updates a permission for the given user on the folder.
 *
 * @param folderId - ID of the folder
 * @param data - Permission data (userId, role)
 * @returns Created or updated folder permission with user info
 * @throws {NotFoundError} If folder or user doesn't exist
 * @throws {ConflictError} If user is the folder creator (they already have owner access)
 */
export async function setFolderPermission(
  folderId: string,
  data: SetFolderPermissionInput
): Promise<FolderPermissionWithUser> {
  // Verify folder exists and get creator info
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { id: true, createdById: true, workspaceId: true },
  });

  if (!folder) {
    throw new NotFoundError(`Folder with ID '${folderId}' not found`);
  }

  // Cannot add folder creator as permission holder (they own it via workspace)
  if (folder.createdById === data.userId) {
    throw new ConflictError("Cannot add folder creator as a permission holder. Creator already has access via workspace.");
  }

  // If folder is in a workspace, check if user is the workspace owner
  if (folder.workspaceId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: folder.workspaceId },
      select: { ownerId: true },
    });

    if (workspace && workspace.ownerId === data.userId) {
      throw new ConflictError("Cannot add workspace owner as a permission holder. Owner already has full access.");
    }
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true },
  });

  if (!user) {
    throw new NotFoundError(`User with ID '${data.userId}' not found`);
  }

  // Upsert permission (create or update)
  const permission = await prisma.folderPermission.upsert({
    where: {
      folderId_userId: {
        folderId,
        userId: data.userId,
      },
    },
    create: {
      folderId,
      userId: data.userId,
      role: data.role,
    },
    update: {
      role: data.role,
    },
    select: permissionWithUserSelect,
  });

  logger.info(
    { folderId, permissionId: permission.id, userId: data.userId, role: data.role },
    "Folder permission set"
  );

  return permission;
}

/**
 * Remove a user's permission on a folder
 *
 * @param folderId - ID of the folder
 * @param userId - ID of the user whose permission to remove
 * @throws {NotFoundError} If folder or permission doesn't exist
 */
export async function removeFolderPermission(
  folderId: string,
  userId: string
): Promise<void> {
  // Verify folder exists
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { id: true },
  });

  if (!folder) {
    throw new NotFoundError(`Folder with ID '${folderId}' not found`);
  }

  // Find and delete the permission
  const existing = await prisma.folderPermission.findUnique({
    where: {
      folderId_userId: {
        folderId,
        userId,
      },
    },
  });

  if (!existing) {
    throw new NotFoundError(`Permission for user '${userId}' on folder '${folderId}' not found`);
  }

  await prisma.folderPermission.delete({
    where: { id: existing.id },
  });

  logger.info(
    { folderId, userId },
    "Folder permission removed"
  );
}

/**
 * Set folder privacy (isPrivate flag)
 *
 * When a folder is private:
 * - Only users with explicit FolderPermission can access it
 * - Workspace owner and ADMINs can always access (security principle)
 *
 * @param folderId - ID of the folder
 * @param isPrivate - Whether the folder should be private
 * @returns Updated folder with isPrivate status
 * @throws {NotFoundError} If folder doesn't exist
 */
export async function setFolderPrivate(
  folderId: string,
  isPrivate: boolean
): Promise<{ id: string; isPrivate: boolean }> {
  // Verify folder exists
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { id: true },
  });

  if (!folder) {
    throw new NotFoundError(`Folder with ID '${folderId}' not found`);
  }

  const updated = await prisma.folder.update({
    where: { id: folderId },
    data: { isPrivate },
    select: { id: true, isPrivate: true },
  });

  logger.info({ folderId, isPrivate }, "Folder privacy updated");
  return updated;
}

/**
 * Get a user's permission on a specific folder
 *
 * @param folderId - ID of the folder
 * @param userId - ID of the user
 * @returns The user's role on the folder, or null if no permission
 */
export async function getFolderPermissionRole(
  folderId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const permission = await prisma.folderPermission.findUnique({
    where: {
      folderId_userId: {
        folderId,
        userId,
      },
    },
    select: { role: true },
  });

  return permission?.role ?? null;
}

/**
 * Get a specific permission by ID
 *
 * @param permissionId - ID of the folder permission
 * @returns The folder permission with user info
 * @throws {NotFoundError} If permission doesn't exist
 */
export async function getFolderPermissionById(
  permissionId: string
): Promise<FolderPermissionWithUser> {
  const permission = await prisma.folderPermission.findUnique({
    where: { id: permissionId },
    select: permissionWithUserSelect,
  });

  if (!permission) {
    throw new NotFoundError(`Folder permission with ID '${permissionId}' not found`);
  }

  return permission;
}

/**
 * Check if folder has any permissions defined
 *
 * @param folderId - ID of the folder
 * @returns true if folder has explicit permissions
 */
export async function hasFolderPermissions(folderId: string): Promise<boolean> {
  const count = await prisma.folderPermission.count({
    where: { folderId },
  });

  return count > 0;
}

/**
 * Copy permissions from one folder to another
 *
 * Useful when creating child folders that should inherit parent permissions.
 *
 * @param sourceFolderId - ID of the source folder
 * @param targetFolderId - ID of the target folder
 * @returns Number of permissions copied
 */
export async function copyFolderPermissions(
  sourceFolderId: string,
  targetFolderId: string
): Promise<number> {
  // Get source permissions
  const sourcePermissions = await prisma.folderPermission.findMany({
    where: { folderId: sourceFolderId },
    select: { userId: true, role: true },
  });

  if (sourcePermissions.length === 0) {
    return 0;
  }

  // Create permissions on target folder
  const result = await prisma.folderPermission.createMany({
    data: sourcePermissions.map((perm) => ({
      folderId: targetFolderId,
      userId: perm.userId,
      role: perm.role,
    })),
    skipDuplicates: true, // In case some already exist
  });

  logger.info(
    { sourceFolderId, targetFolderId, count: result.count },
    "Folder permissions copied"
  );

  return result.count;
}

/**
 * Folder permission chain item
 */
export interface FolderPermissionChainItem {
  folderId: string;
  folderName: string;
  isPrivate: boolean;
  permissions: FolderPermissionWithUser[];
}

/**
 * Get the permission chain from a folder up to the root
 *
 * Returns array of folders with their permissions, starting from the given folder
 * and going up through parent folders to the root.
 *
 * Useful for:
 * - UI to show inherited permissions
 * - Debugging permission issues
 * - Understanding effective access
 *
 * @param folderId - ID of the folder to start from
 * @returns Array of folder permission info from target folder to root
 */
export async function getFolderPermissionChain(
  folderId: string
): Promise<FolderPermissionChainItem[]> {
  const chain: FolderPermissionChainItem[] = [];
  let currentFolderId: string | null = folderId;

  while (currentFolderId) {
    const folder: {
      id: string;
      name: string;
      isPrivate: boolean;
      parentId: string | null;
      permissions: FolderPermissionWithUser[];
    } | null = await prisma.folder.findUnique({
      where: { id: currentFolderId },
      select: {
        id: true,
        name: true,
        isPrivate: true,
        parentId: true,
        permissions: {
          select: permissionWithUserSelect,
          orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
        },
      },
    });

    if (!folder) {
      break;
    }

    chain.push({
      folderId: folder.id,
      folderName: folder.name,
      isPrivate: folder.isPrivate,
      permissions: folder.permissions,
    });

    currentFolderId = folder.parentId;
  }

  return chain;
}

/**
 * Copy permissions from parent folder to a newly created child folder
 *
 * This is a convenience function that:
 * 1. Gets the parent folder ID
 * 2. Copies all permissions from parent to child
 * 3. Optionally copies the isPrivate flag
 *
 * @param childFolderId - ID of the child folder
 * @param copyPrivacy - Whether to also copy the isPrivate flag (default: true)
 * @returns Number of permissions copied, or 0 if no parent
 */
export async function copyParentPermissions(
  childFolderId: string,
  copyPrivacy: boolean = true
): Promise<number> {
  // Get child folder with parent info
  const childFolder = await prisma.folder.findUnique({
    where: { id: childFolderId },
    select: { parentId: true },
  });

  if (!childFolder?.parentId) {
    return 0; // No parent to copy from
  }

  // Copy permissions
  const count = await copyFolderPermissions(childFolder.parentId, childFolderId);

  // Optionally copy privacy setting
  if (copyPrivacy) {
    const parentFolder = await prisma.folder.findUnique({
      where: { id: childFolder.parentId },
      select: { isPrivate: true },
    });

    if (parentFolder?.isPrivate) {
      await prisma.folder.update({
        where: { id: childFolderId },
        data: { isPrivate: true },
      });
    }
  }

  logger.info(
    { childFolderId, parentId: childFolder.parentId, permissionsCopied: count, copyPrivacy },
    "Parent permissions copied to child folder"
  );

  return count;
}

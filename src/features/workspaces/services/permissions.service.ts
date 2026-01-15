/**
 * Workspace Permissions Service
 *
 * Centralized permission checking for workspace-based access control.
 * Implements RBAC (Role-Based Access Control) with ownership.
 *
 * Permission Matrix:
 * | Action              | Owner | ADMIN | EDITOR | VIEWER | Non-membre |
 * |---------------------|-------|-------|--------|--------|------------|
 * | Voir workspace      | Yes   | Yes   | Yes    | Yes    | No         |
 * | Lire notes          | Yes   | Yes   | Yes    | Yes    | No         |
 * | Creer notes         | Yes   | Yes   | Yes    | No     | No         |
 * | Modifier notes      | Yes   | Yes   | Yes    | No     | No         |
 * | Supprimer notes     | Yes   | Yes   | No     | No     | No         |
 * | Gerer membres       | Yes   | Yes   | No     | No     | No         |
 * | Modifier workspace  | Yes   | Yes   | No     | No     | No         |
 * | Supprimer workspace | Yes   | No    | No     | No     | No         |
 *
 * @see Story 8.3: Permissions par Workspace
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { WorkspaceRole } from "@prisma/client";
import type { Workspace, UserWorkspaceRole } from "../types";

/**
 * Check if a user can access (view) a workspace
 *
 * Access is granted if:
 * - User is the workspace owner
 * - User is a member of the workspace (any role)
 *
 * @param userId - ID of the user
 * @param workspaceId - ID of the workspace
 * @returns true if user can access the workspace
 */
export async function canAccessWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      ownerId: true,
      members: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  if (!workspace) {
    return false;
  }

  // Owner always has access
  if (workspace.ownerId === userId) {
    return true;
  }

  // Member has access
  return workspace.members.length > 0;
}

/**
 * Check if a user can manage a workspace (modify settings, manage members)
 *
 * Management is allowed if:
 * - User is the workspace owner
 * - User has ADMIN role in the workspace
 *
 * @param userId - ID of the user
 * @param workspaceId - ID of the workspace
 * @returns true if user can manage the workspace
 */
export async function canManageWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      ownerId: true,
      members: {
        where: { userId, role: "ADMIN" },
        select: { id: true },
      },
    },
  });

  if (!workspace) {
    return false;
  }

  // Owner can manage
  if (workspace.ownerId === userId) {
    return true;
  }

  // ADMIN can manage
  return workspace.members.length > 0;
}

/**
 * Check if a user can edit notes in a workspace
 *
 * Editing is allowed if:
 * - User is the workspace owner
 * - User has ADMIN role in the workspace
 * - User has EDITOR role in the workspace
 *
 * @param userId - ID of the user
 * @param workspaceId - ID of the workspace
 * @returns true if user can edit notes
 */
export async function canEditNotes(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      ownerId: true,
      members: {
        where: {
          userId,
          role: { in: ["ADMIN", "EDITOR"] },
        },
        select: { id: true },
      },
    },
  });

  if (!workspace) {
    return false;
  }

  // Owner can edit
  if (workspace.ownerId === userId) {
    return true;
  }

  // ADMIN or EDITOR can edit
  return workspace.members.length > 0;
}

/**
 * Check if a user can delete notes in a workspace
 *
 * Deletion is allowed if:
 * - User is the workspace owner
 * - User has ADMIN role in the workspace
 *
 * Note: EDITOR cannot delete notes (only create/modify)
 *
 * @param userId - ID of the user
 * @param workspaceId - ID of the workspace
 * @returns true if user can delete notes
 */
export async function canDeleteNotes(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  // Same as canManageWorkspace - only owner and ADMIN can delete
  return canManageWorkspace(userId, workspaceId);
}

/**
 * Get all workspaces accessible to a user
 *
 * Returns workspaces where user is:
 * - The owner
 * - A member (any role)
 *
 * Ordered by: personal first, then alphabetically by name
 *
 * @param userId - ID of the user
 * @returns Array of accessible workspaces
 */
export async function getAccessibleWorkspaces(userId: string): Promise<Workspace[]> {
  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      isPersonal: true,
      createdAt: true,
      updatedAt: true,
      ownerId: true,
    },
    orderBy: [
      { isPersonal: "desc" }, // Personal workspaces first
      { name: "asc" },
    ],
  });

  logger.info({ userId, count: workspaces.length }, "Accessible workspaces listed for user");
  return workspaces;
}

/**
 * Get user's role in a workspace
 *
 * Returns:
 * - "OWNER" if user is the workspace owner
 * - WorkspaceRole (ADMIN, EDITOR, VIEWER) if user is a member
 * - null if user has no access
 *
 * @param userId - ID of the user
 * @param workspaceId - ID of the workspace
 * @returns User's role or null if no access
 */
export async function getUserRoleInWorkspace(
  userId: string,
  workspaceId: string
): Promise<UserWorkspaceRole | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      ownerId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!workspace) {
    return null;
  }

  // Check if owner
  if (workspace.ownerId === userId) {
    return "OWNER";
  }

  // Check if member
  const member = workspace.members[0];
  if (member) {
    return member.role;
  }

  return null;
}

/**
 * Get accessible workspaces with user's role for each
 *
 * Useful for UI to show role badges next to workspace names.
 *
 * @param userId - ID of the user
 * @returns Array of workspaces with user's role
 */
export async function getAccessibleWorkspacesWithRole(
  userId: string
): Promise<(Workspace & { userRole: UserWorkspaceRole })[]> {
  // Get owned workspaces
  const ownedWorkspaces = await prisma.workspace.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      isPersonal: true,
      createdAt: true,
      updatedAt: true,
      ownerId: true,
    },
  });

  // Get workspaces where user is a member
  const memberWorkspaces = await prisma.workspace.findMany({
    where: {
      members: { some: { userId } },
      NOT: { ownerId: userId }, // Exclude owned workspaces (already in ownedWorkspaces)
    },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      isPersonal: true,
      createdAt: true,
      updatedAt: true,
      ownerId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  // Combine and add role
  const result: (Workspace & { userRole: UserWorkspaceRole })[] = [
    ...ownedWorkspaces.map((ws) => ({
      ...ws,
      userRole: "OWNER" as const,
    })),
    ...memberWorkspaces
      .filter((ws) => ws.members[0]) // Filter out any workspaces without member entry
      .map((ws) => ({
        id: ws.id,
        name: ws.name,
        description: ws.description,
        icon: ws.icon,
        isPersonal: ws.isPersonal,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
        ownerId: ws.ownerId,
        userRole: ws.members[0]!.role, // Safe due to filter
      })),
  ];

  // Sort: personal first, then alphabetically
  result.sort((a, b) => {
    if (a.isPersonal !== b.isPersonal) {
      return a.isPersonal ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  logger.info({ userId, count: result.length }, "Accessible workspaces with role listed");
  return result;
}

// ============================================
// Folder Permission Functions (Story 8.4)
// ============================================

/**
 * Role priority for comparison (lower = more permissions)
 */
const ROLE_PRIORITY: Record<WorkspaceRole | "OWNER", number> = {
  OWNER: 0,
  ADMIN: 1,
  EDITOR: 2,
  VIEWER: 3,
};

/**
 * Get the minimum (most restrictive) of two roles
 *
 * Used to ensure folder permissions cannot exceed workspace permissions.
 */
function getMinRole(
  role1: UserWorkspaceRole | null,
  role2: WorkspaceRole | null
): UserWorkspaceRole | null {
  if (role1 === null || role2 === null) {
    return null;
  }

  const priority1 = ROLE_PRIORITY[role1];
  const priority2 = ROLE_PRIORITY[role2];

  // Return the role with higher priority number (more restrictive)
  return priority1 >= priority2 ? role1 : role2;
}

/**
 * Get the effective role a user has on a folder
 *
 * Algorithm:
 * 1. Check workspace access (prerequisite)
 * 2. If folder is private:
 *    - Owner/ADMIN always have access
 *    - Others need explicit FolderPermission
 * 3. If folder is not private:
 *    - Check for explicit FolderPermission
 *    - If exists, return MIN(folder role, workspace role)
 *    - If not, inherit from parent or use workspace role
 *
 * @param userId - ID of the user
 * @param folderId - ID of the folder
 * @returns Effective role or null if no access
 */
export async function getEffectiveFolderRole(
  userId: string,
  folderId: string
): Promise<UserWorkspaceRole | null> {
  // Get folder with workspace info
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: {
      id: true,
      isPrivate: true,
      workspaceId: true,
      createdById: true,
      parentId: true,
      permissions: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!folder) {
    return null;
  }

  // If no workspace, check if user is folder creator
  if (!folder.workspaceId) {
    if (folder.createdById === userId) {
      return "OWNER";
    }
    // Check for explicit folder permission
    const folderPerm = folder.permissions[0];
    return folderPerm?.role ?? null;
  }

  // Get workspace role
  const workspaceRole = await getUserRoleInWorkspace(userId, folder.workspaceId);

  // If no workspace access, no folder access
  if (workspaceRole === null) {
    return null;
  }

  // Owner and ADMIN always have access to all folders (even private)
  if (workspaceRole === "OWNER" || workspaceRole === "ADMIN") {
    return workspaceRole;
  }

  // Check for explicit folder permission
  const folderPerm = folder.permissions[0];

  if (folder.isPrivate) {
    // Private folder: need explicit permission (unless owner/admin handled above)
    if (!folderPerm) {
      return null;
    }
    // Return MIN of workspace role and folder permission
    return getMinRole(workspaceRole, folderPerm.role);
  }

  // Non-private folder
  if (folderPerm) {
    // Has explicit permission: return MIN of workspace and folder roles
    return getMinRole(workspaceRole, folderPerm.role);
  }

  // No explicit permission: check parent hierarchy
  if (folder.parentId) {
    const parentRole = await getEffectiveFolderRole(userId, folder.parentId);
    if (parentRole) {
      return getMinRole(workspaceRole, parentRole === "OWNER" ? "ADMIN" : parentRole);
    }
  }

  // Fall back to workspace role
  return workspaceRole;
}

/**
 * Check if a user can access (view) a folder
 *
 * @param userId - ID of the user
 * @param folderId - ID of the folder
 * @returns true if user can access the folder
 */
export async function canAccessFolder(
  userId: string,
  folderId: string
): Promise<boolean> {
  const role = await getEffectiveFolderRole(userId, folderId);
  return role !== null;
}

/**
 * Check if a user can edit content in a folder
 *
 * Editing requires at least EDITOR role.
 *
 * @param userId - ID of the user
 * @param folderId - ID of the folder
 * @returns true if user can edit in the folder
 */
export async function canEditFolder(
  userId: string,
  folderId: string
): Promise<boolean> {
  const role = await getEffectiveFolderRole(userId, folderId);

  if (role === null) {
    return false;
  }

  // Owner, ADMIN, and EDITOR can edit
  return role === "OWNER" || role === "ADMIN" || role === "EDITOR";
}

/**
 * Check if a user can manage a folder (change permissions, privacy)
 *
 * Only workspace owner and ADMIN can manage folder permissions.
 *
 * @param userId - ID of the user
 * @param folderId - ID of the folder
 * @returns true if user can manage the folder
 */
export async function canManageFolder(
  userId: string,
  folderId: string
): Promise<boolean> {
  // Get folder's workspace
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { workspaceId: true, createdById: true },
  });

  if (!folder) {
    return false;
  }

  // If no workspace, only folder creator can manage
  if (!folder.workspaceId) {
    return folder.createdById === userId;
  }

  // Check workspace management permission
  return canManageWorkspace(userId, folder.workspaceId);
}

/**
 * Get all accessible folder IDs for a user within a workspace
 *
 * Filters out private folders the user doesn't have access to.
 *
 * @param userId - ID of the user
 * @param workspaceId - ID of the workspace
 * @returns Array of accessible folder IDs
 */
export async function getAccessibleFolderIds(
  userId: string,
  workspaceId: string
): Promise<string[]> {
  // Get user's workspace role
  const workspaceRole = await getUserRoleInWorkspace(userId, workspaceId);

  if (workspaceRole === null) {
    return [];
  }

  // Owner and ADMIN have access to all folders
  if (workspaceRole === "OWNER" || workspaceRole === "ADMIN") {
    const folders = await prisma.folder.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    return folders.map((f) => f.id);
  }

  // Get all folders in workspace
  const folders = await prisma.folder.findMany({
    where: { workspaceId },
    select: {
      id: true,
      isPrivate: true,
      permissions: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  // Filter: include public folders OR private folders with explicit permission
  const accessibleFolders = folders.filter((folder) => {
    if (!folder.isPrivate) {
      return true; // Public folders accessible to all workspace members
    }
    return folder.permissions.length > 0; // Private folders need explicit permission
  });

  logger.info(
    { userId, workspaceId, total: folders.length, accessible: accessibleFolders.length },
    "Accessible folders filtered for user"
  );

  return accessibleFolders.map((f) => f.id);
}

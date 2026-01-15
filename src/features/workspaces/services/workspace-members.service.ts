/**
 * Workspace Members Service
 *
 * Business logic for managing workspace membership and roles.
 * - Owner and ADMIN can add/remove members
 * - Owner and ADMIN can change member roles
 * - Members cannot have multiple roles in the same workspace
 * - Owner cannot be added as a member (they already have full access)
 *
 * @see Story 8.3: Permissions par Workspace
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import type { WorkspaceRole } from "@prisma/client";
import type { WorkspaceMember, WorkspaceMemberWithUser, AddMemberInput } from "../types";

/**
 * Selection fields for WorkspaceMember responses
 */
const memberSelect = {
  id: true,
  role: true,
  workspaceId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Selection fields for WorkspaceMember with user info
 */
const memberWithUserSelect = {
  ...memberSelect,
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
 * Get all members of a workspace
 *
 * Returns all members with their user info, ordered by role (ADMIN first) then name.
 *
 * @param workspaceId - ID of the workspace
 * @returns Array of workspace members with user info
 */
export async function getMembersByWorkspace(
  workspaceId: string
): Promise<WorkspaceMemberWithUser[]> {
  // Verify workspace exists
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });

  if (!workspace) {
    throw new NotFoundError(`Workspace with ID '${workspaceId}' not found`);
  }

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: memberWithUserSelect,
    orderBy: [
      { role: "asc" }, // ADMIN comes before EDITOR, EDITOR before VIEWER
      { user: { name: "asc" } },
    ],
  });

  logger.info({ workspaceId, count: members.length }, "Workspace members listed");
  return members;
}

/**
 * Add a member to a workspace
 *
 * Personal workspaces cannot have members (Story 8.5).
 *
 * @param workspaceId - ID of the workspace
 * @param data - Member data (userId, role)
 * @returns Created workspace member with user info
 * @throws {NotFoundError} If workspace or user doesn't exist
 * @throws {ForbiddenError} If workspace is personal (cannot add members)
 * @throws {ConflictError} If user is already a member or is the owner
 */
export async function addMember(
  workspaceId: string,
  data: AddMemberInput
): Promise<WorkspaceMemberWithUser> {
  // Verify workspace exists and get owner info
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true, isPersonal: true },
  });

  if (!workspace) {
    throw new NotFoundError(`Workspace with ID '${workspaceId}' not found`);
  }

  // CRITICAL: Cannot add members to personal workspace (Story 8.5: AC #6)
  if (workspace.isPersonal) {
    throw new ForbiddenError(
      "Impossible d'ajouter des membres à un espace personnel",
      "workspace-personal-no-members"
    );
  }

  // Cannot add owner as member (they already have full access)
  if (workspace.ownerId === data.userId) {
    throw new ConflictError("Cannot add workspace owner as a member. Owner already has full access.");
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true },
  });

  if (!user) {
    throw new NotFoundError(`User with ID '${data.userId}' not found`);
  }

  // Check if already a member
  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: data.userId,
      },
    },
  });

  if (existingMember) {
    throw new ConflictError("User is already a member of this workspace");
  }

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: data.userId,
      role: data.role,
    },
    select: memberWithUserSelect,
  });

  logger.info(
    { workspaceId, memberId: member.id, userId: data.userId, role: data.role },
    "Member added to workspace"
  );

  return member;
}

/**
 * Update a member's role
 *
 * @param memberId - ID of the workspace member
 * @param role - New role to assign
 * @returns Updated workspace member with user info
 * @throws {NotFoundError} If member doesn't exist
 */
export async function updateMemberRole(
  memberId: string,
  role: WorkspaceRole
): Promise<WorkspaceMemberWithUser> {
  const existing = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { id: true, role: true },
  });

  if (!existing) {
    throw new NotFoundError(`Workspace member with ID '${memberId}' not found`);
  }

  const member = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role },
    select: memberWithUserSelect,
  });

  logger.info(
    { memberId, oldRole: existing.role, newRole: role },
    "Member role updated"
  );

  return member;
}

/**
 * Remove a member from a workspace
 *
 * @param memberId - ID of the workspace member to remove
 * @throws {NotFoundError} If member doesn't exist
 */
export async function removeMember(memberId: string): Promise<void> {
  const existing = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { id: true, userId: true, workspaceId: true },
  });

  if (!existing) {
    throw new NotFoundError(`Workspace member with ID '${memberId}' not found`);
  }

  await prisma.workspaceMember.delete({
    where: { id: memberId },
  });

  logger.info(
    { memberId, userId: existing.userId, workspaceId: existing.workspaceId },
    "Member removed from workspace"
  );
}

/**
 * Get a member's role in a workspace
 *
 * @param workspaceId - ID of the workspace
 * @param userId - ID of the user
 * @returns The member's role, or null if not a member
 */
export async function getMemberRole(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    select: { role: true },
  });

  return member?.role ?? null;
}

/**
 * Get a specific member by ID
 *
 * @param memberId - ID of the workspace member
 * @returns The workspace member with user info
 * @throws {NotFoundError} If member doesn't exist
 */
export async function getMemberById(
  memberId: string
): Promise<WorkspaceMemberWithUser> {
  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: memberWithUserSelect,
  });

  if (!member) {
    throw new NotFoundError(`Workspace member with ID '${memberId}' not found`);
  }

  return member;
}

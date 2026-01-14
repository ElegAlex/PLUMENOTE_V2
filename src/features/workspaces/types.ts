import type { Workspace as PrismaWorkspace, WorkspaceMember as PrismaWorkspaceMember, WorkspaceRole } from "@prisma/client";

// Re-export WorkspaceRole enum from Prisma
export { WorkspaceRole } from "@prisma/client";

/**
 * Available icon names for workspaces
 * @see Story 8.2: Creation et Gestion des Workspaces
 */
export type WorkspaceIcon =
  | "folder"
  | "briefcase"
  | "users"
  | "book"
  | "code"
  | "server"
  | "database"
  | "globe"
  | "settings"
  | "home"
  | "file-text"
  | "building"
  | "layers"
  | "box"
  | "archive"
  | "star";

/**
 * Workspace type for API responses
 * @see Story 8.1: Modele Workspace et Infrastructure
 */
export type Workspace = Pick<
  PrismaWorkspace,
  | "id"
  | "name"
  | "description"
  | "icon"
  | "isPersonal"
  | "createdAt"
  | "updatedAt"
  | "ownerId"
>;

/**
 * Input for creating a new workspace
 * @see Story 8.1
 */
export interface CreateWorkspaceInput {
  name: string;
  description?: string | null;
  icon?: WorkspaceIcon; // Default: "folder"
  isPersonal?: boolean; // Default: false
}

/**
 * Input for updating an existing workspace
 * @see Story 8.1
 */
export interface UpdateWorkspaceInput {
  name?: string;
  description?: string | null;
  icon?: WorkspaceIcon;
}

/**
 * Workspaces list response
 */
export interface WorkspacesListResponse {
  data: Workspace[];
}

/**
 * Single workspace response
 */
export interface WorkspaceResponse {
  data: Workspace;
}

/**
 * Workspace with note count (for list views)
 * @see Story 8.2: Creation et Gestion des Workspaces
 */
export interface WorkspaceWithCount extends Workspace {
  _count: {
    notes: number;
  };
}

// ============================================
// WorkspaceMember Types (Story 8.3 - Permissions)
// ============================================

/**
 * WorkspaceMember type for API responses
 * @see Story 8.3: Permissions par Workspace
 */
export type WorkspaceMember = Pick<
  PrismaWorkspaceMember,
  | "id"
  | "role"
  | "workspaceId"
  | "userId"
  | "createdAt"
  | "updatedAt"
>;

/**
 * WorkspaceMember with user info for list views
 * @see Story 8.3: Permissions par Workspace
 */
export interface WorkspaceMemberWithUser extends WorkspaceMember {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

/**
 * Input for adding a member to a workspace
 * @see Story 8.3
 */
export interface AddMemberInput {
  userId: string;
  role: WorkspaceRole;
}

/**
 * Input for updating a member's role
 * @see Story 8.3
 */
export interface UpdateMemberRoleInput {
  role: WorkspaceRole;
}

/**
 * User's role in a workspace (including OWNER pseudo-role)
 * @see Story 8.3
 */
export type UserWorkspaceRole = "OWNER" | WorkspaceRole;

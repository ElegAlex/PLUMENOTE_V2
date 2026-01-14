import type { Workspace as PrismaWorkspace } from "@prisma/client";

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

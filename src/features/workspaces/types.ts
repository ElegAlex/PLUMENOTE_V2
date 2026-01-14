import type { Workspace as PrismaWorkspace } from "@prisma/client";

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
  icon?: string; // Default: "folder"
  isPersonal?: boolean; // Default: false
}

/**
 * Input for updating an existing workspace
 * @see Story 8.1
 */
export interface UpdateWorkspaceInput {
  name?: string;
  description?: string | null;
  icon?: string;
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

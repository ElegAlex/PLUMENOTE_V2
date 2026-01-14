/**
 * Workspaces Feature Module
 *
 * Exports for the workspaces feature including types, schemas, services, and hooks.
 * @see Story 8.1: Modele Workspace et Infrastructure
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

// Types
export type {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspacesListResponse,
  WorkspaceResponse,
  WorkspaceWithCount,
} from "./types";

// Schemas
export {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdSchema,
} from "./schemas/workspace.schema";

// Services
export {
  createWorkspace,
  getWorkspacesByUser,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getWorkspacesWithCount,
  moveNotesToWorkspace,
} from "./services/workspaces.service";

// Hooks (Story 8.2)
export { useWorkspaces, useWorkspace, workspaceKeys } from "./hooks/useWorkspaces";
export { useWorkspacesMutation } from "./hooks/useWorkspacesMutation";
export type { UseWorkspacesMutationReturn } from "./hooks/useWorkspacesMutation";

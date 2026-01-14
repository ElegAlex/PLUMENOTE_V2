/**
 * Workspaces Feature Module
 *
 * Exports for the workspaces feature including types, schemas, and services.
 * @see Story 8.1: Modele Workspace et Infrastructure
 */

// Types
export type {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspacesListResponse,
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
} from "./services/workspaces.service";

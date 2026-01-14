/**
 * Workspaces Feature Module
 *
 * Exports for the workspaces feature including types, schemas, services, and hooks.
 * @see Story 8.1: Modele Workspace et Infrastructure
 * @see Story 8.2: Creation et Gestion des Workspaces
 * @see Story 8.3: Permissions par Workspace
 */

// Types
export type {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspacesListResponse,
  WorkspaceResponse,
  WorkspaceWithCount,
  // Story 8.3: WorkspaceMember types
  WorkspaceMember,
  WorkspaceMemberWithUser,
  AddMemberInput,
  UpdateMemberRoleInput,
  UserWorkspaceRole,
} from "./types";

// Re-export WorkspaceRole enum
export { WorkspaceRole } from "./types";

// Schemas
export {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdSchema,
  // Story 8.3: WorkspaceMember schemas
  addMemberSchema,
  updateMemberRoleSchema,
  memberIdSchema,
  workspaceMemberIdSchema,
} from "./schemas";

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

// Story 8.3: Workspace Members Service
export {
  getMembersByWorkspace,
  addMember,
  updateMemberRole,
  removeMember,
  getMemberRole,
  getMemberById,
} from "./services/workspace-members.service";

// Story 8.3: Permissions Service
export {
  canAccessWorkspace,
  canManageWorkspace,
  canEditNotes,
  canDeleteNotes,
  getAccessibleWorkspaces,
  getUserRoleInWorkspace,
  getAccessibleWorkspacesWithRole,
} from "./services/permissions.service";

// Hooks (Story 8.2)
export { useWorkspaces, useWorkspace, workspaceKeys } from "./hooks/useWorkspaces";
export { useWorkspacesMutation } from "./hooks/useWorkspacesMutation";
export type { UseWorkspacesMutationReturn } from "./hooks/useWorkspacesMutation";

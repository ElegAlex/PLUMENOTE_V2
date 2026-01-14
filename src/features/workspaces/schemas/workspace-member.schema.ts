import { z } from "zod";

/**
 * Valid workspace roles
 */
const WORKSPACE_ROLES = ["ADMIN", "EDITOR", "VIEWER"] as const;

/**
 * Schema for adding a member to a workspace
 * - userId: required, must be valid CUID
 * - role: required, must be ADMIN, EDITOR, or VIEWER
 *
 * @see Story 8.3: Permissions par Workspace
 */
export const addMemberSchema = z.object({
  userId: z.string().cuid("Invalid user ID format"),
  role: z.enum(WORKSPACE_ROLES),
});

export type AddMemberSchemaInput = z.infer<typeof addMemberSchema>;

/**
 * Schema for updating a member's role
 * - role: required, must be ADMIN, EDITOR, or VIEWER
 *
 * @see Story 8.3: Permissions par Workspace
 */
export const updateMemberRoleSchema = z.object({
  role: z.enum(WORKSPACE_ROLES),
});

export type UpdateMemberRoleSchemaInput = z.infer<typeof updateMemberRoleSchema>;

/**
 * Schema for validating workspace member ID parameter (CUID format)
 */
export const memberIdSchema = z.object({
  memberId: z.string().cuid("Invalid member ID format"),
});

export type MemberIdSchemaInput = z.infer<typeof memberIdSchema>;

/**
 * Schema for workspace and member ID parameters
 */
export const workspaceMemberIdSchema = z.object({
  id: z.string().cuid("Invalid workspace ID format"),
  memberId: z.string().cuid("Invalid member ID format"),
});

export type WorkspaceMemberIdSchemaInput = z.infer<typeof workspaceMemberIdSchema>;

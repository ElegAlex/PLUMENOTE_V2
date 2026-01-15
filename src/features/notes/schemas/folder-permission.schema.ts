import { z } from "zod";

/**
 * Valid workspace/folder roles
 * Reuses the same roles as workspace permissions
 */
const PERMISSION_ROLES = ["ADMIN", "EDITOR", "VIEWER"] as const;

/**
 * Schema for setting a folder permission
 * - userId: required, must be valid CUID
 * - role: required, must be ADMIN, EDITOR, or VIEWER
 *
 * @see Story 8.4: Permissions par Dossier
 */
export const setFolderPermissionSchema = z.object({
  userId: z.string().cuid("Invalid user ID format"),
  role: z.enum(PERMISSION_ROLES, {
    errorMap: () => ({ message: "Role must be ADMIN, EDITOR, or VIEWER" }),
  }),
});

export type SetFolderPermissionSchemaInput = z.infer<typeof setFolderPermissionSchema>;

/**
 * Schema for updating folder privacy
 * - isPrivate: required boolean
 *
 * @see Story 8.4: Permissions par Dossier
 */
export const updateFolderPrivacySchema = z.object({
  isPrivate: z.boolean({
    required_error: "isPrivate is required",
    invalid_type_error: "isPrivate must be a boolean",
  }),
});

export type UpdateFolderPrivacySchemaInput = z.infer<typeof updateFolderPrivacySchema>;

/**
 * Schema for updating a folder permission role
 * - role: required, must be ADMIN, EDITOR, or VIEWER
 *
 * @see Story 8.4: Permissions par Dossier
 */
export const updateFolderPermissionRoleSchema = z.object({
  role: z.enum(PERMISSION_ROLES, {
    errorMap: () => ({ message: "Role must be ADMIN, EDITOR, or VIEWER" }),
  }),
});

export type UpdateFolderPermissionRoleSchemaInput = z.infer<typeof updateFolderPermissionRoleSchema>;

/**
 * Schema for validating folder ID parameter (CUID format)
 */
export const folderIdSchema = z.object({
  id: z.string().cuid("Invalid folder ID format"),
});

export type FolderIdSchemaInput = z.infer<typeof folderIdSchema>;

/**
 * Schema for folder and user ID parameters
 */
export const folderUserIdSchema = z.object({
  id: z.string().cuid("Invalid folder ID format"),
  userId: z.string().cuid("Invalid user ID format"),
});

export type FolderUserIdSchemaInput = z.infer<typeof folderUserIdSchema>;

/**
 * Role type for folder permissions
 */
export type FolderPermissionRole = (typeof PERMISSION_ROLES)[number];

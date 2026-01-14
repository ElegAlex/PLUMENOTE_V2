import { z } from "zod";

/**
 * Transform empty string to undefined (for optional fields)
 */
const emptyToUndefined = (val: string | undefined) =>
  val === "" ? undefined : val;

/**
 * Schema for creating a new workspace
 * - name: required, max 255 chars
 * - description: optional, max 1000 chars
 * - icon: optional, max 50 chars, defaults to "folder"
 * - isPersonal: optional boolean, defaults to false
 *
 * @see Story 8.1: Modele Workspace et Infrastructure
 */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or less"),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  icon: z
    .string()
    .trim()
    .max(50, "Icon must be 50 characters or less")
    .optional()
    .transform(emptyToUndefined),
  isPersonal: z.boolean().optional().default(false),
});

export type CreateWorkspaceSchemaInput = z.infer<typeof createWorkspaceSchema>;

/**
 * Schema for updating an existing workspace
 * - At least one field must be provided
 * - isPersonal cannot be changed (not included in update schema)
 *
 * @see Story 8.1
 */
export const updateWorkspaceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .max(255, "Name must be 255 characters or less")
      .optional()
      .transform(emptyToUndefined),
    description: z
      .string()
      .max(1000, "Description must be 1000 characters or less")
      .nullable()
      .optional(),
    icon: z
      .string()
      .trim()
      .max(50, "Icon must be 50 characters or less")
      .optional()
      .transform(emptyToUndefined),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.icon !== undefined,
    {
      message: "At least one field must be provided",
    }
  );

export type UpdateWorkspaceSchemaInput = z.infer<typeof updateWorkspaceSchema>;

/**
 * Schema for validating workspace ID parameter (CUID format)
 */
export const workspaceIdSchema = z.object({
  id: z.string().cuid("Invalid workspace ID format"),
});

export type WorkspaceIdSchemaInput = z.infer<typeof workspaceIdSchema>;

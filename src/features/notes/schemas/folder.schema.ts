/**
 * Folder validation schemas
 * @see Story 5.1: Modele Folder et Structure Hierarchique
 */

import { z } from "zod";

/**
 * Schema for creating a new folder
 * - name: required, max 255 chars, trimmed
 * - parentId: optional CUID, nullable (null = root level)
 */
export const createFolderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Folder name is required")
    .max(255, "Folder name must be 255 characters or less"),
  parentId: z.string().cuid("Invalid parent folder ID format").nullable().optional(),
});

export type CreateFolderSchemaInput = z.infer<typeof createFolderSchema>;

/**
 * Schema for updating an existing folder
 * - At least one field must be provided
 * - name: optional, max 255 chars, trimmed
 * - parentId: optional CUID, nullable (null = move to root)
 */
export const updateFolderSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Folder name cannot be empty")
      .max(255, "Folder name must be 255 characters or less")
      .optional(),
    parentId: z.string().cuid("Invalid parent folder ID format").nullable().optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.parentId !== undefined,
    {
      message: "At least one field must be provided",
    }
  );

export type UpdateFolderSchemaInput = z.infer<typeof updateFolderSchema>;

/**
 * Schema for validating folder ID parameter (CUID format)
 */
export const folderIdSchema = z.object({
  id: z.string().cuid("Invalid folder ID format"),
});

export type FolderIdSchemaInput = z.infer<typeof folderIdSchema>;

/**
 * Schema for folders list query parameters
 * - tree: optional boolean, if true returns hierarchical tree structure
 * - parentId: optional CUID, filter folders by parent (null = root level only)
 */
export const foldersQuerySchema = z.object({
  tree: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  parentId: z
    .string()
    .cuid("Invalid parent folder ID format")
    .nullable()
    .optional(),
});

export type FoldersQuerySchemaInput = z.infer<typeof foldersQuerySchema>;

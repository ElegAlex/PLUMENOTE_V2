import { z } from "zod";

/**
 * Schema for creating a new version (internal use)
 * - title: required, max 255 chars
 * - content: optional, max 1MB (1,000,000 chars) per NFR27
 * - ydoc: optional Buffer for CRDT state
 *
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */
export const createVersionSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or less"),
  content: z
    .string()
    .max(1_000_000, "Content must be 1MB or less")
    .nullable()
    .optional(),
  ydoc: z.instanceof(Buffer).nullable().optional(),
});

export type CreateVersionSchemaInput = z.infer<typeof createVersionSchema>;

/**
 * Schema for validating version ID parameter (CUID format)
 * @see Story 9.1
 */
export const versionIdSchema = z.object({
  versionId: z.string().cuid("Invalid version ID format"),
});

export type VersionIdSchemaInput = z.infer<typeof versionIdSchema>;

/**
 * Schema for validating note ID in version routes
 * @see Story 9.1
 */
export const noteIdParamSchema = z.object({
  id: z.string().cuid("Invalid note ID format"),
});

export type NoteIdParamSchemaInput = z.infer<typeof noteIdParamSchema>;

/**
 * Schema for versions list query parameters
 * - page: positive integer, defaults to 1
 * - pageSize: positive integer, max 50, defaults to 20
 *
 * @see Story 9.1
 */
export const versionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export type VersionsQuerySchemaInput = z.infer<typeof versionsQuerySchema>;

/**
 * Schema for snapshot request (beacon/API)
 * @see Story 9.1
 */
export const snapshotRequestSchema = z.object({
  noteId: z.string().cuid("Invalid note ID format"),
});

export type SnapshotRequestSchemaInput = z.infer<typeof snapshotRequestSchema>;

/**
 * Schema for restore version request body
 * - versionId: required, CUID format
 *
 * @see Story 9.3: Restauration de Version
 */
export const restoreVersionSchema = z.object({
  versionId: z.string().cuid("Invalid version ID format"),
});

export type RestoreVersionSchemaInput = z.infer<typeof restoreVersionSchema>;

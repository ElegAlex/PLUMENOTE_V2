import { z } from "zod";

/**
 * Transform empty string to undefined (for optional fields)
 */
const emptyToUndefined = (val: string | undefined) =>
  val === "" ? undefined : val;

/**
 * Schema for creating a new note
 * - title: optional, max 255 chars, defaults to "Sans titre"
 * - content: optional, max 1MB (1,000,000 chars) per NFR27
 * - Empty strings are treated as undefined (will use defaults)
 */
export const createNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .max(255, "Title must be 255 characters or less")
    .optional()
    .transform(emptyToUndefined),
  content: z
    .string()
    .max(1_000_000, "Content must be 1MB or less")
    .optional()
    .transform(emptyToUndefined),
  folderId: z.string().cuid("Invalid folder ID format").nullable().optional(),
  isFavorite: z.boolean().optional(),
  tagIds: z.array(z.string().cuid("Invalid tag ID format")).optional(),
});

export type CreateNoteSchemaInput = z.infer<typeof createNoteSchema>;

/**
 * Schema for updating an existing note
 * - At least one field must be provided
 * - Empty strings are treated as undefined
 */
export const updateNoteSchema = z
  .object({
    title: z
      .string()
      .trim()
      .max(255, "Title must be 255 characters or less")
      .optional()
      .transform(emptyToUndefined),
    content: z
      .string()
      .max(1_000_000, "Content must be 1MB or less")
      .optional()
      .transform(emptyToUndefined),
    folderId: z.string().cuid("Invalid folder ID format").nullable().optional(),
    isFavorite: z.boolean().optional(),
    tagIds: z.array(z.string().cuid("Invalid tag ID format")).optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.content !== undefined ||
      data.folderId !== undefined ||
      data.isFavorite !== undefined ||
      data.tagIds !== undefined,
    {
      message: "At least one field must be provided",
    }
  );

export type UpdateNoteSchemaInput = z.infer<typeof updateNoteSchema>;

/**
 * Schema for validating note ID parameter (CUID format)
 */
export const noteIdSchema = z.object({
  id: z.string().cuid("Invalid note ID format"),
});

export type NoteIdSchemaInput = z.infer<typeof noteIdSchema>;

/**
 * Valid sort fields for notes
 */
const sortFields = ["updatedAt", "createdAt", "title", "sortOrder"] as const;

/**
 * Schema for notes list query parameters
 * - page: positive integer, defaults to 1
 * - pageSize: positive integer, max 100, defaults to 20
 * - search: optional string, max 255 chars, trimmed
 * - favoriteOnly: optional boolean, filter to favorites only
 * - tagIds: optional comma-separated tag IDs for filtering
 * - sortBy: sort field (updatedAt, createdAt, title, sortOrder)
 * - sortDir: sort direction (asc, desc)
 */
export const notesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z
    .string()
    .trim()
    .max(255, "Search query must be 255 characters or less")
    .optional()
    .transform(emptyToUndefined),
  folderId: z
    .string()
    .cuid("Invalid folder ID format")
    .nullable()
    .optional(),
  favoriteOnly: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  tagIds: z
    .string()
    .transform((val) => (val ? val.split(",").filter(Boolean) : undefined))
    .optional(),
  sortBy: z.enum(sortFields).default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type NotesQuerySchemaInput = z.infer<typeof notesQuerySchema>;

/**
 * Schema for dedicated search endpoint query parameters
 * - query: required search string, min 1 char, max 255 chars
 * - page: positive integer, defaults to 1
 * - pageSize: positive integer, max 100, defaults to 20
 * - folderId: optional folder filter
 * - favoriteOnly: optional boolean
 * - tagIds: optional comma-separated tag IDs (each must be valid CUID)
 *
 * @see Story 6.1: Index Full-Text PostgreSQL (Task 3)
 */
export const searchQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Search query is required")
    .max(255, "Search query must be 255 characters or less"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  folderId: z
    .string()
    .cuid("Invalid folder ID format")
    .nullable()
    .optional(),
  favoriteOnly: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  tagIds: z
    .string()
    .transform((val) => (val ? val.split(",").filter(Boolean) : undefined))
    .pipe(
      z.array(z.string().cuid("Invalid tag ID format")).optional()
    )
    .optional(),
});

export type SearchQuerySchemaInput = z.infer<typeof searchQuerySchema>;

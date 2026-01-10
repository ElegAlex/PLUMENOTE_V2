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
});

export type CreateNoteSchemaInput = z.infer<typeof createNoteSchema>;

/**
 * Schema for updating an existing note
 * - At least one field (title or content) must be provided
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
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "At least one field (title or content) must be provided",
  });

export type UpdateNoteSchemaInput = z.infer<typeof updateNoteSchema>;

/**
 * Schema for validating note ID parameter (CUID format)
 */
export const noteIdSchema = z.object({
  id: z.string().cuid("Invalid note ID format"),
});

export type NoteIdSchemaInput = z.infer<typeof noteIdSchema>;

/**
 * Schema for notes list query parameters
 * - page: positive integer, defaults to 1
 * - pageSize: positive integer, max 100, defaults to 20
 */
export const notesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type NotesQuerySchemaInput = z.infer<typeof notesQuerySchema>;

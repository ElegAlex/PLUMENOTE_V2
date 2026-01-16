/**
 * Comment Validation Schemas
 *
 * Zod schemas for validating comment API requests.
 *
 * @see Story 9.4: Modèle Comment et Infrastructure
 */

import { z } from "zod";

/**
 * Schema for creating a new comment
 *
 * Validates:
 * - content: 1-5000 characters (trimmed)
 * - anchorStart: non-negative integer
 * - anchorEnd: non-negative integer >= anchorStart
 * - parentId: optional CUID for replies
 */
export const createCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Le commentaire ne peut pas être vide")
      .max(5000, "Le commentaire doit faire 5000 caractères maximum"),
    anchorStart: z
      .number()
      .int("La position de début doit être un entier")
      .min(0, "La position de début doit être positive ou nulle"),
    anchorEnd: z
      .number()
      .int("La position de fin doit être un entier")
      .min(0, "La position de fin doit être positive ou nulle"),
    parentId: z.string().cuid("Format d'ID de commentaire parent invalide").nullable().optional(),
  })
  .refine((data) => data.anchorEnd >= data.anchorStart, {
    message: "La position de fin doit être supérieure ou égale à la position de début",
    path: ["anchorEnd"],
  });

export type CreateCommentSchemaInput = z.infer<typeof createCommentSchema>;

/**
 * Schema for updating an existing comment
 *
 * Validates:
 * - content: optional, 1-5000 characters (trimmed)
 * - resolved: optional boolean
 * - At least one field must be provided
 */
export const updateCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Le commentaire ne peut pas être vide")
      .max(5000, "Le commentaire doit faire 5000 caractères maximum")
      .optional(),
    resolved: z.boolean().optional(),
  })
  .refine((data) => data.content !== undefined || data.resolved !== undefined, {
    message: "Au moins un champ doit être fourni (content ou resolved)",
  });

export type UpdateCommentSchemaInput = z.infer<typeof updateCommentSchema>;

/**
 * Schema for validating comment ID parameter
 */
export const commentIdSchema = z.object({
  commentId: z.string().cuid("Format d'ID de commentaire invalide"),
});

export type CommentIdSchemaInput = z.infer<typeof commentIdSchema>;

/**
 * Schema for comments list query parameters
 *
 * Validates:
 * - page: positive integer, defaults to 1
 * - pageSize: positive integer, max 100, defaults to 50
 * - resolved: optional boolean filter (string "true"/"false")
 * - sortBy: anchorStart or createdAt
 * - sortDir: asc or desc
 */
export const commentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  resolved: z
    .string()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined))
    .optional(),
  sortBy: z.enum(["anchorStart", "createdAt"]).default("anchorStart"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type CommentsQuerySchemaInput = z.infer<typeof commentsQuerySchema>;

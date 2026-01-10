import { z } from "zod";

/**
 * Transform empty string to undefined (for optional fields)
 */
const emptyToUndefined = (val: string | undefined) =>
  val === "" ? undefined : val;

/**
 * Hex color regex (with hash)
 */
const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

/**
 * Schema for creating a new tag
 * - name: required, 1-50 chars, trimmed
 * - color: optional hex color, defaults to gray (#6b7280)
 */
export const createTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tag name is required")
    .max(50, "Tag name must be 50 characters or less"),
  color: z
    .string()
    .regex(hexColorRegex, "Color must be a valid hex color (e.g., #ff5733)")
    .optional()
    .transform(emptyToUndefined),
});

export type CreateTagSchemaInput = z.infer<typeof createTagSchema>;

/**
 * Schema for updating an existing tag
 * - At least one field must be provided
 */
export const updateTagSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Tag name is required")
      .max(50, "Tag name must be 50 characters or less")
      .optional()
      .transform(emptyToUndefined),
    color: z
      .string()
      .regex(hexColorRegex, "Color must be a valid hex color (e.g., #ff5733)")
      .optional()
      .transform(emptyToUndefined),
  })
  .refine((data) => data.name !== undefined || data.color !== undefined, {
    message: "At least one field (name or color) must be provided",
  });

export type UpdateTagSchemaInput = z.infer<typeof updateTagSchema>;

/**
 * Schema for validating tag ID parameter (CUID format)
 */
export const tagIdSchema = z.object({
  id: z.string().cuid("Invalid tag ID format"),
});

export type TagIdSchemaInput = z.infer<typeof tagIdSchema>;

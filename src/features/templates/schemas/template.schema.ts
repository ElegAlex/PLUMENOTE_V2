import { z } from "zod";

/**
 * Transform empty string to undefined (for optional fields)
 */
const emptyToUndefined = (val: string | undefined) =>
  val === "" ? undefined : val;

/**
 * Schema for creating a new template
 * - name: required, max 255 chars
 * - description: optional, max 1000 chars
 * - content: required, max 100,000 characters
 * - icon: optional, max 50 chars, defaults to "file-text"
 * - isSystem: optional boolean, defaults to false
 *
 * @see Story 7.1: Modele Template et Infrastructure
 */
export const createTemplateSchema = z.object({
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
  content: z
    .string()
    .min(1, "Content is required")
    .max(100_000, "Content must be 100,000 characters or less"),
  icon: z
    .string()
    .trim()
    .max(50, "Icon must be 50 characters or less")
    .optional()
    .transform(emptyToUndefined),
  isSystem: z.boolean().optional().default(false),
});

export type CreateTemplateSchemaInput = z.infer<typeof createTemplateSchema>;

/**
 * Schema for updating an existing template
 * - At least one field must be provided
 * - isSystem cannot be changed (not included in update schema)
 *
 * @see Story 7.1
 */
export const updateTemplateSchema = z
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
    content: z
      .string()
      .min(1, "Content cannot be empty")
      .max(100_000, "Content must be 100,000 characters or less")
      .optional()
      .transform(emptyToUndefined),
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
      data.content !== undefined ||
      data.icon !== undefined,
    {
      message: "At least one field must be provided",
    }
  );

export type UpdateTemplateSchemaInput = z.infer<typeof updateTemplateSchema>;

/**
 * Schema for validating template ID parameter (CUID format)
 */
export const templateIdSchema = z.object({
  id: z.string().cuid("Invalid template ID format"),
});

export type TemplateIdSchemaInput = z.infer<typeof templateIdSchema>;

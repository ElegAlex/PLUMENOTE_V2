import type { Template as PrismaTemplate } from "@prisma/client";

/**
 * Template type for API responses
 * @see Story 7.1: Modele Template et Infrastructure
 */
export type Template = Pick<
  PrismaTemplate,
  | "id"
  | "name"
  | "description"
  | "content"
  | "icon"
  | "isSystem"
  | "createdAt"
  | "updatedAt"
  | "createdById"
>;

/**
 * Input for creating a new template
 * Note: Only admins can create templates
 * @see Story 7.1
 */
export interface CreateTemplateInput {
  name: string;
  description?: string | null;
  content: string;
  icon?: string; // Default: "file-text"
  isSystem?: boolean; // Default: false (only admin can set true)
}

/**
 * Input for updating an existing template
 * Note: isSystem cannot be changed to false once true
 * @see Story 7.1
 */
export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  content?: string;
  icon?: string;
}

/**
 * Templates list response
 */
export interface TemplatesListResponse {
  data: Template[];
}

/**
 * Single template response
 */
export interface TemplateResponse {
  data: Template;
}

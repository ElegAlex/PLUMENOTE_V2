/**
 * Templates Service
 *
 * Business logic for template CRUD operations with role-based access control.
 * - All authenticated users can read templates
 * - Only admins can create templates
 * - Admins or creators can update/delete (except system templates)
 * - System templates (isSystem=true) cannot be deleted
 *
 * @see Story 7.1: Modele Template et Infrastructure
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import type { Template, CreateTemplateInput, UpdateTemplateInput } from "../types";

/**
 * Selection fields for Template responses
 */
const templateSelect = {
  id: true,
  name: true,
  description: true,
  content: true,
  icon: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
} as const;

/**
 * Create a new template
 *
 * @param userId - ID of the user creating the template
 * @param userRole - Role of the user (must be ADMIN)
 * @param data - Template data
 * @returns Created template
 * @throws {ForbiddenError} If user is not an admin
 */
export async function createTemplate(
  userId: string,
  userRole: string,
  data: CreateTemplateInput
): Promise<Template> {
  // Only admins can create templates
  if (userRole !== "ADMIN") {
    throw new ForbiddenError("Admin role required to create templates");
  }

  const template = await prisma.template.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      content: data.content,
      icon: data.icon ?? "file-text",
      isSystem: data.isSystem ?? false,
      createdById: userId,
    },
    select: templateSelect,
  });

  logger.info({ templateId: template.id, userId }, "Template created");
  return template;
}

/**
 * Get all templates
 *
 * Returns all templates ordered by:
 * 1. System templates first
 * 2. Then alphabetically by name
 *
 * @returns Array of all templates
 */
export async function getAllTemplates(): Promise<Template[]> {
  const templates = await prisma.template.findMany({
    select: templateSelect,
    orderBy: [
      { isSystem: "desc" }, // System templates first
      { name: "asc" },
    ],
  });

  logger.info({ count: templates.length }, "Templates listed");
  return templates;
}

/**
 * Get a template by ID
 *
 * @param templateId - ID of the template to retrieve
 * @returns The template
 * @throws {NotFoundError} If template doesn't exist
 */
export async function getTemplateById(templateId: string): Promise<Template> {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: templateSelect,
  });

  if (!template) {
    throw new NotFoundError(`Template with ID '${templateId}' not found`);
  }

  logger.info({ templateId }, "Template retrieved");
  return template;
}

/**
 * Update a template
 *
 * Admins can update any template.
 * Creators can update their own templates (except system templates).
 * Note: isSystem cannot be changed.
 *
 * @param templateId - ID of the template to update
 * @param userId - ID of the user making the update
 * @param userRole - Role of the user
 * @param data - Fields to update
 * @returns Updated template
 * @throws {NotFoundError} If template doesn't exist
 * @throws {ForbiddenError} If user doesn't have permission
 */
export async function updateTemplate(
  templateId: string,
  userId: string,
  userRole: string,
  data: UpdateTemplateInput
): Promise<Template> {
  const existing = await prisma.template.findUnique({
    where: { id: templateId },
    select: { createdById: true, isSystem: true },
  });

  if (!existing) {
    throw new NotFoundError(`Template with ID '${templateId}' not found`);
  }

  // Check permissions: admin or creator (if not system template)
  const isAdmin = userRole === "ADMIN";
  const isCreator = existing.createdById === userId;

  if (!isAdmin && !isCreator) {
    throw new ForbiddenError("You do not have permission to update this template");
  }

  // Non-admins cannot modify system templates
  if (!isAdmin && existing.isSystem) {
    throw new ForbiddenError("Only admins can modify system templates");
  }

  const template = await prisma.template.update({
    where: { id: templateId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.icon !== undefined && { icon: data.icon }),
    },
    select: templateSelect,
  });

  logger.info({ templateId, userId }, "Template updated");
  return template;
}

/**
 * Delete a template
 *
 * System templates (isSystem=true) cannot be deleted.
 * Admins can delete any non-system template.
 * Creators can delete their own non-system templates.
 *
 * @param templateId - ID of the template to delete
 * @param userId - ID of the user making the deletion
 * @param userRole - Role of the user
 * @throws {NotFoundError} If template doesn't exist
 * @throws {ForbiddenError} If template is a system template or user doesn't have permission
 */
export async function deleteTemplate(
  templateId: string,
  userId: string,
  userRole: string
): Promise<void> {
  const existing = await prisma.template.findUnique({
    where: { id: templateId },
    select: { createdById: true, isSystem: true },
  });

  if (!existing) {
    throw new NotFoundError(`Template with ID '${templateId}' not found`);
  }

  // System templates cannot be deleted
  if (existing.isSystem) {
    throw new ForbiddenError("System templates cannot be deleted");
  }

  // Check permissions: admin or creator
  const isAdmin = userRole === "ADMIN";
  const isCreator = existing.createdById === userId;

  if (!isAdmin && !isCreator) {
    throw new ForbiddenError("You do not have permission to delete this template");
  }

  await prisma.template.delete({ where: { id: templateId } });

  logger.info({ templateId, userId }, "Template deleted");
}

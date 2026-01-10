/**
 * Tags Service
 *
 * Business logic for tag CRUD operations.
 * Tags are user-scoped (each user has their own tags).
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import type { Tag, CreateTagInput, UpdateTagInput } from "../types";

/**
 * Selection fields for Tag responses
 */
const tagSelect = {
  id: true,
  name: true,
  color: true,
} as const;

/**
 * Create a new tag for a user
 *
 * @throws {ConflictError} If tag name already exists for user
 */
export async function createTag(
  userId: string,
  data: CreateTagInput
): Promise<Tag> {
  // Check for duplicate name
  const existing = await prisma.tag.findUnique({
    where: {
      userId_name: { userId, name: data.name },
    },
  });

  if (existing) {
    throw new ConflictError(`Tag "${data.name}" already exists`);
  }

  const tag = await prisma.tag.create({
    data: {
      name: data.name,
      color: data.color ?? "#6b7280",
      userId,
    },
    select: tagSelect,
  });

  logger.info({ tagId: tag.id, userId }, "Tag created");
  return tag;
}

/**
 * Get all tags for a user
 */
export async function getUserTags(userId: string): Promise<Tag[]> {
  const tags = await prisma.tag.findMany({
    where: { userId },
    select: tagSelect,
    orderBy: { name: "asc" },
  });

  return tags;
}

/**
 * Get a tag by ID with ownership verification
 *
 * @throws {NotFoundError} If tag doesn't exist
 * @throws {ForbiddenError} If user doesn't own the tag
 */
export async function getTagById(tagId: string, userId: string): Promise<Tag> {
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    select: { ...tagSelect, userId: true },
  });

  if (!tag) {
    throw new NotFoundError(`Tag with ID '${tagId}' not found`);
  }

  if (tag.userId !== userId) {
    throw new ForbiddenError("You do not have permission to access this tag");
  }

  const { userId: _, ...tagData } = tag;
  return tagData;
}

/**
 * Update a tag with ownership verification
 *
 * @throws {NotFoundError} If tag doesn't exist
 * @throws {ForbiddenError} If user doesn't own the tag
 * @throws {ConflictError} If new name conflicts with existing tag
 */
export async function updateTag(
  tagId: string,
  userId: string,
  data: UpdateTagInput
): Promise<Tag> {
  // Verify ownership
  const existing = await prisma.tag.findUnique({
    where: { id: tagId },
    select: { userId: true, name: true },
  });

  if (!existing) {
    throw new NotFoundError(`Tag with ID '${tagId}' not found`);
  }

  if (existing.userId !== userId) {
    throw new ForbiddenError("You do not have permission to update this tag");
  }

  // Check for name conflict if name is being changed
  if (data.name && data.name !== existing.name) {
    const conflict = await prisma.tag.findUnique({
      where: {
        userId_name: { userId, name: data.name },
      },
    });

    if (conflict) {
      throw new ConflictError(`Tag "${data.name}" already exists`);
    }
  }

  const tag = await prisma.tag.update({
    where: { id: tagId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.color !== undefined && { color: data.color }),
    },
    select: tagSelect,
  });

  logger.info({ tagId, userId }, "Tag updated");
  return tag;
}

/**
 * Delete a tag with ownership verification
 *
 * @throws {NotFoundError} If tag doesn't exist
 * @throws {ForbiddenError} If user doesn't own the tag
 */
export async function deleteTag(tagId: string, userId: string): Promise<void> {
  // Verify ownership
  const existing = await prisma.tag.findUnique({
    where: { id: tagId },
    select: { userId: true },
  });

  if (!existing) {
    throw new NotFoundError(`Tag with ID '${tagId}' not found`);
  }

  if (existing.userId !== userId) {
    throw new ForbiddenError("You do not have permission to delete this tag");
  }

  // Delete tag (cascade will remove NoteTag relations)
  await prisma.tag.delete({ where: { id: tagId } });

  logger.info({ tagId, userId }, "Tag deleted");
}

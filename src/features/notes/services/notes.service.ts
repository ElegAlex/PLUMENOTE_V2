/**
 * Notes Service
 *
 * Business logic for note CRUD operations with ownership verification.
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import type { Note, CreateNoteInput, UpdateNoteInput } from "../types";

/**
 * Selection fields for Tag responses
 */
const tagSelect = {
  id: true,
  name: true,
  color: true,
} as const;

/**
 * Selection fields for Note responses (excludes internal fields)
 */
const noteSelect = {
  id: true,
  title: true,
  content: true,
  isFavorite: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
} as const;

/**
 * Selection fields for Note with tags
 */
const noteWithTagsSelect = {
  ...noteSelect,
  tags: {
    select: {
      tag: {
        select: tagSelect,
      },
    },
  },
} as const;

/**
 * Sort options for notes list
 */
export type NoteSortField = "updatedAt" | "createdAt" | "title" | "sortOrder";
export type SortDirection = "asc" | "desc";

/**
 * Transform Prisma note with tags to API format
 */
function transformNoteWithTags(
  note: {
    tags?: { tag: { id: string; name: string; color: string } }[];
  } & Record<string, unknown>
): Note {
  const { tags, ...rest } = note;
  return {
    ...rest,
    tags: tags?.map((t) => t.tag),
  } as Note;
}

/**
 * Create a new note
 */
export async function createNote(
  userId: string,
  data: CreateNoteInput
): Promise<Note> {
  const note = await prisma.note.create({
    data: {
      title: data.title ?? "Sans titre",
      content: data.content,
      isFavorite: data.isFavorite ?? false,
      createdById: userId,
      ...(data.tagIds?.length && {
        tags: {
          create: data.tagIds.map((tagId) => ({ tagId })),
        },
      }),
    },
    select: noteWithTagsSelect,
  });

  logger.info({ noteId: note.id, userId }, "Note created");
  return transformNoteWithTags(note);
}

/**
 * Get a note by ID with ownership verification
 *
 * @throws {NotFoundError} If note doesn't exist
 * @throws {ForbiddenError} If user doesn't own the note
 */
export async function getNoteById(noteId: string, userId: string): Promise<Note> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: noteWithTagsSelect,
  });

  if (!note) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  if (note.createdById !== userId) {
    logger.warn({ noteId, userId, ownerId: note.createdById }, "Unauthorized note access attempt");
    throw new ForbiddenError("You do not have permission to access this note");
  }

  logger.info({ noteId, userId }, "Note accessed");
  return transformNoteWithTags(note);
}

/**
 * Options for getUserNotes query
 */
export interface GetUserNotesOptions {
  page: number;
  pageSize: number;
  search?: string;
  // Filtering
  favoriteOnly?: boolean;
  tagIds?: string[];
  // Sorting
  sortBy?: NoteSortField;
  sortDir?: SortDirection;
}

/**
 * Get paginated list of notes for a user with optional search, filters, and sorting
 *
 * Search matches against title and content using case-insensitive LIKE.
 * Favorites are shown first by default, then sorted by the specified field.
 */
export async function getUserNotes(
  userId: string,
  options: GetUserNotesOptions
): Promise<{ notes: Note[]; total: number }> {
  const {
    page,
    pageSize,
    search,
    favoriteOnly,
    tagIds,
    sortBy = "updatedAt",
    sortDir = "desc",
  } = options;
  const skip = (page - 1) * pageSize;

  // Build where clause with optional filters
  const where = {
    createdById: userId,
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { content: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(favoriteOnly && { isFavorite: true }),
    ...(tagIds?.length && {
      tags: {
        some: {
          tagId: { in: tagIds },
        },
      },
    }),
  };

  // Build orderBy - favorites first, then by specified field
  const orderBy = [
    { isFavorite: "desc" as const }, // Favorites always first
    { [sortBy]: sortDir },
  ];

  const [notes, total] = await prisma.$transaction([
    prisma.note.findMany({
      where,
      select: noteWithTagsSelect,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.note.count({ where }),
  ]);

  if (search) {
    logger.info({ userId, search, total }, "Notes search executed");
  }

  return {
    notes: notes.map(transformNoteWithTags),
    total,
  };
}

/**
 * Update a note with ownership verification
 *
 * @throws {NotFoundError} If note doesn't exist
 * @throws {ForbiddenError} If user doesn't own the note
 */
export async function updateNote(
  noteId: string,
  userId: string,
  data: UpdateNoteInput
): Promise<Note> {
  // Verify ownership first
  const existing = await prisma.note.findUnique({
    where: { id: noteId },
    select: { createdById: true },
  });

  if (!existing) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  if (existing.createdById !== userId) {
    throw new ForbiddenError("You do not have permission to update this note");
  }

  // Handle tag updates if provided
  const tagUpdate = data.tagIds !== undefined
    ? {
        tags: {
          deleteMany: {}, // Remove all existing tags
          create: data.tagIds.map((tagId) => ({ tagId })),
        },
      }
    : {};

  const note = await prisma.note.update({
    where: { id: noteId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
      ...tagUpdate,
    },
    select: noteWithTagsSelect,
  });

  logger.info({ noteId, userId }, "Note updated");
  return transformNoteWithTags(note);
}

/**
 * Toggle favorite status for a note
 *
 * @throws {NotFoundError} If note doesn't exist
 * @throws {ForbiddenError} If user doesn't own the note
 */
export async function toggleNoteFavorite(
  noteId: string,
  userId: string
): Promise<Note> {
  // Get current state and verify ownership
  const existing = await prisma.note.findUnique({
    where: { id: noteId },
    select: { createdById: true, isFavorite: true },
  });

  if (!existing) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  if (existing.createdById !== userId) {
    throw new ForbiddenError("You do not have permission to update this note");
  }

  const note = await prisma.note.update({
    where: { id: noteId },
    data: { isFavorite: !existing.isFavorite },
    select: noteWithTagsSelect,
  });

  logger.info(
    { noteId, userId, isFavorite: note.isFavorite },
    "Note favorite toggled"
  );
  return transformNoteWithTags(note);
}

/**
 * Delete a note with ownership verification
 *
 * @throws {NotFoundError} If note doesn't exist
 * @throws {ForbiddenError} If user doesn't own the note
 */
export async function deleteNote(noteId: string, userId: string): Promise<void> {
  // Verify ownership first
  const existing = await prisma.note.findUnique({
    where: { id: noteId },
    select: { createdById: true },
  });

  if (!existing) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  if (existing.createdById !== userId) {
    throw new ForbiddenError("You do not have permission to delete this note");
  }

  await prisma.note.delete({ where: { id: noteId } });

  logger.info({ noteId, userId }, "Note deleted");
}

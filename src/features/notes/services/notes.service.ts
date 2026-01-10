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
 * Selection fields for Note responses (excludes internal fields)
 */
const noteSelect = {
  id: true,
  title: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
} as const;

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
      createdById: userId,
    },
    select: noteSelect,
  });

  logger.info({ noteId: note.id, userId }, "Note created");
  return note;
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
    select: noteSelect,
  });

  if (!note) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  if (note.createdById !== userId) {
    logger.warn({ noteId, userId, ownerId: note.createdById }, "Unauthorized note access attempt");
    throw new ForbiddenError("You do not have permission to access this note");
  }

  logger.info({ noteId, userId }, "Note accessed");
  return note;
}

/**
 * Get paginated list of notes for a user
 */
export async function getUserNotes(
  userId: string,
  options: { page: number; pageSize: number }
): Promise<{ notes: Note[]; total: number }> {
  const { page, pageSize } = options;
  const skip = (page - 1) * pageSize;

  const [notes, total] = await prisma.$transaction([
    prisma.note.findMany({
      where: { createdById: userId },
      select: noteSelect,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.note.count({ where: { createdById: userId } }),
  ]);

  return { notes, total };
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

  const note = await prisma.note.update({
    where: { id: noteId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
    },
    select: noteSelect,
  });

  logger.info({ noteId, userId }, "Note updated");
  return note;
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

/**
 * Versions Service
 *
 * Business logic for note version CRUD operations with permission verification.
 * Implements version history tracking for notes (FR10, FR11).
 *
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import {
  canAccessWorkspace,
  canAccessFolder,
} from "@/features/workspaces/services/permissions.service";
import type {
  NoteVersion,
  NoteVersionSummary,
  CreateVersionInput,
} from "../types";

/**
 * Check if a user can access a note (view permission)
 *
 * Access is granted if:
 * - Note is personal (workspaceId === null) and user is the creator
 * - Note is in a workspace the user can access
 * - Note is in a folder the user can access (if applicable)
 *
 * @param userId - ID of the user
 * @param note - Note object with workspaceId, folderId, createdById
 * @returns true if user can access the note
 */
async function canAccessNote(
  userId: string,
  note: { workspaceId: string | null; folderId: string | null; createdById: string }
): Promise<boolean> {
  if (note.workspaceId) {
    // Note belongs to a workspace - check workspace permissions
    const hasWorkspaceAccess = await canAccessWorkspace(userId, note.workspaceId);

    if (!hasWorkspaceAccess) {
      return false;
    }

    // If note is in a folder, also check folder permissions (Story 8.4)
    if (note.folderId) {
      return canAccessFolder(userId, note.folderId);
    }

    return true;
  } else {
    // Personal note (no workspace) - check ownership
    return note.createdById === userId;
  }
}

/**
 * Selection fields for NoteVersionSummary responses (list views)
 */
const versionSummarySelect = {
  id: true,
  version: true,
  title: true,
  createdAt: true,
  noteId: true,
  createdById: true,
  createdBy: {
    select: {
      name: true,
      image: true,
    },
  },
} as const;

/**
 * Selection fields for full NoteVersion responses (detail views)
 */
const versionFullSelect = {
  id: true,
  version: true,
  title: true,
  content: true,
  ydoc: true,
  createdAt: true,
  noteId: true,
  createdById: true,
} as const;

/**
 * Get the latest version number for a note
 *
 * @param noteId - ID of the note
 * @returns Latest version number, or 0 if no versions exist
 */
export async function getLatestVersionNumber(noteId: string): Promise<number> {
  const latestVersion = await prisma.noteVersion.findFirst({
    where: { noteId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  return latestVersion?.version ?? 0;
}

/**
 * Create a new version of a note
 *
 * Auto-increments the version number per note.
 * User must have access to the note to create a version.
 *
 * @param noteId - ID of the note to version
 * @param userId - ID of the user creating the version
 * @param data - Version data (title, content, ydoc)
 * @returns Created version
 * @throws {NotFoundError} If note doesn't exist or is deleted
 * @throws {ForbiddenError} If user doesn't have permission to access the note
 */
export async function createVersion(
  noteId: string,
  userId: string,
  data: CreateVersionInput
): Promise<NoteVersion> {
  // 1. Verify that the note exists and is not deleted
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      workspaceId: true,
      folderId: true,
      createdById: true,
      deletedAt: true,
    },
  });

  if (!note || note.deletedAt) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  // 2. Verify user has access to the note
  const hasAccess = await canAccessNote(userId, note);
  if (!hasAccess) {
    logger.warn(
      { noteId, userId, ownerId: note.createdById, workspaceId: note.workspaceId },
      "Unauthorized version creation attempt"
    );
    throw new ForbiddenError("You do not have permission to access this note");
  }

  // 3. Create the version with retry logic for race conditions
  // Two concurrent requests might try to create the same version number,
  // so we retry with an incremented version if we hit a unique constraint violation
  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Get the next version number
      const latestVersion = await getLatestVersionNumber(noteId);
      const nextVersion = latestVersion + 1;

      // Attempt to create the version
      const version = await prisma.noteVersion.create({
        data: {
          noteId,
          version: nextVersion,
          title: data.title,
          content: data.content ?? null,
          ydoc: data.ydoc ?? null,
          createdById: userId,
        },
        select: versionFullSelect,
      });

      logger.info(
        { noteId, versionId: version.id, version: nextVersion, userId },
        "Note version created"
      );

      return version;
    } catch (error) {
      lastError = error;

      // Check if this is a unique constraint violation (P2002)
      const isPrismaUniqueError =
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2002";

      if (isPrismaUniqueError && attempt < MAX_RETRIES - 1) {
        // Retry with the next version number
        logger.warn(
          { noteId, userId, attempt: attempt + 1 },
          "Version conflict, retrying with next version number"
        );
        continue;
      }

      // Re-throw if not a unique constraint error or max retries reached
      throw error;
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError;
}

/**
 * Get paginated list of versions for a note
 *
 * Returns versions in descending order (newest first).
 * User must have access to the note to view its versions.
 *
 * @param noteId - ID of the note
 * @param userId - ID of the user
 * @param options - Pagination options (page, pageSize)
 * @returns Paginated list of version summaries
 * @throws {NotFoundError} If note doesn't exist or is deleted
 * @throws {ForbiddenError} If user doesn't have permission to access the note
 */
export async function getVersionsByNoteId(
  noteId: string,
  userId: string,
  options: { page: number; pageSize: number }
): Promise<{ versions: NoteVersionSummary[]; total: number }> {
  const { page, pageSize } = options;
  const skip = (page - 1) * pageSize;

  // 1. Verify that the note exists and is not deleted
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      workspaceId: true,
      folderId: true,
      createdById: true,
      deletedAt: true,
    },
  });

  if (!note || note.deletedAt) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  // 2. Verify user has access to the note
  const hasAccess = await canAccessNote(userId, note);
  if (!hasAccess) {
    logger.warn(
      { noteId, userId, ownerId: note.createdById, workspaceId: note.workspaceId },
      "Unauthorized version list access attempt"
    );
    throw new ForbiddenError("You do not have permission to access this note");
  }

  // 3. Fetch versions with pagination
  const [versions, total] = await prisma.$transaction([
    prisma.noteVersion.findMany({
      where: { noteId },
      select: versionSummarySelect,
      orderBy: { version: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.noteVersion.count({ where: { noteId } }),
  ]);

  logger.info(
    { noteId, userId, page, pageSize, total },
    "Note versions listed"
  );

  return { versions, total };
}

/**
 * Get a specific version by ID with full content
 *
 * Returns the complete version including content and ydoc.
 * User must have access to the parent note to view the version.
 *
 * @param versionId - ID of the version
 * @param userId - ID of the user
 * @returns Full version with content
 * @throws {NotFoundError} If version doesn't exist or parent note is deleted
 * @throws {ForbiddenError} If user doesn't have permission to access the note
 */
export async function getVersionById(
  versionId: string,
  userId: string
): Promise<NoteVersion> {
  // 1. Fetch version with note info for permission check
  const version = await prisma.noteVersion.findUnique({
    where: { id: versionId },
    select: {
      ...versionFullSelect,
      note: {
        select: {
          id: true,
          workspaceId: true,
          folderId: true,
          createdById: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!version || version.note.deletedAt) {
    throw new NotFoundError(`Version with ID '${versionId}' not found`);
  }

  // 2. Verify user has access to the parent note
  const hasAccess = await canAccessNote(userId, version.note);
  if (!hasAccess) {
    logger.warn(
      { versionId, noteId: version.noteId, userId, workspaceId: version.note.workspaceId },
      "Unauthorized version access attempt"
    );
    throw new ForbiddenError("You do not have permission to access this version");
  }

  logger.info({ versionId, noteId: version.noteId, userId }, "Note version accessed");

  // Return version without the nested note object
  const { note: _, ...versionData } = version;
  return versionData;
}

/**
 * Get a specific version by note ID and version number
 *
 * Useful for accessing a specific version number (e.g., "version 3 of note X").
 *
 * @param noteId - ID of the note
 * @param versionNumber - Version number (1, 2, 3, etc.)
 * @param userId - ID of the user
 * @returns Full version with content
 * @throws {NotFoundError} If version doesn't exist or parent note is deleted
 * @throws {ForbiddenError} If user doesn't have permission to access the note
 */
export async function getVersionByNumber(
  noteId: string,
  versionNumber: number,
  userId: string
): Promise<NoteVersion> {
  // 1. Verify that the note exists and is not deleted
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      workspaceId: true,
      folderId: true,
      createdById: true,
      deletedAt: true,
    },
  });

  if (!note || note.deletedAt) {
    throw new NotFoundError(`Note with ID '${noteId}' not found`);
  }

  // 2. Verify user has access to the note
  const hasAccess = await canAccessNote(userId, note);
  if (!hasAccess) {
    throw new ForbiddenError("You do not have permission to access this note");
  }

  // 3. Fetch the specific version
  const version = await prisma.noteVersion.findUnique({
    where: {
      noteId_version: {
        noteId,
        version: versionNumber,
      },
    },
    select: versionFullSelect,
  });

  if (!version) {
    throw new NotFoundError(`Version ${versionNumber} of note '${noteId}' not found`);
  }

  logger.info(
    { noteId, versionNumber, versionId: version.id, userId },
    "Note version by number accessed"
  );

  return version;
}

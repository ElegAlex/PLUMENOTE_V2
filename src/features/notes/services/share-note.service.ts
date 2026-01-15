/**
 * Share Note Service
 *
 * Handles sharing (copying) notes from personal workspace to team workspaces.
 * The original note remains in the personal workspace unchanged.
 *
 * @see Story 8.6: Partage vers Espace Équipe
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ForbiddenError, NotFoundError } from "@/lib/api-error";
import { canEditNotes } from "@/features/workspaces/services/permissions.service";
import type { Note } from "../types";

/**
 * Result of sharing a note to a workspace
 */
export interface ShareNoteResult {
  originalNote: Note;
  sharedNote: Note;
}

/**
 * Share (copy) a note from personal workspace to a team workspace
 *
 * This function:
 * 1. Verifies the source note is in the user's personal workspace (workspaceId === null)
 * 2. Verifies the user owns the source note
 * 3. Verifies the target workspace is NOT a personal workspace
 * 4. Verifies the user has write permissions in the target workspace (EDITOR or ADMIN)
 * 5. Creates a copy of the note in the target workspace
 * 6. Copies all tags to the new note
 *
 * @param sourceNoteId - ID of the note to share
 * @param userId - ID of the user performing the share
 * @param targetWorkspaceId - ID of the target workspace
 * @param targetFolderId - Optional ID of the folder to place the shared note in
 * @returns The original and shared notes
 * @throws NotFoundError if note or workspace not found
 * @throws ForbiddenError if permission checks fail
 */
export async function shareNoteToWorkspace(
  sourceNoteId: string,
  userId: string,
  targetWorkspaceId: string,
  targetFolderId?: string
): Promise<ShareNoteResult> {
  // 1. Fetch source note with tags
  const sourceNote = await prisma.note.findUnique({
    where: { id: sourceNoteId, deletedAt: null },
    include: {
      tags: { include: { tag: true } },
    },
  });

  if (!sourceNote) {
    throw new NotFoundError("Note not found");
  }

  // 2. Verify source is in personal workspace (workspaceId === null)
  if (sourceNote.workspaceId !== null) {
    throw new ForbiddenError(
      "Only notes from personal workspace can be shared",
      "note-not-personal"
    );
  }

  // 3. Verify user owns the source note
  if (sourceNote.createdById !== userId) {
    throw new ForbiddenError(
      "You can only share your own notes",
      "note-not-owned"
    );
  }

  // 4. Fetch target workspace
  const targetWorkspace = await prisma.workspace.findUnique({
    where: { id: targetWorkspaceId },
    select: { id: true, name: true, isPersonal: true },
  });

  if (!targetWorkspace) {
    throw new NotFoundError("Target workspace not found");
  }

  // 5. Verify target is NOT a personal workspace
  if (targetWorkspace.isPersonal) {
    throw new ForbiddenError(
      "Cannot share to a personal workspace",
      "target-is-personal"
    );
  }

  // 6. Verify user has write permissions in target workspace
  const canWrite = await canEditNotes(userId, targetWorkspaceId);
  if (!canWrite) {
    throw new ForbiddenError(
      "You do not have write permissions in this workspace",
      "no-write-permission"
    );
  }

  // 7. If targetFolderId provided, verify it exists in target workspace
  if (targetFolderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: targetFolderId, workspaceId: targetWorkspaceId },
    });
    if (!folder) {
      throw new NotFoundError("Target folder not found in workspace");
    }
  }

  // 8. Create the copy in a transaction
  const sharedNote = await prisma.$transaction(async (tx) => {
    // Create the new note
    const newNote = await tx.note.create({
      data: {
        title: sourceNote.title,
        content: sourceNote.content,
        workspaceId: targetWorkspaceId,
        folderId: targetFolderId || null,
        createdById: userId,
        isFavorite: false, // Don't copy favorite status
      },
    });

    // Copy tags if any
    if (sourceNote.tags.length > 0) {
      await tx.noteTag.createMany({
        data: sourceNote.tags.map((nt) => ({
          noteId: newNote.id,
          tagId: nt.tagId,
        })),
      });
    }

    // Fetch the created note with tags
    return tx.note.findUnique({
      where: { id: newNote.id },
      include: { tags: { include: { tag: true } } },
    });
  });

  logger.info(
    {
      userId,
      sourceNoteId,
      sharedNoteId: sharedNote!.id,
      targetWorkspaceId,
      targetFolderId: targetFolderId || null,
      workspaceName: targetWorkspace.name,
    },
    "Note shared to workspace"
  );

  // Transform to Note type (without nested tag wrapper)
  const transformNote = (note: typeof sourceNote): Note => ({
    id: note.id,
    title: note.title,
    content: note.content,
    folderId: note.folderId,
    workspaceId: note.workspaceId,
    isFavorite: note.isFavorite,
    sortOrder: note.sortOrder,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    createdById: note.createdById,
    tags: note.tags.map((nt) => nt.tag),
  });

  return {
    originalNote: transformNote(sourceNote),
    sharedNote: transformNote(sharedNote!),
  };
}

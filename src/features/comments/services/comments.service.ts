/**
 * Comments Service
 *
 * Business logic for comment CRUD operations with permission checks.
 * Supports margin comments with document anchoring.
 *
 * @see Story 9.4: Modèle Comment et Infrastructure
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { NotFoundError, ForbiddenError } from "@/lib/api-error";
import {
  canAccessWorkspace,
  canAccessFolder,
  canEditNotes,
} from "@/features/workspaces/services/permissions.service";
import type {
  Comment,
  CreateCommentInput,
  UpdateCommentInput,
  CommentsQueryOptions,
  CommentsListResult,
} from "../types";

/**
 * Prisma select for comment with author
 */
const commentSelect = {
  id: true,
  content: true,
  anchorStart: true,
  anchorEnd: true,
  resolved: true,
  noteId: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  },
} as const;

/**
 * Verify user has access to a note
 *
 * Checks:
 * - Note exists and is not deleted
 * - User has workspace access (if workspace note)
 * - User has folder access (if note is in a folder)
 * - User is note owner (if personal note)
 *
 * @throws NotFoundError if note doesn't exist
 * @throws ForbiddenError if user doesn't have access
 */
async function verifyNoteAccess(
  noteId: string,
  userId: string
): Promise<{ id: string; workspaceId: string | null; folderId: string | null; createdById: string }> {
  const note = await prisma.note.findUnique({
    where: { id: noteId, deletedAt: null },
    select: { id: true, workspaceId: true, folderId: true, createdById: true },
  });

  if (!note) {
    throw new NotFoundError(`Note avec l'ID '${noteId}' non trouvée`);
  }

  // Check permissions
  if (note.workspaceId) {
    const hasWorkspaceAccess = await canAccessWorkspace(userId, note.workspaceId);
    if (!hasWorkspaceAccess) {
      throw new ForbiddenError("Accès non autorisé à cette note");
    }

    // Check folder-level permissions (for private folders)
    if (note.folderId) {
      const hasFolderAccess = await canAccessFolder(userId, note.folderId);
      if (!hasFolderAccess) {
        throw new ForbiddenError("Accès non autorisé à ce dossier");
      }
    }
  } else if (note.createdById !== userId) {
    throw new ForbiddenError("Accès non autorisé à cette note personnelle");
  }

  return note;
}

/**
 * Create a new comment on a note
 *
 * @param userId - ID of the user creating the comment
 * @param noteId - ID of the note to comment on
 * @param data - Comment data (content, anchorStart, anchorEnd, parentId?)
 * @returns Created comment with author
 * @throws NotFoundError if note or parent comment not found
 * @throws ForbiddenError if user can't comment on this note
 */
export async function createComment(
  userId: string,
  noteId: string,
  data: CreateCommentInput
): Promise<Comment> {
  const note = await verifyNoteAccess(noteId, userId);

  // Check edit permission for commenting
  if (note.workspaceId) {
    const canEdit = await canEditNotes(userId, note.workspaceId);
    if (!canEdit) {
      throw new ForbiddenError("Permission insuffisante pour commenter cette note");
    }
  }

  // Verify parent comment exists if provided
  if (data.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: data.parentId, deletedAt: null },
      select: { id: true, noteId: true },
    });
    if (!parent || parent.noteId !== noteId) {
      throw new NotFoundError("Commentaire parent non trouvé");
    }
  }

  const comment = await prisma.comment.create({
    data: {
      content: data.content,
      anchorStart: data.anchorStart,
      anchorEnd: data.anchorEnd,
      noteId,
      parentId: data.parentId ?? null,
      createdById: userId,
    },
    select: commentSelect,
  });

  logger.info(
    { commentId: comment.id, noteId, userId, parentId: data.parentId },
    "Comment created"
  );

  return comment;
}

/**
 * Get comments for a note with pagination
 *
 * @param noteId - ID of the note
 * @param userId - ID of the requesting user
 * @param options - Query options (page, pageSize, resolved, sortBy, sortDir)
 * @returns List of comments and total count
 * @throws NotFoundError if note not found
 * @throws ForbiddenError if user doesn't have access
 */
export async function getCommentsByNoteId(
  noteId: string,
  userId: string,
  options: CommentsQueryOptions = {}
): Promise<CommentsListResult> {
  await verifyNoteAccess(noteId, userId);

  const {
    page = 1,
    pageSize = 50,
    resolved,
    sortBy = "anchorStart",
    sortDir = "asc",
  } = options;

  const where = {
    noteId,
    deletedAt: null,
    ...(resolved !== undefined && { resolved }),
  };

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      select: commentSelect,
      orderBy: [
        { [sortBy]: sortDir },
        { createdAt: "asc" }, // Secondary sort for stable ordering
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.comment.count({ where }),
  ]);

  logger.debug(
    { noteId, userId, count: comments.length, total, page, pageSize },
    "Comments fetched for note"
  );

  return { comments, total };
}

/**
 * Get a single comment by ID
 *
 * @param commentId - ID of the comment
 * @param userId - ID of the requesting user
 * @returns Comment with author
 * @throws NotFoundError if comment not found
 * @throws ForbiddenError if user doesn't have access
 */
export async function getCommentById(
  commentId: string,
  userId: string
): Promise<Comment> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId, deletedAt: null },
    select: {
      ...commentSelect,
      note: {
        select: { id: true, workspaceId: true, createdById: true },
      },
    },
  });

  if (!comment) {
    throw new NotFoundError(`Commentaire avec l'ID '${commentId}' non trouvé`);
  }

  // Verify access via the note
  await verifyNoteAccess(comment.noteId, userId);

  // Remove nested note from return
  const { note: _note, ...commentData } = comment;
  return commentData;
}

/**
 * Update a comment
 *
 * - Only the author can update content
 * - Any user with edit permission can mark as resolved
 *
 * @param commentId - ID of the comment to update
 * @param userId - ID of the user updating
 * @param data - Update data (content?, resolved?)
 * @returns Updated comment
 * @throws NotFoundError if comment not found
 * @throws ForbiddenError if user can't update this comment
 */
export async function updateComment(
  commentId: string,
  userId: string,
  data: UpdateCommentInput
): Promise<Comment> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId, deletedAt: null },
    select: {
      id: true,
      createdById: true,
      noteId: true,
      note: { select: { workspaceId: true, createdById: true } },
    },
  });

  if (!comment) {
    throw new NotFoundError(`Commentaire avec l'ID '${commentId}' non trouvé`);
  }

  // Only author can modify content
  if (data.content !== undefined && comment.createdById !== userId) {
    throw new ForbiddenError("Seul l'auteur peut modifier le contenu du commentaire");
  }

  // Check edit permission for resolving
  if (data.resolved !== undefined) {
    if (comment.note.workspaceId) {
      const canEdit = await canEditNotes(userId, comment.note.workspaceId);
      if (!canEdit) {
        throw new ForbiddenError("Permission insuffisante pour résoudre ce commentaire");
      }
    } else if (comment.note.createdById !== userId) {
      throw new ForbiddenError("Permission insuffisante pour résoudre ce commentaire");
    }
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: {
      ...(data.content !== undefined && { content: data.content }),
      ...(data.resolved !== undefined && { resolved: data.resolved }),
    },
    select: commentSelect,
  });

  logger.info(
    { commentId, userId, changes: Object.keys(data) },
    "Comment updated"
  );

  return updated;
}

/**
 * Recursively collect all descendant comment IDs for cascade delete
 *
 * @param parentIds - Array of parent comment IDs to find descendants for
 * @returns Array of all descendant comment IDs (including nested replies)
 */
async function collectDescendantIds(parentIds: string[]): Promise<string[]> {
  if (parentIds.length === 0) {
    return [];
  }

  // Find direct children of the given parents
  const children = await prisma.comment.findMany({
    where: {
      parentId: { in: parentIds },
      deletedAt: null,
    },
    select: { id: true },
  });

  const childIds = children.map((c) => c.id);

  if (childIds.length === 0) {
    return [];
  }

  // Recursively find descendants of children
  const grandchildIds = await collectDescendantIds(childIds);

  return [...childIds, ...grandchildIds];
}

/**
 * Delete a comment (soft delete)
 *
 * - Author can delete their own comments
 * - Workspace admin can delete any comment
 * - Deleting a parent comment cascades to ALL nested replies (n-level deep)
 *
 * @param commentId - ID of the comment to delete
 * @param userId - ID of the user deleting
 * @throws NotFoundError if comment not found
 * @throws ForbiddenError if user can't delete this comment
 */
export async function deleteComment(
  commentId: string,
  userId: string
): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId, deletedAt: null },
    select: {
      id: true,
      createdById: true,
      noteId: true,
      note: { select: { workspaceId: true } },
    },
  });

  if (!comment) {
    throw new NotFoundError(`Commentaire avec l'ID '${commentId}' non trouvé`);
  }

  // Check if user is author
  const isAuthor = comment.createdById === userId;

  // Check if user is workspace admin
  let isAdmin = false;
  if (comment.note.workspaceId) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          userId,
          workspaceId: comment.note.workspaceId,
        },
      },
      select: { role: true },
    });
    isAdmin = member?.role === "ADMIN";

    // Also check if user is workspace owner
    if (!isAdmin) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: comment.note.workspaceId },
        select: { ownerId: true },
      });
      isAdmin = workspace?.ownerId === userId;
    }
  }

  if (!isAuthor && !isAdmin) {
    throw new ForbiddenError("Permission insuffisante pour supprimer ce commentaire");
  }

  const now = new Date();

  // Collect all descendant IDs (n-level deep) for cascade delete
  const descendantIds = await collectDescendantIds([commentId]);

  // Soft delete the comment and ALL nested replies in a transaction
  await prisma.$transaction([
    // Delete all descendants first (if any)
    ...(descendantIds.length > 0
      ? [
          prisma.comment.updateMany({
            where: { id: { in: descendantIds } },
            data: { deletedAt: now },
          }),
        ]
      : []),
    // Delete the comment itself
    prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: now },
    }),
  ]);

  logger.info(
    { commentId, userId, isAuthor, isAdmin, descendantsDeleted: descendantIds.length },
    "Comment deleted (soft) with cascade"
  );
}

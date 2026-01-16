/**
 * Comment API Routes
 *
 * GET /api/comments/[commentId] - Get a single comment
 * PATCH /api/comments/[commentId] - Update a comment
 * DELETE /api/comments/[commentId] - Delete a comment (soft delete)
 *
 * @see Story 9.4: Modèle Comment et Infrastructure
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createErrorResponse, NotFoundError, ForbiddenError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import {
  commentIdSchema,
  updateCommentSchema,
} from "@/features/comments/schemas/comment.schema";
import {
  getCommentById,
  updateComment,
  deleteComment,
} from "@/features/comments/services/comments.service";

/**
 * GET /api/comments/[commentId]
 *
 * Get a single comment by ID.
 *
 * @returns { data: Comment }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("unauthorized", "Authentification requise", 401);
    }

    const { commentId } = await params;

    // Validate comment ID
    const idResult = commentIdSchema.safeParse({ commentId });
    if (!idResult.success) {
      return createErrorResponse("validation", "Format d'ID de commentaire invalide", 400);
    }

    const comment = await getCommentById(commentId, session.user.id);

    return NextResponse.json({ data: comment });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404);
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403);
    }
    logger.error({ error }, "Error fetching comment");
    return createErrorResponse("internal", "Une erreur s'est produite", 500);
  }
}

/**
 * PATCH /api/comments/[commentId]
 *
 * Update a comment.
 *
 * Body:
 * - content: New comment text (only author can update)
 * - resolved: Mark as resolved (any editor can update)
 *
 * @returns { data: Comment }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("unauthorized", "Authentification requise", 401);
    }

    const { commentId } = await params;

    // Validate comment ID
    const idResult = commentIdSchema.safeParse({ commentId });
    if (!idResult.success) {
      return createErrorResponse("validation", "Format d'ID de commentaire invalide", 400);
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("validation", "Corps JSON invalide", 400);
    }

    const parseResult = updateCommentSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message || "Données invalides",
        400
      );
    }

    const comment = await updateComment(
      commentId,
      session.user.id,
      parseResult.data
    );

    return NextResponse.json({ data: comment });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404);
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403);
    }
    logger.error({ error }, "Error updating comment");
    return createErrorResponse("internal", "Une erreur s'est produite", 500);
  }
}

/**
 * DELETE /api/comments/[commentId]
 *
 * Delete a comment (soft delete).
 *
 * - Author can delete their own comments
 * - Workspace admin can delete any comment
 * - Deleting a parent comment cascades to replies
 *
 * @returns 204 No Content
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("unauthorized", "Authentification requise", 401);
    }

    const { commentId } = await params;

    // Validate comment ID
    const idResult = commentIdSchema.safeParse({ commentId });
    if (!idResult.success) {
      return createErrorResponse("validation", "Format d'ID de commentaire invalide", 400);
    }

    await deleteComment(commentId, session.user.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404);
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403);
    }
    logger.error({ error }, "Error deleting comment");
    return createErrorResponse("internal", "Une erreur s'est produite", 500);
  }
}

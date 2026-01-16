/**
 * Note Comments API Routes
 *
 * GET /api/notes/[id]/comments - List comments for a note with pagination
 * POST /api/notes/[id]/comments - Create a new comment on a note
 *
 * @see Story 9.4: Modèle Comment et Infrastructure
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createErrorResponse, NotFoundError, ForbiddenError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import { noteIdSchema } from "@/features/notes/schemas/note.schema";
import {
  createCommentSchema,
  commentsQuerySchema,
} from "@/features/comments/schemas/comment.schema";
import {
  createComment,
  getCommentsByNoteId,
} from "@/features/comments/services/comments.service";

/**
 * GET /api/notes/[id]/comments
 *
 * List comments for a note with pagination.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 50, max: 100)
 * - resolved: Filter by resolved status (true/false)
 * - sortBy: Sort field (anchorStart, createdAt) (default: anchorStart)
 * - sortDir: Sort direction (asc, desc) (default: asc)
 *
 * @returns { data: Comment[], meta: { total, page, pageSize, totalPages } }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("unauthorized", "Authentification requise", 401);
    }

    const { id: noteId } = await params;

    // Validate note ID
    const idResult = noteIdSchema.safeParse({ id: noteId });
    if (!idResult.success) {
      return createErrorResponse("validation", "Format d'ID de note invalide", 400);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = commentsQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    if (!queryResult.success) {
      return createErrorResponse(
        "validation",
        queryResult.error.issues[0]?.message || "Paramètres de requête invalides",
        400
      );
    }

    const { comments, total } = await getCommentsByNoteId(
      noteId,
      session.user.id,
      queryResult.data
    );

    const { page, pageSize } = queryResult.data;

    return NextResponse.json({
      data: comments,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404);
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403);
    }
    logger.error({ error }, "Error fetching comments");
    return createErrorResponse("internal", "Une erreur s'est produite", 500);
  }
}

/**
 * POST /api/notes/[id]/comments
 *
 * Create a new comment on a note.
 *
 * Body:
 * - content: Comment text (1-5000 chars)
 * - anchorStart: Start position in document
 * - anchorEnd: End position in document
 * - parentId: Optional parent comment ID for replies
 *
 * @returns { data: Comment } with status 201
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("unauthorized", "Authentification requise", 401);
    }

    const { id: noteId } = await params;

    // Validate note ID
    const idResult = noteIdSchema.safeParse({ id: noteId });
    if (!idResult.success) {
      return createErrorResponse("validation", "Format d'ID de note invalide", 400);
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("validation", "Corps JSON invalide", 400);
    }

    const parseResult = createCommentSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message || "Données invalides",
        400
      );
    }

    const comment = await createComment(
      session.user.id,
      noteId,
      parseResult.data
    );

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404);
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403);
    }
    logger.error({ error }, "Error creating comment");
    return createErrorResponse("internal", "Une erreur s'est produite", 500);
  }
}

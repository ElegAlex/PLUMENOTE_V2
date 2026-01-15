/**
 * API Routes: /api/notes/[id]/share
 *
 * - POST: Share (copy) a note from personal workspace to a team workspace
 *
 * @see Story 8.6: Partage vers Espace Équipe
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  createErrorResponse,
  NotFoundError,
  ForbiddenError,
} from "@/lib/api-error";
import { shareNoteToWorkspace } from "@/features/notes/services/share-note.service";
import { noteIdSchema } from "@/features/notes/schemas/note.schema";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Schema for share note request body
 */
const shareNoteBodySchema = z.object({
  targetWorkspaceId: z.string().min(1, "Target workspace ID is required"),
  targetFolderId: z.string().optional(),
});

/**
 * POST /api/notes/[id]/share
 *
 * Share (copy) a note from personal workspace to a team workspace.
 * The original note remains in the personal workspace unchanged.
 *
 * Request body:
 * - targetWorkspaceId: ID of the target workspace (required)
 * - targetFolderId: ID of the target folder (optional)
 *
 * Returns 404 if note or workspace not found, 403 if permission denied.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401
      );
    }

    const { id } = await params;
    const idResult = noteIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid note ID format",
        400,
        "Validation Error"
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const bodyResult = shareNoteBodySchema.safeParse(body);
    if (!bodyResult.success) {
      return createErrorResponse(
        "validation",
        bodyResult.error.issues[0]?.message || "Invalid request body",
        400,
        "Validation Error"
      );
    }

    const { targetWorkspaceId, targetFolderId } = bodyResult.data;

    const result = await shareNoteToWorkspace(
      id,
      session.user.id,
      targetWorkspaceId,
      targetFolderId
    );

    return NextResponse.json({
      data: {
        originalNote: result.originalNote,
        sharedNote: result.sharedNote,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse(
        error.errorType || "forbidden",
        error.message,
        403,
        "Forbidden"
      );
    }

    logger.error({ error }, "Error sharing note to workspace");
    return createErrorResponse(
      "internal",
      "An error occurred while sharing the note",
      500,
      "Internal Server Error"
    );
  }
}

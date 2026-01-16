/**
 * API Routes: /api/notes/[id]/view
 *
 * Story 6.4: Notes Récentes - Track note views
 * Story 10.1: Enhanced with viewCount tracking and deduplication (1 view/user/hour)
 *
 * - POST: Track a note view with intelligent deduplication
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createErrorResponse, NotFoundError } from "@/lib/api-error";
import { noteIdSchema } from "@/features/notes/schemas/note.schema";
import { trackNoteView } from "@/features/analytics";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/notes/[id]/view
 *
 * Track that the authenticated user viewed this note.
 * Uses deduplication to only count 1 view per user per hour (Story 10.1).
 * Updates viewCount and lastViewedAt on Note when view is counted.
 *
 * Returns:
 * - 200: View tracked successfully
 *   - { data: { counted: boolean, viewCount: number } }
 *   - counted: true if view was counted, false if deduplicated
 * - 400: Invalid note ID format
 * - 401: Authentication required
 * - 404: Note not found or not accessible by user
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

    const { id: noteId } = await params;
    const idResult = noteIdSchema.safeParse({ id: noteId });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid note ID format",
        400,
        "Validation Error"
      );
    }

    const userId = session.user.id;

    // Verify note exists and user has access
    // TODO: In Story 8.x, this checks workspace access via canAccessWorkspace
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        deletedAt: null,
        OR: [
          // Personal notes (created by user, no workspace)
          { createdById: userId, workspaceId: null },
          // Notes in workspaces owned by user
          { workspace: { ownerId: userId } },
          // Notes in workspaces where user is member
          { workspace: { members: { some: { userId } } } },
        ],
      },
      select: { id: true },
    });

    if (!note) {
      throw new NotFoundError("Note not found");
    }

    // Track the view with deduplication (Story 10.1)
    // Returns { counted: boolean, viewCount: number }
    const result = await trackNoteView(noteId, userId);

    logger.info(
      { noteId, userId, counted: result.counted, viewCount: result.viewCount },
      "Note view tracked"
    );

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }

    logger.error({ error }, "Error tracking note view");
    return createErrorResponse(
      "internal",
      "An error occurred while tracking note view",
      500,
      "Internal Server Error"
    );
  }
}

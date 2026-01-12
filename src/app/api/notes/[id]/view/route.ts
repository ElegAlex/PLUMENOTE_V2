/**
 * API Routes: /api/notes/[id]/view
 *
 * Story 6.4: Notes Récentes - Track note views
 *
 * - POST: Track a note view (upsert - update if exists, create if not)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createErrorResponse, NotFoundError } from "@/lib/api-error";
import { noteIdSchema } from "@/features/notes/schemas/note.schema";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/notes/[id]/view
 *
 * Track that the authenticated user viewed this note.
 * Uses upsert to ensure only one view record per user+note,
 * updating the viewedAt timestamp on each subsequent view.
 *
 * Returns:
 * - 200: View tracked successfully with viewedAt timestamp
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

    // Verify note exists and user has access (owner check)
    // Note: In future with workspaces, this would check workspace access too
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        createdById: userId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!note) {
      throw new NotFoundError("Note not found");
    }

    // Upsert the view record - update viewedAt if exists, create if not
    // This ensures only one record per user+note (AC #4: no duplicates)
    const view = await prisma.userNoteView.upsert({
      where: {
        userId_noteId: {
          userId,
          noteId,
        },
      },
      update: {
        viewedAt: new Date(),
      },
      create: {
        userId,
        noteId,
      },
    });

    return NextResponse.json({
      data: {
        viewedAt: view.viewedAt.toISOString(),
      },
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

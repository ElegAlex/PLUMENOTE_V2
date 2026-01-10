/**
 * API Routes: /api/notes/[id]/favorite
 *
 * - POST: Toggle favorite status for a note
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  createErrorResponse,
  NotFoundError,
  ForbiddenError,
} from "@/lib/api-error";
import { toggleNoteFavorite } from "@/features/notes/services/notes.service";
import { noteIdSchema } from "@/features/notes/schemas/note.schema";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/notes/[id]/favorite
 *
 * Toggle the favorite status of a note.
 * Returns 404 if not found, 403 if not owner.
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

    const note = await toggleNoteFavorite(id, session.user.id);
    return NextResponse.json({ data: note });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error toggling favorite");
    return createErrorResponse(
      "internal",
      "An error occurred while toggling favorite status",
      500,
      "Internal Server Error"
    );
  }
}

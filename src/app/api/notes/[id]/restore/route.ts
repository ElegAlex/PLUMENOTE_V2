/**
 * API Routes: /api/notes/[id]/restore
 *
 * POST: Restore a soft-deleted note
 *
 * @see Story 3.5: Suppression d'une Note
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  createErrorResponse,
  NotFoundError,
  ForbiddenError,
} from "@/lib/api-error";
import { restoreNote } from "@/features/notes/services/notes.service";
import { noteIdSchema } from "@/features/notes/schemas/note.schema";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/notes/[id]/restore
 *
 * Restore a soft-deleted note. Returns 200 on success.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

    await restoreNote(id, session.user.id);
    return NextResponse.json({ data: { restored: true } });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error restoring note");
    return createErrorResponse(
      "internal",
      "An error occurred while restoring the note",
      500,
      "Internal Server Error"
    );
  }
}

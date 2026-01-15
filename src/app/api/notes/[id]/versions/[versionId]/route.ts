/**
 * API Routes: /api/notes/[id]/versions/[versionId]
 *
 * - GET: Get a specific version with full content
 *
 * @see Story 9.1: Modele NoteVersion et Snapshots
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  createErrorResponse,
  NotFoundError,
  ForbiddenError,
} from "@/lib/api-error";
import { getVersionById } from "@/features/versions/services/versions.service";
import {
  noteIdParamSchema,
  versionIdSchema,
} from "@/features/versions/schemas/version.schema";

type RouteParams = { params: Promise<{ id: string; versionId: string }> };

/**
 * GET /api/notes/[id]/versions/[versionId]
 *
 * Get a specific version with full content.
 * Returns the complete version including content and ydoc (if available).
 *
 * Response format:
 * {
 *   data: NoteVersion
 * }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401
      );
    }

    // 2. Validate parameters
    const { id, versionId } = await params;

    const idResult = noteIdParamSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid note ID format",
        400,
        "Validation Error"
      );
    }

    const versionIdResult = versionIdSchema.safeParse({ versionId });
    if (!versionIdResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid version ID format",
        400,
        "Validation Error"
      );
    }

    // 3. Fetch version (permission check is done in the service)
    const version = await getVersionById(versionId, session.user.id);

    // 4. Verify the version belongs to the requested note
    if (version.noteId !== id) {
      return createErrorResponse(
        "not-found",
        `Version with ID '${versionId}' not found for note '${id}'`,
        404,
        "Not Found"
      );
    }

    // 5. Return response
    return NextResponse.json({ data: version });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error fetching note version");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching the version",
      500,
      "Internal Server Error"
    );
  }
}

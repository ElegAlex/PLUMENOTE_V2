/**
 * API Routes: /api/notes/[id]/versions/restore
 *
 * POST: Restore a note to a previous version
 *
 * This endpoint restores a note to a specific version from its history.
 * It creates new versions for both the undo snapshot and the restored state,
 * so history is NEVER destroyed.
 *
 * @see Story 9.3: Restauration de Version
 * @see FR11: Un utilisateur peut restaurer une version précédente d'une note
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  createErrorResponse,
  NotFoundError,
  ForbiddenError,
} from "@/lib/api-error";
import { restoreVersion } from "@/features/versions/services/versions.service";
import {
  noteIdParamSchema,
  restoreVersionSchema,
} from "@/features/versions/schemas/version.schema";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/notes/[id]/versions/restore
 *
 * Restore a note to a previous version.
 *
 * Request body:
 * - versionId: string (CUID) - ID of the version to restore from
 *
 * Response:
 * - 200: { data: Note, meta: { restoredFrom: number, undoVersionId: string } }
 * - 400: Validation error (invalid note ID or version ID format)
 * - 401: Unauthorized (not authenticated)
 * - 403: Forbidden (no edit permission on note)
 * - 404: Not found (note or version doesn't exist)
 * - 500: Internal server error
 *
 * @see AC #2: Le contenu de la note est remplacé par le contenu de la version sélectionnée
 * @see AC #3: Une nouvelle version est créée automatiquement
 * @see AC #8: La restauration utilise le ydoc si disponible
 * @see AC #9: Fallback vers content si ydoc non disponible
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401,
        "Unauthorized"
      );
    }

    // 2. Validate note ID parameter
    const { id: noteId } = await params;
    const idResult = noteIdParamSchema.safeParse({ id: noteId });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid note ID format",
        400,
        "Validation Error"
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const { versionId } = restoreVersionSchema.parse(body);

    // 4. Perform the restoration
    const result = await restoreVersion(noteId, versionId, session.user.id);

    logger.info(
      {
        noteId,
        versionId,
        userId: session.user.id,
        restoredFromVersion: result.restoredFromVersion,
      },
      "Note version restored via API"
    );

    // 5. Return success response with note data and metadata
    return NextResponse.json({
      data: result.note,
      meta: {
        restoredFrom: result.restoredFromVersion,
        undoVersionId: result.undoVersionId,
      },
    });
  } catch (error) {
    // Handle specific error types with RFC 7807 format
    if (error instanceof NotFoundError) {
      return createErrorResponse(
        "not-found",
        error.message,
        404,
        "Not Found"
      );
    }

    if (error instanceof ForbiddenError) {
      return createErrorResponse(
        "forbidden",
        error.message,
        403,
        "Forbidden"
      );
    }

    if (error instanceof ZodError) {
      return createErrorResponse(
        "validation",
        "Invalid request body: " + error.issues[0]?.message,
        400,
        "Validation Error"
      );
    }

    // Log unexpected errors and return generic error
    logger.error({ error }, "Error restoring note version");
    return createErrorResponse(
      "internal",
      "An error occurred while restoring the version",
      500,
      "Internal Server Error"
    );
  }
}

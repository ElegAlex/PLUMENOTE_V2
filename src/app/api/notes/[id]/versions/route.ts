/**
 * API Routes: /api/notes/[id]/versions
 *
 * - GET: Get paginated list of versions for a note
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
import { getVersionsByNoteId } from "@/features/versions/services/versions.service";
import {
  noteIdParamSchema,
  versionsQuerySchema,
} from "@/features/versions/schemas/version.schema";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/notes/[id]/versions
 *
 * Get paginated list of versions for a note.
 * Returns versions in descending order (newest first).
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 50)
 *
 * Response format:
 * {
 *   data: NoteVersionSummary[],
 *   meta: { total, page, pageSize, totalPages }
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

    // 2. Validate note ID
    const { id } = await params;
    const idResult = noteIdParamSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid note ID format",
        400,
        "Validation Error"
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = versionsQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!queryResult.success) {
      const errorMessage =
        queryResult.error.issues[0]?.message ?? "Invalid query parameters";
      return createErrorResponse(
        "validation",
        errorMessage,
        400,
        "Validation Error"
      );
    }

    const { page, pageSize } = queryResult.data;

    // 4. Fetch versions
    const { versions, total } = await getVersionsByNoteId(
      id,
      session.user.id,
      { page, pageSize }
    );

    // 5. Return response with pagination meta
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      data: versions,
      meta: {
        total,
        page,
        pageSize,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error fetching note versions");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching versions",
      500,
      "Internal Server Error"
    );
  }
}

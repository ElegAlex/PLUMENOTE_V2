/**
 * API Routes: /api/notes/search
 *
 * Dedicated full-text search endpoint with highlights and relevance ranking.
 *
 * @see Story 6.1: Index Full-Text PostgreSQL
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse } from "@/lib/api-error";
import { searchNotes } from "@/features/notes/services/notes.service";
import { searchQuerySchema } from "@/features/notes/schemas/note.schema";

/**
 * GET /api/notes/search
 *
 * Full-text search notes with highlighted excerpts and relevance ranking.
 *
 * Query params:
 * - query: Search string (required)
 * - page: Page number (default: 1)
 * - pageSize: Results per page (default: 20, max: 100)
 * - folderId: Filter by folder
 * - favoriteOnly: Filter to favorites only
 * - tagIds: Comma-separated tag IDs
 *
 * Response:
 * - data: Array of notes with highlight and rank fields
 * - meta: Pagination metadata
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401
      );
    }

    const { searchParams } = new URL(request.url);
    const queryResult = searchQuerySchema.safeParse({
      query: searchParams.get("query") ?? "",
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      folderId: searchParams.get("folderId") ?? undefined,
      favoriteOnly: searchParams.get("favoriteOnly") ?? undefined,
      tagIds: searchParams.get("tagIds") ?? undefined,
    });

    if (!queryResult.success) {
      return createErrorResponse(
        "validation",
        queryResult.error.issues[0]?.message ?? "Invalid query parameters",
        400,
        "Validation Error"
      );
    }

    const { query, page, pageSize, folderId, favoriteOnly, tagIds } = queryResult.data;

    const { notes, total } = await searchNotes(session.user.id, {
      query,
      page,
      pageSize,
      folderId,
      favoriteOnly,
      tagIds,
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      data: notes,
      meta: {
        total,
        page,
        pageSize,
        totalPages,
        query,
      },
    });
  } catch (error) {
    logger.error({ error }, "Error searching notes");
    return createErrorResponse(
      "internal",
      "An error occurred while searching notes",
      500,
      "Internal Server Error"
    );
  }
}

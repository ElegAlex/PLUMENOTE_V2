/**
 * API Routes: /api/notes/recent
 *
 * Story 6.4: Notes Récentes - Get recently viewed and modified notes
 *
 * - GET: Retrieve recently viewed notes (by viewedAt) and recently modified notes (by updatedAt)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createErrorResponse } from "@/lib/api-error";
import { RECENT_NOTES_LIMIT } from "@/features/notes/constants";

/** Maximum allowed limit to prevent excessive data fetching */
const MAX_LIMIT = 20;

/**
 * GET /api/notes/recent
 *
 * Query Parameters:
 * - limit: Number of notes to return per list (default: 5, max: 20)
 *
 * Returns two lists:
 * - recentlyViewed: Last N notes the user has viewed (tracked via UserNoteView)
 * - recentlyModified: Last N notes the user has modified (by updatedAt)
 *
 * Each note includes: id, title, folderId, updatedAt, and viewedAt (for viewed notes)
 *
 * Returns:
 * - 200: Lists of recent notes
 * - 401: Authentication required
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

    const userId = session.user.id;

    // Parse limit from query params (default: RECENT_NOTES_LIMIT, max: MAX_LIMIT)
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10) || RECENT_NOTES_LIMIT), MAX_LIMIT)
      : RECENT_NOTES_LIMIT;

    // Fetch recently viewed notes (by viewedAt) - AC #1
    // Only include non-deleted notes
    const recentlyViewedData = await prisma.userNoteView.findMany({
      where: {
        userId,
        note: {
          deletedAt: null,
        },
      },
      orderBy: {
        viewedAt: "desc",
      },
      take: limit,
      include: {
        note: {
          select: {
            id: true,
            title: true,
            folderId: true,
            updatedAt: true,
          },
        },
      },
    });

    // Fetch recently modified notes (by updatedAt) - AC #1
    // Only include non-deleted notes owned by user
    const recentlyModified = await prisma.note.findMany({
      where: {
        createdById: userId,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        title: true,
        folderId: true,
        updatedAt: true,
      },
    });

    // Transform recentlyViewed to flatten the structure
    // Include viewedAt for display purposes
    const recentlyViewed = recentlyViewedData.map((view) => ({
      id: view.note.id,
      title: view.note.title,
      folderId: view.note.folderId,
      updatedAt: view.note.updatedAt.toISOString(),
      viewedAt: view.viewedAt.toISOString(),
    }));

    return NextResponse.json({
      data: {
        recentlyViewed,
        recentlyModified: recentlyModified.map((note) => ({
          ...note,
          updatedAt: note.updatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    logger.error({ error }, "Error fetching recent notes");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching recent notes",
      500,
      "Internal Server Error"
    );
  }
}

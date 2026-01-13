/**
 * API Route: GET /api/notes/[id]/backlinks
 *
 * Returns all notes that contain internal links TO the specified note.
 * Used by the BacklinksPanel component to display incoming links.
 *
 * @see Story 6.7: Panneau Backlinks
 * @see AC: #1 - Liste des notes qui contiennent un lien vers cette note
 * @see AC: #5 - Chargement < 500ms (index sur targetNoteId)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse, NotFoundError } from "@/lib/api-error";
import { getBacklinks } from "@/lib/note-links";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/notes/[id]/backlinks
 *
 * Returns notes that link TO this note (backlinks).
 * Filters out soft-deleted notes automatically via getBacklinks().
 *
 * @returns { data: Array<{ id: string, title: string, linkTitle: string | null }> }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401,
        "Unauthorized"
      );
    }

    // 2. Get note ID from params
    const { id } = await params;

    // 3. Verify note exists and is not deleted
    const note = await prisma.note.findUnique({
      where: { id },
      select: { id: true, createdById: true, deletedAt: true },
    });

    if (!note || note.deletedAt) {
      throw new NotFoundError("Note introuvable");
    }

    // 4. Get backlinks (already filters deleted notes)
    const backlinks = await getBacklinks(id);

    // 5. Return response
    return NextResponse.json({ data: backlinks });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }

    logger.error({ error }, "Error fetching backlinks");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching backlinks",
      500,
      "Internal Server Error"
    );
  }
}

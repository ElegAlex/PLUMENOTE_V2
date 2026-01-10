/**
 * API Routes: /api/notes
 *
 * - GET: List paginated notes for authenticated user
 * - POST: Create a new note
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse } from "@/lib/api-error";
import { createNote, getUserNotes } from "@/features/notes/services/notes.service";
import {
  createNoteSchema,
  notesQuerySchema,
} from "@/features/notes/schemas/note.schema";

/**
 * GET /api/notes
 *
 * List paginated notes for the authenticated user.
 * Query params: ?page=1&pageSize=20&search=query&favoriteOnly=true&tagIds=id1,id2&sortBy=updatedAt&sortDir=desc
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
    const queryResult = notesQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      favoriteOnly: searchParams.get("favoriteOnly") ?? undefined,
      tagIds: searchParams.get("tagIds") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortDir: searchParams.get("sortDir") ?? undefined,
    });

    if (!queryResult.success) {
      return createErrorResponse(
        "validation",
        queryResult.error.issues[0]?.message ?? "Invalid query parameters",
        400,
        "Validation Error"
      );
    }

    const { page, pageSize, search, favoriteOnly, tagIds, sortBy, sortDir } = queryResult.data;
    const { notes, total } = await getUserNotes(session.user.id, {
      page,
      pageSize,
      search,
      favoriteOnly,
      tagIds,
      sortBy,
      sortDir,
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      data: notes,
      meta: { total, page, pageSize, totalPages, search },
    });
  } catch (error) {
    logger.error({ error }, "Error fetching notes");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching notes",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * POST /api/notes
 *
 * Create a new note for the authenticated user.
 * Body: { title?: string, content?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        "validation",
        "Invalid JSON body",
        400,
        "Validation Error"
      );
    }

    const parseResult = createNoteSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message ?? "Invalid request body",
        400,
        "Validation Error"
      );
    }

    const note = await createNote(session.user.id, parseResult.data);

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return createErrorResponse(
        "validation",
        error.issues[0]?.message ?? "Validation failed",
        400,
        "Validation Error"
      );
    }

    logger.error({ error }, "Error creating note");
    return createErrorResponse(
      "internal",
      "An error occurred while creating the note",
      500,
      "Internal Server Error"
    );
  }
}

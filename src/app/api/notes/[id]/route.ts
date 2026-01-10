/**
 * API Routes: /api/notes/[id]
 *
 * - GET: Get a specific note by ID
 * - PATCH: Update a note
 * - DELETE: Delete a note
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
import {
  getNoteById,
  updateNote,
  deleteNote,
} from "@/features/notes/services/notes.service";
import {
  noteIdSchema,
  updateNoteSchema,
} from "@/features/notes/schemas/note.schema";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/notes/[id]
 *
 * Get a specific note by ID. Returns 404 if not found, 403 if not owner.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const note = await getNoteById(id, session.user.id);
    return NextResponse.json({ data: note });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error fetching note");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching the note",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * PATCH /api/notes/[id]
 *
 * Update a note. At least one field (title or content) must be provided.
 * Returns 404 if not found, 403 if not owner.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const parseResult = updateNoteSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message ?? "Invalid request body";
      return createErrorResponse(
        "validation",
        errorMessage,
        400,
        "Validation Error"
      );
    }

    const note = await updateNote(id, session.user.id, parseResult.data);
    return NextResponse.json({ data: note });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }
    if (error instanceof ZodError) {
      return createErrorResponse(
        "validation",
        error.issues[0]?.message ?? "Validation failed",
        400,
        "Validation Error"
      );
    }

    logger.error({ error }, "Error updating note");
    return createErrorResponse(
      "internal",
      "An error occurred while updating the note",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * DELETE /api/notes/[id]
 *
 * Delete a note. Returns 204 on success, 404 if not found, 403 if not owner.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    await deleteNote(id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error deleting note");
    return createErrorResponse(
      "internal",
      "An error occurred while deleting the note",
      500,
      "Internal Server Error"
    );
  }
}

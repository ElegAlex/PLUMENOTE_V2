/**
 * API Routes: /api/tags/[id]
 *
 * - GET: Get a specific tag by ID
 * - PATCH: Update a tag
 * - DELETE: Delete a tag
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  createErrorResponse,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@/lib/api-error";
import {
  getTagById,
  updateTag,
  deleteTag,
} from "@/features/notes/services/tags.service";
import {
  tagIdSchema,
  updateTagSchema,
} from "@/features/notes/schemas/tag.schema";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/tags/[id]
 *
 * Get a specific tag by ID. Returns 404 if not found, 403 if not owner.
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
    const idResult = tagIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid tag ID format",
        400,
        "Validation Error"
      );
    }

    const tag = await getTagById(id, session.user.id);
    return NextResponse.json({ data: tag });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error fetching tag");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching the tag",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * PATCH /api/tags/[id]
 *
 * Update a tag. At least one field (name or color) must be provided.
 * Returns 404 if not found, 403 if not owner, 409 if name conflicts.
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
    const idResult = tagIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid tag ID format",
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

    const parseResult = updateTagSchema.safeParse(body);
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

    const tag = await updateTag(id, session.user.id, parseResult.data);
    return NextResponse.json({ data: tag });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }
    if (error instanceof ConflictError) {
      return createErrorResponse("conflict", error.message, 409, "Conflict");
    }

    logger.error({ error }, "Error updating tag");
    return createErrorResponse(
      "internal",
      "An error occurred while updating the tag",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * DELETE /api/tags/[id]
 *
 * Delete a tag. Returns 204 on success, 404 if not found, 403 if not owner.
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
    const idResult = tagIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid tag ID format",
        400,
        "Validation Error"
      );
    }

    await deleteTag(id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error deleting tag");
    return createErrorResponse(
      "internal",
      "An error occurred while deleting the tag",
      500,
      "Internal Server Error"
    );
  }
}

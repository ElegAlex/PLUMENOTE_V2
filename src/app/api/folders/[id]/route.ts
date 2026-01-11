/**
 * API Routes: /api/folders/[id]
 *
 * - GET: Get a specific folder by ID
 * - PATCH: Update a folder (name, parentId)
 * - DELETE: Delete a folder (moves contents to parent)
 *
 * @see Story 5.1: Modele Folder et Structure Hierarchique
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
  getFolderById,
  updateFolder,
  deleteFolder,
} from "@/features/notes/services/folders.service";
import {
  folderIdSchema,
  updateFolderSchema,
} from "@/features/notes/schemas/folder.schema";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/folders/[id]
 *
 * Get a specific folder by ID. Returns 404 if not found, 403 if not owner.
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
    const idResult = folderIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid folder ID format",
        400,
        "Validation Error"
      );
    }

    const folder = await getFolderById(id, session.user.id);
    return NextResponse.json({ data: folder });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error fetching folder");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching the folder",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * PATCH /api/folders/[id]
 *
 * Update a folder. Can update name and/or parentId.
 * At least one field must be provided.
 * Moving to own descendant is not allowed (circular reference check).
 * Returns 404 if not found, 403 if not owner, 409 if duplicate name or circular reference.
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
    const idResult = folderIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid folder ID format",
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

    const parseResult = updateFolderSchema.safeParse(body);
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

    const folder = await updateFolder(id, session.user.id, parseResult.data);
    return NextResponse.json({ data: folder });
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

    logger.error({ error }, "Error updating folder");
    return createErrorResponse(
      "internal",
      "An error occurred while updating the folder",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * DELETE /api/folders/[id]
 *
 * Delete a folder. All contents (notes and child folders) are moved
 * to the parent folder (or root if no parent).
 * Returns 204 on success, 404 if not found, 403 if not owner.
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
    const idResult = folderIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid folder ID format",
        400,
        "Validation Error"
      );
    }

    await deleteFolder(id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error deleting folder");
    return createErrorResponse(
      "internal",
      "An error occurred while deleting the folder",
      500,
      "Internal Server Error"
    );
  }
}

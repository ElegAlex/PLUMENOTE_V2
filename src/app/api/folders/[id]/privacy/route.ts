/**
 * API Routes: /api/folders/[id]/privacy
 *
 * - PATCH: Update folder privacy (isPrivate flag)
 *
 * @see Story 8.4: Permissions par Dossier
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
import { setFolderPrivate } from "@/features/notes/services/folder-permissions.service";
import { canManageFolder } from "@/features/workspaces/services/permissions.service";
import {
  folderIdSchema,
  updateFolderPrivacySchema,
} from "@/features/notes/schemas/folder-permission.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/folders/[id]/privacy
 *
 * Update folder privacy (isPrivate flag).
 * Only owner or ADMIN can change privacy.
 * Body: { isPrivate: boolean }
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

    const { id: folderId } = await params;

    // Validate ID format
    const idValidation = folderIdSchema.safeParse({ id: folderId });
    if (!idValidation.success) {
      return createErrorResponse(
        "validation",
        idValidation.error.issues[0]?.message ?? "Invalid folder ID",
        400,
        "Validation Error"
      );
    }

    // Check if user can manage folder (owner or ADMIN)
    const canManage = await canManageFolder(session.user.id, folderId);
    if (!canManage) {
      return createErrorResponse(
        "forbidden",
        "You do not have permission to change privacy of this folder",
        403
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

    const parseResult = updateFolderPrivacySchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message ?? "Invalid request body",
        400,
        "Validation Error"
      );
    }

    const result = await setFolderPrivate(folderId, parseResult.data.isPrivate);

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404);
    }

    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403);
    }

    if (error instanceof ZodError) {
      return createErrorResponse(
        "validation",
        error.issues[0]?.message ?? "Validation failed",
        400,
        "Validation Error"
      );
    }

    logger.error({ error }, "Error updating folder privacy");
    return createErrorResponse(
      "internal",
      "An error occurred while updating folder privacy",
      500,
      "Internal Server Error"
    );
  }
}

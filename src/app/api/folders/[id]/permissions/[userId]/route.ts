/**
 * API Routes: /api/folders/[id]/permissions/[userId]
 *
 * - PATCH: Update a user's permission role on a folder
 * - DELETE: Remove a user's permission from a folder
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
  ConflictError,
} from "@/lib/api-error";
import {
  setFolderPermission,
  removeFolderPermission,
} from "@/features/notes/services/folder-permissions.service";
import { canManageFolder } from "@/features/workspaces/services/permissions.service";
import {
  folderUserIdSchema,
  updateFolderPermissionRoleSchema,
} from "@/features/notes/schemas/folder-permission.schema";

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

/**
 * PATCH /api/folders/[id]/permissions/[userId]
 *
 * Update a user's permission role on a folder.
 * Only owner or ADMIN can update permissions.
 * Body: { role: "ADMIN" | "EDITOR" | "VIEWER" }
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

    const { id: folderId, userId } = await params;

    // Validate ID formats
    const idsValidation = folderUserIdSchema.safeParse({ id: folderId, userId });
    if (!idsValidation.success) {
      return createErrorResponse(
        "validation",
        idsValidation.error.issues[0]?.message ?? "Invalid ID format",
        400,
        "Validation Error"
      );
    }

    // Check if user can manage folder (owner or ADMIN)
    const canManage = await canManageFolder(session.user.id, folderId);
    if (!canManage) {
      return createErrorResponse(
        "forbidden",
        "You do not have permission to manage permissions of this folder",
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

    const parseResult = updateFolderPermissionRoleSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message ?? "Invalid request body",
        400,
        "Validation Error"
      );
    }

    // Use setFolderPermission which handles upsert
    const permission = await setFolderPermission(folderId, {
      userId,
      role: parseResult.data.role,
    });

    return NextResponse.json({ data: permission });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404);
    }

    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403);
    }

    if (error instanceof ConflictError) {
      return createErrorResponse("conflict", error.message, 409);
    }

    if (error instanceof ZodError) {
      return createErrorResponse(
        "validation",
        error.issues[0]?.message ?? "Validation failed",
        400,
        "Validation Error"
      );
    }

    logger.error({ error }, "Error updating folder permission");
    return createErrorResponse(
      "internal",
      "An error occurred while updating the permission",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * DELETE /api/folders/[id]/permissions/[userId]
 *
 * Remove a user's permission from a folder.
 * Only owner or ADMIN can remove permissions.
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

    const { id: folderId, userId } = await params;

    // Validate ID formats
    const idsValidation = folderUserIdSchema.safeParse({ id: folderId, userId });
    if (!idsValidation.success) {
      return createErrorResponse(
        "validation",
        idsValidation.error.issues[0]?.message ?? "Invalid ID format",
        400,
        "Validation Error"
      );
    }

    // Check if user can manage folder (owner or ADMIN)
    const canManage = await canManageFolder(session.user.id, folderId);
    if (!canManage) {
      return createErrorResponse(
        "forbidden",
        "You do not have permission to manage permissions of this folder",
        403
      );
    }

    await removeFolderPermission(folderId, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404);
    }

    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403);
    }

    logger.error({ error }, "Error removing folder permission");
    return createErrorResponse(
      "internal",
      "An error occurred while removing the permission",
      500,
      "Internal Server Error"
    );
  }
}

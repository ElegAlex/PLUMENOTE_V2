/**
 * API Routes: /api/folders/[id]/permissions
 *
 * - GET: List all permissions of a folder
 * - POST: Add/set a permission on a folder
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
  getFolderPermissions,
  setFolderPermission,
} from "@/features/notes/services/folder-permissions.service";
import { canManageFolder } from "@/features/workspaces/services/permissions.service";
import {
  folderIdSchema,
  setFolderPermissionSchema,
} from "@/features/notes/schemas/folder-permission.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/folders/[id]/permissions
 *
 * List all permissions of a folder with user info.
 * Only owner or ADMIN can view the permission list.
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
        "You do not have permission to view permissions of this folder",
        403
      );
    }

    const permissions = await getFolderPermissions(folderId);

    return NextResponse.json({ data: permissions });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404);
    }

    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403);
    }

    logger.error({ error }, "Error fetching folder permissions");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching folder permissions",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * POST /api/folders/[id]/permissions
 *
 * Add or set a permission on a folder.
 * Only owner or ADMIN can manage permissions.
 * Body: { userId: string, role: "ADMIN" | "EDITOR" | "VIEWER" }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const parseResult = setFolderPermissionSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message ?? "Invalid request body",
        400,
        "Validation Error"
      );
    }

    const permission = await setFolderPermission(folderId, parseResult.data);

    return NextResponse.json({ data: permission }, { status: 201 });
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

    logger.error({ error }, "Error setting folder permission");
    return createErrorResponse(
      "internal",
      "An error occurred while setting the permission",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * API Routes: /api/workspaces/[id]/folders
 *
 * - GET: List folders in a workspace (for sharing destination selection)
 *
 * @see Story 8.6: Partage vers Espace Équipe
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse, NotFoundError, ForbiddenError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { canAccessWorkspace, getAccessibleFolderIds } from "@/features/workspaces/services/permissions.service";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/workspaces/[id]/folders
 *
 * List folders in a workspace that the user can access.
 * Filters out private folders the user doesn't have access to.
 * Returns flat list for selection in share dialog.
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

    const { id: workspaceId } = await params;

    // Verify user can access this workspace
    const hasAccess = await canAccessWorkspace(session.user.id, workspaceId);
    if (!hasAccess) {
      return createErrorResponse(
        "forbidden",
        "You do not have access to this workspace",
        403,
        "Forbidden"
      );
    }

    // Get accessible folder IDs (handles private folder filtering)
    const accessibleFolderIds = await getAccessibleFolderIds(session.user.id, workspaceId);

    // Fetch folders with names
    const folders = await prisma.folder.findMany({
      where: {
        workspaceId,
        id: { in: accessibleFolderIds },
      },
      select: {
        id: true,
        name: true,
        parentId: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: folders });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error fetching workspace folders");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching folders",
      500,
      "Internal Server Error"
    );
  }
}

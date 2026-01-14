/**
 * API Routes: /api/workspaces/[id]/move-notes
 *
 * - POST: Move all notes from this workspace to another
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  createErrorResponse,
  NotFoundError,
  ForbiddenError,
} from "@/lib/api-error";
import { moveNotesToWorkspace } from "@/features/workspaces/services/workspaces.service";

/**
 * Schema for move notes request body
 */
const moveNotesSchema = z.object({
  targetWorkspaceId: z.string().cuid("Invalid target workspace ID format"),
});

/**
 * POST /api/workspaces/[id]/move-notes
 *
 * Move all notes from this workspace to the target workspace.
 * Body: { targetWorkspaceId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401
      );
    }

    const { id: sourceWorkspaceId } = await params;

    // Validate workspace ID format
    if (!sourceWorkspaceId || !/^c[a-z0-9]{24}$/i.test(sourceWorkspaceId)) {
      return createErrorResponse(
        "validation",
        "Invalid workspace ID format",
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

    const parseResult = moveNotesSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message ?? "Invalid request body",
        400,
        "Validation Error"
      );
    }

    const { targetWorkspaceId } = parseResult.data;

    // Prevent moving to the same workspace
    if (sourceWorkspaceId === targetWorkspaceId) {
      return createErrorResponse(
        "validation",
        "Source and target workspace cannot be the same",
        400,
        "Validation Error"
      );
    }

    const movedCount = await moveNotesToWorkspace(
      sourceWorkspaceId,
      targetWorkspaceId,
      session.user.id
    );

    return NextResponse.json({
      data: {
        movedCount,
        sourceWorkspaceId,
        targetWorkspaceId,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse(
        "not-found",
        error.message,
        404,
        "Not Found"
      );
    }

    if (error instanceof ForbiddenError) {
      return createErrorResponse(
        "forbidden",
        error.message,
        403,
        "Forbidden"
      );
    }

    logger.error({ error }, "Error moving notes between workspaces");
    return createErrorResponse(
      "internal",
      "An error occurred while moving notes",
      500,
      "Internal Server Error"
    );
  }
}

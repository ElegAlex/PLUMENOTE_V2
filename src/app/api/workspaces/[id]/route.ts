/**
 * API Routes: /api/workspaces/[id]
 *
 * - GET: Get a specific workspace
 * - PATCH: Update a workspace
 * - DELETE: Delete a workspace
 *
 * @see Story 8.1: Modele Workspace et Infrastructure
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
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
} from "@/features/workspaces/services/workspaces.service";
import {
  workspaceIdSchema,
  updateWorkspaceSchema,
} from "@/features/workspaces/schemas/workspace.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id]
 *
 * Get a specific workspace by ID.
 * Only the owner can access their workspace.
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

    // Validate ID format
    const idValidation = workspaceIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return createErrorResponse(
        "validation",
        idValidation.error.issues[0]?.message ?? "Invalid workspace ID",
        400,
        "Validation Error"
      );
    }

    const workspace = await getWorkspaceById(id, session.user.id);

    return NextResponse.json({ data: workspace });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404);
    }

    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403);
    }

    logger.error({ error }, "Error fetching workspace");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching the workspace",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * PATCH /api/workspaces/[id]
 *
 * Update a workspace. Only the owner can update.
 * Body: { name?: string, description?: string, icon?: string }
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

    // Validate ID format
    const idValidation = workspaceIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return createErrorResponse(
        "validation",
        idValidation.error.issues[0]?.message ?? "Invalid workspace ID",
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

    const parseResult = updateWorkspaceSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message ?? "Invalid request body",
        400,
        "Validation Error"
      );
    }

    const workspace = await updateWorkspace(id, session.user.id, parseResult.data as Parameters<typeof updateWorkspace>[2]);

    return NextResponse.json({ data: workspace });
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

    logger.error({ error }, "Error updating workspace");
    return createErrorResponse(
      "internal",
      "An error occurred while updating the workspace",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * DELETE /api/workspaces/[id]
 *
 * Delete a workspace. Only the owner can delete.
 * Workspaces with notes cannot be deleted.
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

    // Validate ID format
    const idValidation = workspaceIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return createErrorResponse(
        "validation",
        idValidation.error.issues[0]?.message ?? "Invalid workspace ID",
        400,
        "Validation Error"
      );
    }

    await deleteWorkspace(id, session.user.id);

    return new NextResponse(null, { status: 204 });
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

    logger.error({ error }, "Error deleting workspace");
    return createErrorResponse(
      "internal",
      "An error occurred while deleting the workspace",
      500,
      "Internal Server Error"
    );
  }
}

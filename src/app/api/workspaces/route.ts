/**
 * API Routes: /api/workspaces
 *
 * - GET: List all workspaces for authenticated user
 * - POST: Create a new workspace
 *
 * @see Story 8.1: Modele Workspace et Infrastructure
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse } from "@/lib/api-error";
import {
  createWorkspace,
  getWorkspacesWithCount,
} from "@/features/workspaces/services/workspaces.service";
import { createWorkspaceSchema } from "@/features/workspaces/schemas/workspace.schema";

/**
 * GET /api/workspaces
 *
 * List all workspaces for the authenticated user with note counts.
 * Returns personal workspaces first, then alphabetically by name.
 *
 * @see Story 8.2: Creation et Gestion des Workspaces
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401
      );
    }

    const workspaces = await getWorkspacesWithCount(session.user.id);

    return NextResponse.json({ data: workspaces });
  } catch (error) {
    logger.error({ error }, "Error fetching workspaces");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching workspaces",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * POST /api/workspaces
 *
 * Create a new workspace.
 * Body: { name: string, description?: string, icon?: string, isPersonal?: boolean }
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

    const parseResult = createWorkspaceSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message ?? "Invalid request body",
        400,
        "Validation Error"
      );
    }

    const workspace = await createWorkspace(session.user.id, parseResult.data);

    return NextResponse.json({ data: workspace }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return createErrorResponse(
        "validation",
        error.issues[0]?.message ?? "Validation failed",
        400,
        "Validation Error"
      );
    }

    logger.error({ error }, "Error creating workspace");
    return createErrorResponse(
      "internal",
      "An error occurred while creating the workspace",
      500,
      "Internal Server Error"
    );
  }
}

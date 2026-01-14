/**
 * API Routes: /api/workspaces/[id]/members
 *
 * - GET: List all members of a workspace
 * - POST: Add a member to a workspace
 *
 * @see Story 8.3: Permissions par Workspace
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
  getMembersByWorkspace,
  addMember,
} from "@/features/workspaces/services/workspace-members.service";
import { canManageWorkspace } from "@/features/workspaces/services/permissions.service";
import { workspaceIdSchema } from "@/features/workspaces/schemas/workspace.schema";
import { addMemberSchema } from "@/features/workspaces/schemas/workspace-member.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id]/members
 *
 * List all members of a workspace with their user info.
 * Only owner or members can view the member list.
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

    // Validate ID format
    const idValidation = workspaceIdSchema.safeParse({ id: workspaceId });
    if (!idValidation.success) {
      return createErrorResponse(
        "validation",
        idValidation.error.issues[0]?.message ?? "Invalid workspace ID",
        400,
        "Validation Error"
      );
    }

    // Check if user can manage workspace (owner or ADMIN)
    const canManage = await canManageWorkspace(session.user.id, workspaceId);
    if (!canManage) {
      return createErrorResponse(
        "forbidden",
        "You do not have permission to view members of this workspace",
        403
      );
    }

    const members = await getMembersByWorkspace(workspaceId);

    return NextResponse.json({ data: members });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404);
    }

    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403);
    }

    logger.error({ error }, "Error fetching workspace members");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching workspace members",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * POST /api/workspaces/[id]/members
 *
 * Add a member to a workspace.
 * Only owner or ADMIN can add members.
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

    const { id: workspaceId } = await params;

    // Validate ID format
    const idValidation = workspaceIdSchema.safeParse({ id: workspaceId });
    if (!idValidation.success) {
      return createErrorResponse(
        "validation",
        idValidation.error.issues[0]?.message ?? "Invalid workspace ID",
        400,
        "Validation Error"
      );
    }

    // Check if user can manage workspace (owner or ADMIN)
    const canManage = await canManageWorkspace(session.user.id, workspaceId);
    if (!canManage) {
      return createErrorResponse(
        "forbidden",
        "You do not have permission to add members to this workspace",
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

    const parseResult = addMemberSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message ?? "Invalid request body",
        400,
        "Validation Error"
      );
    }

    const member = await addMember(workspaceId, parseResult.data);

    return NextResponse.json({ data: member }, { status: 201 });
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

    logger.error({ error }, "Error adding workspace member");
    return createErrorResponse(
      "internal",
      "An error occurred while adding the member",
      500,
      "Internal Server Error"
    );
  }
}

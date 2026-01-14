/**
 * API Routes: /api/workspaces/[id]/members/[memberId]
 *
 * - PATCH: Update a member's role
 * - DELETE: Remove a member from the workspace
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
} from "@/lib/api-error";
import {
  getMemberById,
  updateMemberRole,
  removeMember,
} from "@/features/workspaces/services/workspace-members.service";
import { canManageWorkspace } from "@/features/workspaces/services/permissions.service";
import { workspaceMemberIdSchema, updateMemberRoleSchema } from "@/features/workspaces/schemas/workspace-member.schema";

interface RouteParams {
  params: Promise<{ id: string; memberId: string }>;
}

/**
 * PATCH /api/workspaces/[id]/members/[memberId]
 *
 * Update a member's role.
 * Only owner or ADMIN can update member roles.
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

    const { id: workspaceId, memberId } = await params;

    // Validate ID formats
    const idValidation = workspaceMemberIdSchema.safeParse({ id: workspaceId, memberId });
    if (!idValidation.success) {
      return createErrorResponse(
        "validation",
        idValidation.error.issues[0]?.message ?? "Invalid ID format",
        400,
        "Validation Error"
      );
    }

    // Check if user can manage workspace (owner or ADMIN)
    const canManage = await canManageWorkspace(session.user.id, workspaceId);
    if (!canManage) {
      return createErrorResponse(
        "forbidden",
        "You do not have permission to update members in this workspace",
        403
      );
    }

    // Verify the member belongs to this workspace
    const existingMember = await getMemberById(memberId);
    if (existingMember.workspaceId !== workspaceId) {
      return createErrorResponse(
        "not-found",
        "Member not found in this workspace",
        404
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

    const parseResult = updateMemberRoleSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message ?? "Invalid request body",
        400,
        "Validation Error"
      );
    }

    const member = await updateMemberRole(memberId, parseResult.data.role);

    return NextResponse.json({ data: member });
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

    logger.error({ error }, "Error updating member role");
    return createErrorResponse(
      "internal",
      "An error occurred while updating the member role",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * DELETE /api/workspaces/[id]/members/[memberId]
 *
 * Remove a member from the workspace.
 * Only owner or ADMIN can remove members.
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

    const { id: workspaceId, memberId } = await params;

    // Validate ID formats
    const idValidation = workspaceMemberIdSchema.safeParse({ id: workspaceId, memberId });
    if (!idValidation.success) {
      return createErrorResponse(
        "validation",
        idValidation.error.issues[0]?.message ?? "Invalid ID format",
        400,
        "Validation Error"
      );
    }

    // Check if user can manage workspace (owner or ADMIN)
    const canManage = await canManageWorkspace(session.user.id, workspaceId);
    if (!canManage) {
      return createErrorResponse(
        "forbidden",
        "You do not have permission to remove members from this workspace",
        403
      );
    }

    // Verify the member belongs to this workspace
    const existingMember = await getMemberById(memberId);
    if (existingMember.workspaceId !== workspaceId) {
      return createErrorResponse(
        "not-found",
        "Member not found in this workspace",
        404
      );
    }

    // Prevent self-removal to avoid lock-out (Story 8.3)
    if (existingMember.userId === session.user.id) {
      return createErrorResponse(
        "forbidden",
        "You cannot remove yourself from the workspace",
        403
      );
    }

    await removeMember(memberId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404);
    }

    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403);
    }

    logger.error({ error }, "Error removing workspace member");
    return createErrorResponse(
      "internal",
      "An error occurred while removing the member",
      500,
      "Internal Server Error"
    );
  }
}

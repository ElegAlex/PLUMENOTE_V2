/**
 * API Routes: /api/workspaces/writable
 *
 * - GET: List workspaces where user can create/edit notes (for sharing)
 *
 * @see Story 8.6: Partage vers Espace Équipe
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse } from "@/lib/api-error";
import { getWritableWorkspaces } from "@/features/workspaces/services/permissions.service";

/**
 * GET /api/workspaces/writable
 *
 * List workspaces where user can create/edit notes.
 * Excludes personal workspaces.
 * Returns workspaces where user is owner, ADMIN, or EDITOR.
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

    const workspaces = await getWritableWorkspaces(session.user.id);

    return NextResponse.json({ data: workspaces });
  } catch (error) {
    logger.error({ error }, "Error fetching writable workspaces");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching workspaces",
      500,
      "Internal Server Error"
    );
  }
}

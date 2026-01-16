/**
 * API Route: /api/admin/stats
 *
 * GET: Retrieve admin dashboard statistics
 * Requires ADMIN role.
 *
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse } from "@/lib/api-error";
import { getAdminStats } from "@/features/analytics/services/admin-stats.service";

/**
 * GET /api/admin/stats
 *
 * Retrieve aggregated statistics for the admin dashboard.
 *
 * Query params:
 * - workspaceId (optional): Filter statistics by workspace
 *
 * @returns {data: AdminStats} - Complete statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401
      );
    }

    // Authorization check - ADMIN role required
    if (session.user.role !== "ADMIN") {
      return createErrorResponse(
        "forbidden",
        "Admin access required to view statistics",
        403
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const workspaceIdParam = searchParams.get("workspaceId");

    // Validate workspaceId format if provided (CUID format)
    let workspaceId: string | undefined;
    if (workspaceIdParam) {
      if (!/^c[a-z0-9]{24}$/i.test(workspaceIdParam)) {
        return createErrorResponse(
          "validation",
          "Invalid workspace ID format",
          400,
          "Validation Error"
        );
      }
      workspaceId = workspaceIdParam;
    }

    // Fetch statistics
    const stats = await getAdminStats(workspaceId);

    return NextResponse.json({ data: stats });
  } catch (error) {
    logger.error({ error }, "Error fetching admin statistics");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching statistics",
      500,
      "Internal Server Error"
    );
  }
}

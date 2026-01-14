/**
 * API Routes: /api/users/search
 *
 * - GET: Search users by name or email
 *
 * @see Story 8.3: Permissions par Workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users/search?q=xxx
 *
 * Search users by name or email.
 * Returns up to 10 matching users.
 * Only active users are returned.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse(
        "unauthorized",
        "Authentication required",
        401
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    if (query.length < 2) {
      return NextResponse.json({ data: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
      take: 10,
      orderBy: { name: "asc" },
    });

    logger.info(
      { userId: session.user.id, query, resultCount: users.length },
      "User search performed"
    );

    return NextResponse.json({ data: users });
  } catch (error) {
    logger.error({ error }, "Error searching users");
    return createErrorResponse(
      "internal",
      "An error occurred while searching users",
      500,
      "Internal Server Error"
    );
  }
}

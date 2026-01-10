/**
 * API Routes: /api/tags
 *
 * - GET: List all tags for authenticated user
 * - POST: Create a new tag
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse, ConflictError } from "@/lib/api-error";
import { createTag, getUserTags } from "@/features/notes/services/tags.service";
import { createTagSchema } from "@/features/notes/schemas/tag.schema";

/**
 * GET /api/tags
 *
 * List all tags for the authenticated user.
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

    const tags = await getUserTags(session.user.id);

    return NextResponse.json({ data: tags });
  } catch (error) {
    logger.error({ error }, "Error fetching tags");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching tags",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * POST /api/tags
 *
 * Create a new tag for the authenticated user.
 * Body: { name: string, color?: string }
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

    const parseResult = createTagSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message ?? "Invalid request body",
        400,
        "Validation Error"
      );
    }

    const tag = await createTag(session.user.id, parseResult.data);

    return NextResponse.json({ data: tag }, { status: 201 });
  } catch (error) {
    if (error instanceof ConflictError) {
      return createErrorResponse("conflict", error.message, 409, "Conflict");
    }

    logger.error({ error }, "Error creating tag");
    return createErrorResponse(
      "internal",
      "An error occurred while creating the tag",
      500,
      "Internal Server Error"
    );
  }
}

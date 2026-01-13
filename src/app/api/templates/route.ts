/**
 * API Routes: /api/templates
 *
 * - GET: List all templates for authenticated user
 * - POST: Create a new template (admin only)
 *
 * @see Story 7.1: Modele Template et Infrastructure
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createErrorResponse, ForbiddenError } from "@/lib/api-error";
import { createTemplate, getAllTemplates } from "@/features/templates/services/templates.service";
import { createTemplateSchema } from "@/features/templates/schemas/template.schema";

/**
 * GET /api/templates
 *
 * List all templates for the authenticated user.
 * Returns system templates first, then alphabetically by name.
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

    const templates = await getAllTemplates();

    return NextResponse.json({ data: templates });
  } catch (error) {
    logger.error({ error }, "Error fetching templates");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching templates",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * POST /api/templates
 *
 * Create a new template. Only admins can create templates.
 * Body: { name: string, content: string, description?: string, icon?: string, isSystem?: boolean }
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

    const parseResult = createTemplateSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse(
        "validation",
        parseResult.error.issues[0]?.message ?? "Invalid request body",
        400,
        "Validation Error"
      );
    }

    const template = await createTemplate(
      session.user.id,
      session.user.role ?? "VIEWER",
      parseResult.data
    );

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return createErrorResponse(
        "forbidden",
        error.message,
        403
      );
    }

    if (error instanceof ZodError) {
      return createErrorResponse(
        "validation",
        error.issues[0]?.message ?? "Validation failed",
        400,
        "Validation Error"
      );
    }

    logger.error({ error }, "Error creating template");
    return createErrorResponse(
      "internal",
      "An error occurred while creating the template",
      500,
      "Internal Server Error"
    );
  }
}

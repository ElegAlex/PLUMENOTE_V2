/**
 * API Routes: /api/templates/[id]
 *
 * - GET: Get a specific template by ID
 * - PATCH: Update a template (admin or creator)
 * - DELETE: Delete a template (admin or creator, not system templates)
 *
 * @see Story 7.1: Modele Template et Infrastructure
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
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from "@/features/templates/services/templates.service";
import {
  templateIdSchema,
  updateTemplateSchema,
} from "@/features/templates/schemas/template.schema";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/templates/[id]
 *
 * Get a specific template by ID.
 * All authenticated users can access any template.
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
    const idResult = templateIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid template ID format",
        400,
        "Validation Error"
      );
    }

    const template = await getTemplateById(id);
    return NextResponse.json({ data: template });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }

    logger.error({ error }, "Error fetching template");
    return createErrorResponse(
      "internal",
      "An error occurred while fetching the template",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * PATCH /api/templates/[id]
 *
 * Update a template.
 * - Admin can update any template
 * - Creator can update their own templates (except system templates)
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
    const idResult = templateIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid template ID format",
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

    const parseResult = updateTemplateSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message ?? "Invalid request body";
      return createErrorResponse(
        "validation",
        errorMessage,
        400,
        "Validation Error"
      );
    }

    const template = await updateTemplate(
      id,
      session.user.id,
      session.user.role ?? "VIEWER",
      parseResult.data
    );
    return NextResponse.json({ data: template });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }
    if (error instanceof ZodError) {
      return createErrorResponse(
        "validation",
        error.issues[0]?.message ?? "Validation failed",
        400,
        "Validation Error"
      );
    }

    logger.error({ error }, "Error updating template");
    return createErrorResponse(
      "internal",
      "An error occurred while updating the template",
      500,
      "Internal Server Error"
    );
  }
}

/**
 * DELETE /api/templates/[id]
 *
 * Delete a template. Returns 204 on success.
 * - System templates cannot be deleted
 * - Admin can delete any non-system template
 * - Creator can delete their own non-system templates
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
    const idResult = templateIdSchema.safeParse({ id });
    if (!idResult.success) {
      return createErrorResponse(
        "validation",
        "Invalid template ID format",
        400,
        "Validation Error"
      );
    }

    await deleteTemplate(id, session.user.id, session.user.role ?? "VIEWER");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return createErrorResponse("not-found", error.message, 404, "Not Found");
    }
    if (error instanceof ForbiddenError) {
      return createErrorResponse("forbidden", error.message, 403, "Forbidden");
    }

    logger.error({ error }, "Error deleting template");
    return createErrorResponse(
      "internal",
      "An error occurred while deleting the template",
      500,
      "Internal Server Error"
    );
  }
}

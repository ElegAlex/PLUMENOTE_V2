// RFC 7807 Problem Details for HTTP APIs

import { NextResponse } from "next/server";

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export function createApiError(
  status: number,
  title: string,
  detail?: string
): ApiError {
  return {
    type: `https://plumenote.app/errors/${status}`,
    title,
    status,
    detail,
  };
}

// Common HTTP error creators
export const notFound = (detail?: string) =>
  createApiError(404, "Not Found", detail);

export const badRequest = (detail?: string) =>
  createApiError(400, "Bad Request", detail);

export const unauthorized = (detail?: string) =>
  createApiError(401, "Unauthorized", detail);

export const forbidden = (detail?: string) =>
  createApiError(403, "Forbidden", detail);

export const internalError = (detail?: string) =>
  createApiError(500, "Internal Server Error", detail);

/**
 * Create a NextResponse with RFC 7807 error format
 */
export function createErrorResponse(
  type: string,
  detail: string,
  status: number,
  title?: string
): NextResponse {
  return NextResponse.json(
    {
      type: `https://plumenote.app/errors/${type}`,
      title:
        title ??
        type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " "),
      status,
      detail,
    },
    { status }
  );
}

/**
 * Custom error class for "not found" errors
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Custom error class for "forbidden" errors
 */
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Custom error class for conflict errors (409)
 */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

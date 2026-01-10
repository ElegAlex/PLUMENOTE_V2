// RFC 7807 Problem Details for HTTP APIs

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

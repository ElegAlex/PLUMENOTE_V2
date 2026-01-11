/**
 * PlumeNote Hocuspocus Server Types
 *
 * Type definitions for the WebSocket collaboration server.
 */

/**
 * Authenticated user context attached to connections
 */
export interface AuthenticatedUser {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Connection context stored per WebSocket connection
 */
export interface ConnectionContext {
  user: AuthenticatedUser;
  documentId: string;
  connectedAt: Date;
}

/**
 * JWT payload structure from Auth.js session token
 */
export interface JWTPayload {
  sub: string; // User ID
  name?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

/**
 * Document name format: "note-{noteId}"
 */
export const DOCUMENT_PREFIX = "note-";

/**
 * Extract note ID from document name
 */
export function extractNoteId(documentName: string): string | null {
  if (!documentName.startsWith(DOCUMENT_PREFIX)) {
    return null;
  }
  return documentName.slice(DOCUMENT_PREFIX.length);
}

/**
 * Create document name from note ID
 */
export function createDocumentName(noteId: string): string {
  return `${DOCUMENT_PREFIX}${noteId}`;
}

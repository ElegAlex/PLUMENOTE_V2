/**
 * Comments Feature - Server Exports
 *
 * Public API for the comments feature (server-side only).
 * Exports services and types for use in API routes and server actions.
 *
 * @see Story 9.4: Modèle Comment et Infrastructure
 */

// Re-export everything from client index
export * from "./index";

// Server-only: Service functions
export {
  createComment,
  getCommentsByNoteId,
  getCommentById,
  updateComment,
  deleteComment,
} from "./services/comments.service";

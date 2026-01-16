/**
 * Comments Feature - Client Exports
 *
 * Public API for the comments feature (client-side).
 * Exports types, schemas, and utilities for use in React components.
 *
 * @see Story 9.4: Modèle Comment et Infrastructure
 */

// Types
export type {
  Comment,
  CommentAuthor,
  CommentWithReplies,
  CreateCommentInput,
  UpdateCommentInput,
  CommentsQueryOptions,
  PaginationMeta,
  CommentsListResponse,
  CommentResponse,
  CommentsListResult,
} from "./types";

// Schemas
export {
  createCommentSchema,
  updateCommentSchema,
  commentIdSchema,
  commentsQuerySchema,
} from "./schemas/comment.schema";

export type {
  CreateCommentSchemaInput,
  UpdateCommentSchemaInput,
  CommentIdSchemaInput,
  CommentsQuerySchemaInput,
} from "./schemas/comment.schema";

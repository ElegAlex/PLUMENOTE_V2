/**
 * Comment Types
 *
 * Type definitions for the comments feature (Story 9.4).
 * Supports margin comments with document anchoring for Stories 9.5 and 9.6.
 *
 * @see Story 9.4: Modèle Comment et Infrastructure
 */

import type { Comment as PrismaComment } from "@prisma/client";

/**
 * Comment author information (minimal for display)
 */
export interface CommentAuthor {
  id: string;
  name: string | null;
  avatar: string | null;
}

/**
 * Comment type with author information
 *
 * Picks fields from Prisma Comment and adds nested author details.
 * Used for API responses and component props.
 */
export type Comment = Pick<
  PrismaComment,
  | "id"
  | "content"
  | "anchorStart"
  | "anchorEnd"
  | "resolved"
  | "noteId"
  | "parentId"
  | "createdAt"
  | "updatedAt"
  | "createdById"
> & {
  createdBy?: CommentAuthor;
};

/**
 * Comment with nested replies
 *
 * Used for displaying threaded comment discussions.
 * Note: Prisma doesn't support recursive queries, so replies are fetched flat
 * and nested client-side or with fixed depth.
 */
export interface CommentWithReplies extends Comment {
  replies: Comment[];
}

/**
 * Input for creating a new comment
 *
 * - content: Comment text (1-5000 characters)
 * - anchorStart: Start position in document (ProseMirror position)
 * - anchorEnd: End position in document (ProseMirror position)
 * - parentId: Optional parent comment ID for replies
 */
export interface CreateCommentInput {
  content: string;
  anchorStart: number;
  anchorEnd: number;
  parentId?: string | null;
}

/**
 * Input for updating an existing comment
 *
 * - content: New comment text (only author can update)
 * - resolved: Mark thread as resolved (any editor can update)
 */
export interface UpdateCommentInput {
  content?: string;
  resolved?: boolean;
}

/**
 * Query options for listing comments
 *
 * @property page - Page number (1-indexed, default: 1)
 * @property pageSize - Number of items per page (default: 50)
 * @property resolved - Filter by resolution status (undefined = all)
 * @property sortBy - Sort field: "anchorStart" for document position, "createdAt" for chronological
 * @property sortDir - Sort direction: "asc" or "desc"
 */
export interface CommentsQueryOptions {
  page?: number;
  pageSize?: number;
  resolved?: boolean;
  sortBy?: "anchorStart" | "createdAt";
  sortDir?: "asc" | "desc";
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * API response for listing comments with pagination
 */
export interface CommentsListResponse {
  data: Comment[];
  meta: PaginationMeta;
}

/**
 * API response for a single comment
 */
export interface CommentResponse {
  data: Comment;
}

/**
 * Service result for listing comments (internal use)
 */
export interface CommentsListResult {
  comments: Comment[];
  total: number;
}

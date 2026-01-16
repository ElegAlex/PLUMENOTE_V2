/**
 * Comments Feature Module
 *
 * Exports all components, hooks, and types for the comments system.
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see Story 9.6: Réponses et Résolution de Commentaires
 */

// Types
export type { Comment, CreateCommentInput, UpdateCommentInput } from "./types";

// Hooks
export { useComments } from "./hooks/useComments";
export { useCreateComment } from "./hooks/useCreateComment";
export { useUpdateComment } from "./hooks/useUpdateComment";
export { useDeleteComment } from "./hooks/useDeleteComment";
export { useReplyComment } from "./hooks/useReplyComment";
export type { UseReplyCommentOptions, ReplyToCommentInput } from "./hooks/useReplyComment";
export { useResolveComment } from "./hooks/useResolveComment";
export type { UseResolveCommentOptions } from "./hooks/useResolveComment";

// Components
export { CommentItem } from "./components/CommentItem";
export type { CommentItemProps } from "./components/CommentItem";

export { CommentForm } from "./components/CommentForm";
export type { CommentFormProps } from "./components/CommentForm";

export { CommentThread } from "./components/CommentThread";
export type { CommentThreadProps } from "./components/CommentThread";

export { ReplyForm } from "./components/ReplyForm";
export type { ReplyFormProps } from "./components/ReplyForm";

export { CommentsList } from "./components/CommentsList";
export type { CommentsListProps } from "./components/CommentsList";

export { CommentsSidebar } from "./components/CommentsSidebar";
export type {
  CommentsSidebarProps,
  CommentSelection,
} from "./components/CommentsSidebar";

// Extensions
export { CommentMark } from "./extensions/CommentMark";
export type { CommentMarkOptions } from "./extensions/CommentMark";

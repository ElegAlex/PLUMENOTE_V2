"use client";

/**
 * CommentsList Component
 *
 * Displays a list of comments as threaded conversations.
 * Groups replies under parent comments and supports reply/resolve actions.
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see Story 9.6: Réponses et Résolution de Commentaires
 * @see AC: #5 - Liste des commentaires triés par position
 * @see AC 9.6 #3 - Réponses indentées
 * @see AC 9.6 #8 - Réponses triées chronologiquement
 */

import { useEffect, useRef, useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CommentThread } from "./CommentThread";
import { ReplyForm } from "./ReplyForm";
import type { Comment } from "../types";

/**
 * Group comments into threads (parent with replies)
 */
interface CommentWithReplies extends Comment {
  replies: Comment[];
}

export interface CommentsListProps {
  /** List of comments to display */
  comments: Comment[];
  /** ID of the currently logged-in user */
  currentUserId?: string;
  /** ID of the selected/highlighted comment */
  selectedCommentId?: string | null;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether the user can resolve comments (editor or author) */
  canResolve?: boolean;
  /** ID of the comment currently being replied to */
  activeReplyId?: string | null;
  /** Whether a reply is being submitted */
  isReplying?: boolean;
  /** Callback when a comment is selected */
  onCommentSelect?: (commentId: string) => void;
  /** Callback when a comment is edited */
  onEdit?: (commentId: string, newContent: string) => void;
  /** Callback when a comment is deleted */
  onDelete?: (commentId: string) => void;
  /** Callback when reply button is clicked */
  onReply?: (parentCommentId: string) => void;
  /** Callback when a reply is submitted */
  onReplySubmit?: (parentComment: Comment, content: string) => void;
  /** Callback when reply is cancelled */
  onReplyCancel?: () => void;
  /** Callback when resolve is clicked */
  onResolve?: (commentId: string) => void;
  /** Callback when unresolve is clicked */
  onUnresolve?: (commentId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading skeleton for comments list
 */
function CommentsListSkeleton() {
  return (
    <div className="space-y-3" aria-label="Chargement des commentaires">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state for comments list
 */
function CommentsListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-sm font-medium text-muted-foreground">
        Aucun commentaire
      </h3>
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
        Sélectionnez du texte dans la note pour ajouter un commentaire.
      </p>
    </div>
  );
}

/**
 * Group comments into threads (parent with replies)
 */
function groupCommentsIntoThreads(comments: Comment[]): CommentWithReplies[] {
  const rootComments = comments.filter((c) => c.parentId === null);
  const repliesMap = new Map<string, Comment[]>();

  // Group replies by parentId
  comments.forEach((comment) => {
    if (comment.parentId) {
      const replies = repliesMap.get(comment.parentId) ?? [];
      replies.push(comment);
      repliesMap.set(comment.parentId, replies);
    }
  });

  // Attach replies to roots, sorted by createdAt
  return rootComments
    .map((root) => ({
      ...root,
      replies: (repliesMap.get(root.id) ?? []).sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    }))
    .sort((a, b) => a.anchorStart - b.anchorStart);
}

/**
 * List of comments displayed as threaded conversations
 *
 * @example
 * ```tsx
 * <CommentsList
 *   comments={comments}
 *   currentUserId={session?.user?.id}
 *   selectedCommentId={selectedId}
 *   isLoading={isLoading}
 *   canResolve={canEdit}
 *   activeReplyId={activeReplyId}
 *   onCommentSelect={(id) => setSelectedId(id)}
 *   onEdit={(id, content) => updateComment({ id, content })}
 *   onDelete={(id) => deleteComment(id)}
 *   onReply={(id) => setActiveReplyId(id)}
 *   onReplySubmit={(parent, content) => replyToComment({ parentComment: parent, content })}
 *   onReplyCancel={() => setActiveReplyId(null)}
 *   onResolve={(id) => resolveComment(id)}
 *   onUnresolve={(id) => unresolveComment(id)}
 * />
 * ```
 */
export function CommentsList({
  comments,
  currentUserId,
  selectedCommentId,
  isLoading = false,
  canResolve = false,
  activeReplyId,
  isReplying = false,
  onCommentSelect,
  onEdit,
  onDelete,
  onReply,
  onReplySubmit,
  onReplyCancel,
  onResolve,
  onUnresolve,
  className,
}: CommentsListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const commentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Group comments into threads
  const threads = useMemo(
    () => groupCommentsIntoThreads(comments),
    [comments]
  );

  // Scroll to selected comment when it changes
  useEffect(() => {
    if (selectedCommentId && commentRefs.current.has(selectedCommentId)) {
      const element = commentRefs.current.get(selectedCommentId);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedCommentId]);

  // Register comment ref
  const setCommentRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      commentRefs.current.set(id, el);
    } else {
      commentRefs.current.delete(id);
    }
  };

  if (isLoading) {
    return <CommentsListSkeleton />;
  }

  if (comments.length === 0) {
    return <CommentsListEmpty />;
  }

  return (
    <div
      ref={listRef}
      className={cn("space-y-4", className)}
      role="list"
      aria-label="Liste des commentaires"
    >
      {threads.map((thread) => (
        <div
          key={thread.id}
          ref={setCommentRef(thread.id)}
          role="listitem"
        >
          <CommentThread
            parentComment={thread}
            replies={thread.replies}
            currentUserId={currentUserId}
            selectedCommentId={selectedCommentId}
            canResolve={canResolve || currentUserId === thread.createdById}
            onReply={onReply}
            onSelect={onCommentSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onResolve={onResolve}
            onUnresolve={onUnresolve}
          />

          {/* Reply Form - shown when this thread is active for reply */}
          {activeReplyId === thread.id && (
            <div className="ml-4 pl-4 mt-2 border-l-2 border-muted">
              <ReplyForm
                parentComment={thread}
                onSubmit={(content) => onReplySubmit?.(thread, content)}
                onCancel={() => onReplyCancel?.()}
                isSubmitting={isReplying}
                autoFocus
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

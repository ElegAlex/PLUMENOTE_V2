"use client";

/**
 * CommentThread Component
 *
 * Displays a parent comment with its replies in a threaded view.
 * Replies are indented with a vertical line indicator.
 *
 * @see Story 9.6: Réponses et Résolution de Commentaires
 * @see AC: #3 - Réponses indentées avec ligne verticale
 * @see AC: #8 - Réponses triées chronologiquement (createdAt asc)
 */

import { useState, useMemo } from "react";
import { Reply, CheckCircle, Undo2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CommentItem } from "./CommentItem";
import type { Comment } from "../types";

/** Threshold for collapsing replies */
const COLLAPSE_THRESHOLD = 3;

export interface CommentThreadProps {
  /** Parent comment of the thread */
  parentComment: Comment;
  /** Replies to the parent comment */
  replies: Comment[];
  /** ID of the currently logged-in user */
  currentUserId?: string;
  /** ID of the selected/highlighted comment */
  selectedCommentId?: string | null;
  /** Whether the user can resolve this thread */
  canResolve?: boolean;
  /** Callback when reply button is clicked */
  onReply?: (parentCommentId: string) => void;
  /** Callback when a comment is selected */
  onSelect?: (commentId: string) => void;
  /** Callback when a comment is edited */
  onEdit?: (commentId: string, newContent: string) => void;
  /** Callback when a comment is deleted */
  onDelete?: (commentId: string) => void;
  /** Callback when resolve is clicked */
  onResolve?: (commentId: string) => void;
  /** Callback when unresolve is clicked */
  onUnresolve?: (commentId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Comment thread with parent and indented replies
 *
 * @example
 * ```tsx
 * <CommentThread
 *   parentComment={comment}
 *   replies={comment.replies}
 *   currentUserId={session?.user?.id}
 *   selectedCommentId={selectedId}
 *   canResolve={canEdit}
 *   onReply={(id) => setActiveReplyId(id)}
 *   onSelect={(id) => setSelectedId(id)}
 *   onEdit={(id, content) => updateComment({ id, content })}
 *   onDelete={(id) => deleteComment(id)}
 *   onResolve={(id) => resolveComment(id)}
 *   onUnresolve={(id) => unresolveComment(id)}
 * />
 * ```
 */
export function CommentThread({
  parentComment,
  replies,
  currentUserId,
  selectedCommentId,
  canResolve = false,
  onReply,
  onSelect,
  onEdit,
  onDelete,
  onResolve,
  onUnresolve,
  className,
}: CommentThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort replies chronologically (oldest first)
  const sortedReplies = useMemo(() => {
    return [...replies].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [replies]);

  // Determine visible replies based on collapse state
  const visibleReplies = useMemo(() => {
    if (sortedReplies.length <= COLLAPSE_THRESHOLD || isExpanded) {
      return sortedReplies;
    }
    // Show first and last reply when collapsed
    return [sortedReplies[0], sortedReplies[sortedReplies.length - 1]];
  }, [sortedReplies, isExpanded]);

  const hiddenCount = sortedReplies.length - 2;
  const shouldShowExpand =
    sortedReplies.length > COLLAPSE_THRESHOLD && !isExpanded;
  const shouldShowCollapse =
    sortedReplies.length > COLLAPSE_THRESHOLD && isExpanded;

  const handleReplyClick = () => {
    onReply?.(parentComment.id);
  };

  const handleResolveClick = () => {
    if (parentComment.resolved) {
      onUnresolve?.(parentComment.id);
    } else {
      onResolve?.(parentComment.id);
    }
  };

  const isAuthor = currentUserId === parentComment.createdById;

  return (
    <article
      className={cn(
        "comment-thread",
        parentComment.resolved && "comment-resolved opacity-60",
        className
      )}
      aria-label={`Fil de discussion de ${parentComment.createdBy?.name ?? "Utilisateur inconnu"}`}
    >
      {/* Parent Comment */}
      <div className="relative">
        <CommentItem
          comment={parentComment}
          isAuthor={isAuthor}
          isSelected={selectedCommentId === parentComment.id}
          onSelect={() => onSelect?.(parentComment.id)}
          onEdit={onEdit}
          onDelete={onDelete}
        />

        {/* Thread Actions */}
        <div className="flex items-center gap-1 mt-1 ml-11">
          {onReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleReplyClick}
              aria-label={`Répondre au commentaire de ${parentComment.createdBy?.name ?? "Utilisateur inconnu"}`}
            >
              <Reply className="h-3.5 w-3.5 mr-1" />
              Répondre
            </Button>
          )}

          {canResolve && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-xs",
                parentComment.resolved
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground hover:text-green-600"
              )}
              onClick={handleResolveClick}
              aria-label={
                parentComment.resolved
                  ? "Rouvrir ce fil de discussion"
                  : "Résoudre ce fil de discussion"
              }
            >
              {parentComment.resolved ? (
                <Undo2 className="h-3.5 w-3.5 mr-1" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
              )}
              {parentComment.resolved ? "Rouvrir" : "Résoudre"}
            </Button>
          )}
        </div>
      </div>

      {/* Replies */}
      {sortedReplies.length > 0 && (
        <div
          className={cn(
            "comment-replies",
            "ml-4 pl-4 mt-2",
            "border-l-2 border-muted"
          )}
        >
          {/* First reply (always visible when collapsed) */}
          {shouldShowExpand && visibleReplies[0] && visibleReplies[1] && (
            <>
              <CommentItem
                comment={visibleReplies[0]}
                isAuthor={currentUserId === visibleReplies[0].createdById}
                isSelected={selectedCommentId === visibleReplies[0].id}
                canResolve={canResolve}
                onSelect={() => onSelect?.(visibleReplies[0].id)}
                onEdit={onEdit}
                onDelete={onDelete}
                onResolve={onResolve}
                onUnresolve={onUnresolve}
              />

              {/* Expand button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground my-1"
                onClick={() => setIsExpanded(true)}
              >
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                Voir {hiddenCount} réponses de plus
              </Button>

              {/* Last reply (always visible when collapsed) */}
              <CommentItem
                comment={visibleReplies[1]}
                isAuthor={currentUserId === visibleReplies[1].createdById}
                isSelected={selectedCommentId === visibleReplies[1].id}
                canResolve={canResolve}
                onSelect={() => onSelect?.(visibleReplies[1].id)}
                onEdit={onEdit}
                onDelete={onDelete}
                onResolve={onResolve}
                onUnresolve={onUnresolve}
              />
            </>
          )}

          {/* All replies (when expanded or <= threshold) */}
          {!shouldShowExpand &&
            visibleReplies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                isAuthor={currentUserId === reply.createdById}
                isSelected={selectedCommentId === reply.id}
                canResolve={canResolve}
                onSelect={() => onSelect?.(reply.id)}
                onEdit={onEdit}
                onDelete={onDelete}
                onResolve={onResolve}
                onUnresolve={onUnresolve}
              />
            ))}

          {/* Collapse button */}
          {shouldShowCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground mt-1"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronUp className="h-3.5 w-3.5 mr-1" />
              Masquer les réponses
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

"use client";

/**
 * CommentsList Component
 *
 * Displays a list of comments sorted by document position.
 * Supports scrolling to specific comments and selection highlighting.
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #5 - Liste des commentaires triés par position
 */

import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CommentItem } from "./CommentItem";
import type { Comment } from "../types";

export interface CommentsListProps {
  /** List of comments to display */
  comments: Comment[];
  /** ID of the currently logged-in user */
  currentUserId?: string;
  /** ID of the selected/highlighted comment */
  selectedCommentId?: string | null;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when a comment is selected */
  onCommentSelect?: (commentId: string) => void;
  /** Callback when a comment is edited */
  onEdit?: (commentId: string, newContent: string) => void;
  /** Callback when a comment is deleted */
  onDelete?: (commentId: string) => void;
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
 * List of comments sorted by document position
 *
 * @example
 * ```tsx
 * <CommentsList
 *   comments={comments}
 *   currentUserId={session?.user?.id}
 *   selectedCommentId={selectedId}
 *   isLoading={isLoading}
 *   onCommentSelect={(id) => {
 *     setSelectedId(id);
 *     // Scroll to highlight in editor
 *   }}
 *   onEdit={(id, content) => updateComment({ commentId: id, input: { content } })}
 *   onDelete={(id) => deleteComment(id)}
 * />
 * ```
 */
export function CommentsList({
  comments,
  currentUserId,
  selectedCommentId,
  isLoading = false,
  onCommentSelect,
  onEdit,
  onDelete,
  className,
}: CommentsListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const commentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  // Sort comments by anchorStart position
  const sortedComments = [...comments].sort((a, b) => a.anchorStart - b.anchorStart);

  return (
    <div
      ref={listRef}
      className={cn("space-y-1", className)}
      role="list"
      aria-label="Liste des commentaires"
    >
      {sortedComments.map((comment) => (
        <div
          key={comment.id}
          ref={setCommentRef(comment.id)}
          role="listitem"
        >
          <CommentItem
            comment={comment}
            isAuthor={currentUserId === comment.createdById}
            isSelected={selectedCommentId === comment.id}
            onSelect={() => onCommentSelect?.(comment.id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}

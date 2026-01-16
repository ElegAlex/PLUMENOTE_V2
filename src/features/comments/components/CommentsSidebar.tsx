"use client";

/**
 * CommentsSidebar Component
 *
 * Side panel for managing comments on a note.
 * Combines CommentForm and CommentsList.
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #1 - Panneau latéral pour les commentaires
 * @see AC: #4 - Scroll vers le commentaire sélectionné
 * @see AC: #5 - Liste des commentaires
 */

import { useEffect } from "react";
import { MessageSquare, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useComments } from "../hooks/useComments";
import { useCreateComment } from "../hooks/useCreateComment";
import { useUpdateComment } from "../hooks/useUpdateComment";
import { useDeleteComment } from "../hooks/useDeleteComment";
import { CommentForm } from "./CommentForm";
import { CommentsList } from "./CommentsList";

export interface CommentSelection {
  /** Selected text */
  text: string;
  /** Start position in document */
  anchorStart: number;
  /** End position in document */
  anchorEnd: number;
}

export interface CommentsSidebarProps {
  /** Note ID to load comments for */
  noteId: string;
  /** Current user ID for author detection */
  currentUserId?: string;
  /** Whether the sidebar is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current text selection (shows form when set) */
  selection?: CommentSelection | null;
  /** Callback when selection should be cleared */
  onSelectionClear?: () => void;
  /** ID of comment to highlight/scroll to */
  selectedCommentId?: string | null;
  /** Callback when a comment is selected */
  onCommentSelect?: (commentId: string) => void;
  /** Callback when a comment is created (for adding highlight) */
  onCommentCreated?: (commentId: string, anchorStart: number, anchorEnd: number) => void;
  /** Callback when a comment is deleted (for removing highlight) */
  onCommentDeleted?: (commentId: string) => void;
}

/**
 * Side panel for comments on a note
 *
 * @example
 * ```tsx
 * <CommentsSidebar
 *   noteId={noteId}
 *   currentUserId={session?.user?.id}
 *   open={showComments}
 *   onOpenChange={setShowComments}
 *   selection={textSelection}
 *   onSelectionClear={() => setTextSelection(null)}
 *   selectedCommentId={highlightedCommentId}
 *   onCommentSelect={(id) => {
 *     setHighlightedCommentId(id);
 *     // Scroll to highlight in editor
 *   }}
 *   onCommentCreated={(id, start, end) => {
 *     editor.commands.addCommentMark({ from: start, to: end, commentId: id });
 *   }}
 *   onCommentDeleted={(id) => {
 *     editor.commands.removeCommentMark(id);
 *   }}
 * />
 * ```
 */
export function CommentsSidebar({
  noteId,
  currentUserId,
  open,
  onOpenChange,
  selection,
  onSelectionClear,
  selectedCommentId,
  onCommentSelect,
  onCommentCreated,
  onCommentDeleted,
}: CommentsSidebarProps) {
  // Fetch comments
  const {
    comments,
    total,
    isLoading,
    refetch,
  } = useComments(noteId, {
    enabled: open,
    refetchInterval: open ? 5000 : false,
  });

  // Create comment mutation
  const { createComment, isCreating } = useCreateComment(noteId, {
    onSuccess: (comment) => {
      onSelectionClear?.();
      onCommentCreated?.(comment.id, comment.anchorStart, comment.anchorEnd);
      refetch();
    },
  });

  // Update comment mutation
  const { updateComment, isUpdating } = useUpdateComment({
    noteId,
    onSuccess: () => {
      refetch();
    },
  });

  // Delete comment mutation
  const { deleteComment, isDeleting } = useDeleteComment({
    noteId,
    onSuccess: (commentId) => {
      onCommentDeleted?.(commentId);
      refetch();
    },
  });

  // Clear selection when sidebar closes
  useEffect(() => {
    if (!open && selection) {
      onSelectionClear?.();
    }
  }, [open, selection, onSelectionClear]);

  const handleFormSubmit = (data: {
    content: string;
    anchorStart: number;
    anchorEnd: number;
  }) => {
    createComment(data);
  };

  const handleEdit = (commentId: string, newContent: string) => {
    updateComment({ commentId, input: { content: newContent } });
  };

  const handleDelete = (commentId: string) => {
    deleteComment(commentId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[450px] flex flex-col p-0"
      >
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <SheetTitle>Commentaires</SheetTitle>
              {total > 0 && (
                <span className="text-sm text-muted-foreground">
                  ({total})
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Fermer le panneau des commentaires"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription className="sr-only">
            Panneau des commentaires de la note
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Comment Form - shown when text is selected */}
          {selection && (
            <div className="p-4 border-b bg-muted/30">
              <CommentForm
                selectedText={selection.text}
                anchorStart={selection.anchorStart}
                anchorEnd={selection.anchorEnd}
                onSubmit={handleFormSubmit}
                onCancel={onSelectionClear}
                isSubmitting={isCreating}
              />
            </div>
          )}

          {/* Comments List */}
          <div className="p-4">
            <CommentsList
              comments={comments}
              currentUserId={currentUserId}
              selectedCommentId={selectedCommentId}
              isLoading={isLoading}
              onCommentSelect={onCommentSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

/**
 * ReplyForm Component
 *
 * Compact form for replying to a comment.
 * Smaller than CommentForm, designed to appear inline under comments.
 *
 * @see Story 9.6: Réponses et Résolution de Commentaires
 * @see AC: #1 - Formulaire de réponse sous le commentaire
 * @see AC: #2 - Réponse sauvegardée avec parentId
 */

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Comment } from "../types";

export interface ReplyFormProps {
  /** Parent comment being replied to */
  parentComment: Comment;
  /** Callback when reply is submitted */
  onSubmit: (content: string) => void;
  /** Callback when form is cancelled */
  onCancel: () => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Whether to auto-focus the textarea */
  autoFocus?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact reply form for comment threads
 *
 * @example
 * ```tsx
 * <ReplyForm
 *   parentComment={comment}
 *   onSubmit={(content) => {
 *     replyToComment({
 *       parentComment: comment,
 *       content,
 *     });
 *   }}
 *   onCancel={() => setActiveReplyId(null)}
 *   isSubmitting={isReplying}
 *   autoFocus
 * />
 * ```
 */
export function ReplyForm({
  parentComment,
  onSubmit,
  onCancel,
  isSubmitting = false,
  autoFocus = false,
  className,
}: ReplyFormProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmedContent = content.trim();
  const canSubmit = trimmedContent.length > 0 && !isSubmitting;

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(trimmedContent);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Répondre à ${parentComment.createdBy?.name ?? "ce commentaire"}...`}
        className="min-h-[60px] max-h-[120px] resize-none text-sm"
        disabled={isSubmitting}
        aria-label={`Répondre au commentaire de ${parentComment.createdBy?.name ?? "Utilisateur inconnu"}`}
      />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          <Send className="h-3.5 w-3.5 mr-1" />
          Répondre
        </Button>
      </div>
    </div>
  );
}

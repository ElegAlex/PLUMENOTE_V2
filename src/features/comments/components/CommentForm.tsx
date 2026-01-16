"use client";

/**
 * CommentForm Component
 *
 * Form for creating a new comment with selected text context.
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #1 - Zone de saisie de commentaire
 * @see AC: #2 - Écrire et soumettre un commentaire
 */

import { useState, useRef, useEffect } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CommentFormProps {
  /** Selected text to comment on */
  selectedText?: string;
  /** Start position in document */
  anchorStart: number;
  /** End position in document */
  anchorEnd: number;
  /** Callback when form is submitted */
  onSubmit: (data: { content: string; anchorStart: number; anchorEnd: number }) => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Maximum length for comment content
 */
const MAX_CONTENT_LENGTH = 5000;

/**
 * Truncate text with ellipsis if too long
 */
function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Form for creating comments on selected text
 *
 * @example
 * ```tsx
 * <CommentForm
 *   selectedText="texte sélectionné"
 *   anchorStart={10}
 *   anchorEnd={25}
 *   onSubmit={({ content, anchorStart, anchorEnd }) => {
 *     createComment({ content, anchorStart, anchorEnd });
 *   }}
 *   onCancel={() => setShowForm(false)}
 *   isSubmitting={isCreating}
 * />
 * ```
 */
export function CommentForm({
  selectedText,
  anchorStart,
  anchorEnd,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const trimmedContent = content.trim();
  const isValid = trimmedContent.length >= 1 && trimmedContent.length <= MAX_CONTENT_LENGTH;
  const remainingChars = MAX_CONTENT_LENGTH - trimmedContent.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !isSubmitting) {
      onSubmit({
        content: trimmedContent,
        anchorStart,
        anchorEnd,
      });
      setContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel?.();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (isValid && !isSubmitting) {
        handleSubmit(e);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-3", className)}
      aria-label="Formulaire de commentaire"
    >
      {/* Selected text quote */}
      {selectedText && (
        <blockquote className="border-l-2 border-primary/30 pl-3 py-1 text-sm text-muted-foreground italic bg-muted/30 rounded-r">
          <span className="line-clamp-2" title={selectedText}>
            « {truncateText(selectedText, 150)} »
          </span>
        </blockquote>
      )}

      {/* Comment input */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ajouter un commentaire..."
          className="min-h-[100px] resize-none pr-12"
          disabled={isSubmitting}
          aria-label="Contenu du commentaire"
          aria-describedby="comment-char-count"
          maxLength={MAX_CONTENT_LENGTH}
        />

        {/* Character count */}
        {trimmedContent.length > 0 && (
          <span
            id="comment-char-count"
            className={cn(
              "absolute bottom-2 left-3 text-xs",
              remainingChars < 100 ? "text-warning" : "text-muted-foreground",
              remainingChars < 0 && "text-destructive"
            )}
          >
            {remainingChars} caractères restants
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">
            Ctrl
          </kbd>
          {" + "}
          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">
            Entrée
          </kbd>
          {" pour envoyer"}
        </p>

        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-1" />
              Annuler
            </Button>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={!isValid || isSubmitting}
          >
            <Send className="h-4 w-4 mr-1" />
            {isSubmitting ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </div>
    </form>
  );
}

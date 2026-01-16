"use client";

/**
 * CommentItem Component
 *
 * Displays a single comment with author info, date, content, and actions.
 * Supports inline editing for the author.
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #6 - Afficher auteur, date relative, contenu
 * @see AC: #8 - Modifier ou supprimer son commentaire
 */

import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Comment } from "../types";

export interface CommentItemProps {
  /** Comment data */
  comment: Comment;
  /** Whether the current user is the author */
  isAuthor?: boolean;
  /** Whether this comment is currently selected/highlighted */
  isSelected?: boolean;
  /** Whether edit mode is active */
  isEditing?: boolean;
  /** Callback when comment is clicked */
  onSelect?: () => void;
  /** Callback when edit is requested */
  onEdit?: (commentId: string, newContent: string) => void;
  /** Callback when delete is requested */
  onDelete?: (commentId: string) => void;
}

/**
 * Get initials from a name
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0]?.substring(0, 2).toUpperCase() ?? "?";
  }
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

/**
 * Format date as relative time for display
 */
function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: fr });
}

/**
 * Format date with time for tooltip/aria-label
 */
function formatFullDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "d MMMM yyyy 'à' HH:mm", { locale: fr });
}

/**
 * Single comment item with author info, content, and actions
 *
 * @example
 * ```tsx
 * <CommentItem
 *   comment={comment}
 *   isAuthor={comment.createdById === currentUserId}
 *   isSelected={selectedCommentId === comment.id}
 *   onSelect={() => setSelectedCommentId(comment.id)}
 *   onEdit={(id, content) => updateComment({ commentId: id, input: { content } })}
 *   onDelete={(id) => deleteComment(id)}
 * />
 * ```
 */
export function CommentItem({
  comment,
  isAuthor = false,
  isSelected = false,
  isEditing: externalIsEditing,
  onSelect,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const authorName = comment.createdBy?.name ?? "Utilisateur inconnu";
  const authorAvatar = comment.createdBy?.avatar ?? null;
  const initials = getInitials(authorName);
  const relativeDate = formatRelativeDate(comment.createdAt);
  const fullDate = formatFullDate(comment.createdAt);

  // Sync with external isEditing prop if provided
  useEffect(() => {
    if (externalIsEditing !== undefined) {
      setIsEditing(externalIsEditing);
    }
  }, [externalIsEditing]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  // Reset edit content when comment changes
  useEffect(() => {
    setEditContent(comment.content);
  }, [comment.content]);

  const handleStartEdit = () => {
    setEditContent(comment.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    const trimmedContent = editContent.trim();
    if (trimmedContent && trimmedContent !== comment.content) {
      onEdit?.(comment.id, trimmedContent);
    }
    setIsEditing(false);
  };

  const handleConfirmDelete = () => {
    onDelete?.(comment.id);
    setShowDeleteDialog(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancelEdit();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSaveEdit();
    }
  };

  return (
    <>
      <div
        className={cn(
          "group rounded-lg p-3 transition-colors",
          isSelected && "bg-accent",
          !isEditing && "hover:bg-muted/50 cursor-pointer"
        )}
        onClick={!isEditing ? onSelect : undefined}
        role="article"
        aria-label={`Commentaire de ${authorName}, ${fullDate}`}
      >
        {/* Header: Avatar + Name + Date + Actions */}
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{authorName}</span>
              <span
                className="text-xs text-muted-foreground"
                title={fullDate}
              >
                {relativeDate}
              </span>
            </div>

            {/* Content or Edit Mode */}
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[80px] resize-none"
                  placeholder="Contenu du commentaire..."
                  aria-label="Modifier le commentaire"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim() || editContent.trim() === comment.content}
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            )}
          </div>

          {/* Actions Menu - only visible for author */}
          {isAuthor && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  aria-label="Actions du commentaire"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleStartEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le commentaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le commentaire sera définitivement
              supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

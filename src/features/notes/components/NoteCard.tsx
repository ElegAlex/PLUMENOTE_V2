"use client";

/**
 * NoteCard Component
 *
 * Displays a single note in a card format with title, preview, and actions.
 *
 * @see Story 3.3: Liste des Notes
 */

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { MoreHorizontal, Trash2, Edit, Star } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TagChip } from "./TagChip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Note } from "../types";

export interface NoteCardProps {
  /** The note to display */
  note: Note;
  /** Callback when delete is clicked */
  onDelete?: (id: string) => void;
  /** Callback when favorite is toggled */
  onToggleFavorite?: (id: string) => void;
  /** Whether delete is in progress */
  isDeleting?: boolean;
  /** Whether favorite toggle is in progress */
  isTogglingFavorite?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Decode HTML entities to plain text
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&nbsp;": " ",
  };
  return text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (match) => entities[match] || match);
}

/**
 * Extract plain text preview from HTML content
 */
function getPreview(html: string | null, maxLength = 150): string {
  if (!html) return "";

  // Strip HTML tags and decode entities
  const text = decodeHtmlEntities(
    html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  );

  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Format date relative to now
 */
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

/**
 * Card component displaying a note with title, preview, and actions
 */
export function NoteCard({
  note,
  onDelete,
  onToggleFavorite,
  isDeleting = false,
  isTogglingFavorite = false,
  className,
}: NoteCardProps) {
  const preview = getPreview(note.content);
  const displayTitle = note.title || "Sans titre";

  return (
    <Card
      className={cn(
        "group relative transition-shadow hover:shadow-md",
        isDeleting && "opacity-50 pointer-events-none",
        note.isFavorite && "ring-1 ring-yellow-400/50",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          {/* Favorite button */}
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 shrink-0 transition-all",
                note.isFavorite
                  ? "text-yellow-500 hover:text-yellow-600"
                  : "text-muted-foreground/40 hover:text-yellow-500 opacity-0 group-hover:opacity-100 focus:opacity-100"
              )}
              onClick={() => onToggleFavorite(note.id)}
              disabled={isTogglingFavorite}
              aria-label={note.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Star
                className={cn("h-4 w-4", note.isFavorite && "fill-current")}
              />
            </Button>
          )}

          <Link
            href={`/notes/${note.id}`}
            className="flex-1 min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CardTitle className="text-lg font-semibold line-clamp-2 hover:text-primary transition-colors">
              {displayTitle}
            </CardTitle>
          </Link>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-40 group-hover:opacity-100 focus:opacity-100 group-focus-within:opacity-100 transition-opacity"
                aria-label="Actions pour la note"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/notes/${note.id}`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Link>
              </DropdownMenuItem>
              {onToggleFavorite && (
                <DropdownMenuItem
                  onClick={() => onToggleFavorite(note.id)}
                  disabled={isTogglingFavorite}
                >
                  <Star className={cn("mr-2 h-4 w-4", note.isFavorite && "fill-current text-yellow-500")} />
                  {note.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(note.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {/* Content preview */}
        <Link
          href={`/notes/${note.id}`}
          className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {preview ? (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {preview}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/50 italic">
              Aucun contenu
            </p>
          )}
        </Link>

        {/* Tags (Story 3.6) - max 3 visible, then +N indicator */}
        {note.tags && note.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {note.tags.slice(0, 3).map((tag) => (
              <TagChip key={tag.id} tag={tag} variant="compact" />
            ))}
            {note.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground font-medium px-1">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Metadata */}
        <p className="mt-3 text-xs text-muted-foreground">
          Modifié {formatDate(note.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}

"use client";

/**
 * RecentlyViewedNotes Component
 *
 * Displays the most recently viewed notes in a compact card format.
 * Uses the view tracking system to show notes the user has actually opened.
 *
 * @see Story 6.4: Notes Récentes (AC: #1, #3)
 */

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentNotes, type RecentNote } from "../hooks/useRecentNotes";
import { RECENT_NOTES_LIMIT } from "../constants";
import { cn } from "@/lib/utils";

export interface RecentlyViewedNotesProps {
  /** Maximum number of notes to display */
  limit?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show as a standalone card or just the list */
  showCard?: boolean;
}

/**
 * Format date relative to now in French
 */
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

/**
 * Compact note item for the recently viewed notes list
 */
function RecentlyViewedNoteItem({ note }: { note: RecentNote }) {
  const displayTitle = note.title || "Sans titre";

  return (
    <Link
      href={`/notes/${note.id}`}
      className="flex items-center justify-between gap-2 rounded-md p-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="font-medium truncate">{displayTitle}</span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {note.viewedAt ? formatDate(note.viewedAt) : formatDate(note.updatedAt)}
      </span>
    </Link>
  );
}

/**
 * Loading skeleton for recently viewed notes
 */
function RecentlyViewedNotesSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-2 p-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no recently viewed notes exist
 */
function RecentlyViewedNotesEmpty() {
  return (
    <div className="py-8 text-center">
      <Eye className="mx-auto h-10 w-10 text-muted-foreground/50" />
      <p className="mt-2 text-sm text-muted-foreground">
        Aucune note consultée récemment.
      </p>
      <p className="text-xs text-muted-foreground/70">
        Ouvrez des notes pour les voir apparaître ici.
      </p>
    </div>
  );
}

/**
 * Section displaying recently viewed notes
 *
 * @example
 * ```tsx
 * // As a standalone card
 * <RecentlyViewedNotes limit={5} />
 *
 * // Without card wrapper (for embedding in other components)
 * <RecentlyViewedNotes limit={5} showCard={false} />
 * ```
 */
export function RecentlyViewedNotes({
  limit = RECENT_NOTES_LIMIT,
  className,
  showCard = true,
}: RecentlyViewedNotesProps) {
  const { recentlyViewed, isLoading, error } = useRecentNotes();

  // Limit the number of items to display
  const displayedNotes = recentlyViewed.slice(0, limit);

  const content = (
    <>
      {isLoading ? (
        <RecentlyViewedNotesSkeleton count={limit} />
      ) : error ? (
        <p className="py-4 text-center text-sm text-destructive">
          Erreur lors du chargement
        </p>
      ) : displayedNotes.length === 0 ? (
        <RecentlyViewedNotesEmpty />
      ) : (
        <div className="space-y-1">
          {displayedNotes.map((note) => (
            <RecentlyViewedNoteItem key={note.id} note={note} />
          ))}
        </div>
      )}
    </>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Eye className="h-5 w-5 text-muted-foreground" />
          Consultées récemment
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{content}</CardContent>
    </Card>
  );
}

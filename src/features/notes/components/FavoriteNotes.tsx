"use client";

/**
 * FavoriteNotes Component
 *
 * Displays the user's favorite/pinned notes in a compact card format.
 * Used on the homepage for quick access to important notes.
 *
 * @see Story 5.6: Homepage Dynamique (AC: #3)
 */

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Star, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNotes } from "../hooks/useNotes";
import { cn } from "@/lib/utils";
import type { Note } from "../types";

export interface FavoriteNotesProps {
  /** Maximum number of notes to display */
  limit?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format date relative to now in French
 */
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

/**
 * Compact note item for the favorites list
 */
function FavoriteNoteItem({ note }: { note: Note }) {
  const displayTitle = note.title || "Sans titre";

  return (
    <Link
      href={`/notes/${note.id}`}
      className="flex items-center justify-between gap-2 rounded-md p-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
        <span className="font-medium truncate">{displayTitle}</span>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(note.updatedAt)}
      </span>
    </Link>
  );
}

/**
 * Loading skeleton for favorite notes
 */
function FavoriteNotesSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-2 p-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no favorites exist
 */
function FavoriteNotesEmpty() {
  return (
    <div className="py-8 text-center">
      <Star className="mx-auto h-10 w-10 text-muted-foreground/50" />
      <p className="mt-2 text-sm text-muted-foreground">
        Aucune note favorite.
      </p>
      <p className="text-xs text-muted-foreground">
        Cliquez sur l&apos;etoile d&apos;une note pour l&apos;ajouter ici.
      </p>
    </div>
  );
}

/**
 * Section displaying favorite/pinned notes
 */
export function FavoriteNotes({ limit = 5, className }: FavoriteNotesProps) {
  const { notes, isLoading, error } = useNotes({
    favoriteOnly: true,
    sortBy: "updatedAt",
    sortDir: "desc",
    pageSize: limit,
  });

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-yellow-500" />
            Notes favorites
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/dashboard?favorites=true"
              className="flex items-center gap-1"
            >
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <FavoriteNotesSkeleton count={limit} />
        ) : error ? (
          <p className="py-4 text-center text-sm text-destructive">
            Erreur lors du chargement des favoris
          </p>
        ) : notes.length === 0 ? (
          <FavoriteNotesEmpty />
        ) : (
          <div className="space-y-1">
            {notes.map((note) => (
              <FavoriteNoteItem key={note.id} note={note} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

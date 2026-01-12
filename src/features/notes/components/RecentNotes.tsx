"use client";

/**
 * RecentNotes Component
 *
 * Displays the most recently modified notes in a compact card format.
 * Used on the homepage for quick access to recent work.
 *
 * @see Story 5.6: Homepage Dynamique (AC: #2)
 */

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNotes } from "../hooks/useNotes";
import { cn } from "@/lib/utils";
import type { Note } from "../types";

export interface RecentNotesProps {
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
 * Compact note item for the recent notes list
 */
function RecentNoteItem({ note }: { note: Note }) {
  const displayTitle = note.title || "Sans titre";

  return (
    <Link
      href={`/notes/${note.id}`}
      className="flex items-center justify-between gap-2 rounded-md p-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="font-medium truncate">{displayTitle}</span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(note.updatedAt)}
      </span>
    </Link>
  );
}

/**
 * Loading skeleton for recent notes
 */
function RecentNotesSkeleton({ count = 5 }: { count?: number }) {
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
 * Empty state when no recent notes exist
 */
function RecentNotesEmpty({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="py-8 text-center">
      <Clock className="mx-auto h-10 w-10 text-muted-foreground/50" />
      <p className="mt-2 text-sm text-muted-foreground">
        Aucune note récente.
      </p>
      {onCreate && (
        <Button variant="link" size="sm" onClick={onCreate} className="mt-1">
          Créez votre première note!
        </Button>
      )}
    </div>
  );
}

/**
 * Section displaying recently modified notes
 */
export function RecentNotes({ limit = 5, className }: RecentNotesProps) {
  const { notes, isLoading, error } = useNotes({
    sortBy: "updatedAt",
    sortDir: "desc",
    pageSize: limit,
  });

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Notes récentes
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard" className="flex items-center gap-1">
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <RecentNotesSkeleton count={limit} />
        ) : error ? (
          <p className="py-4 text-center text-sm text-destructive">
            Erreur lors du chargement des notes
          </p>
        ) : notes.length === 0 ? (
          <RecentNotesEmpty />
        ) : (
          <div className="space-y-1">
            {notes.map((note) => (
              <RecentNoteItem key={note.id} note={note} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

/**
 * TopNotesList Component
 *
 * Displays the top 10 most viewed notes in a table format.
 *
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 * @see AC #5 - Top 10 most viewed notes
 */

import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatViewCount } from "@/lib/format-number";
import type { TopNote } from "../types/admin-stats";

export interface TopNotesListProps {
  /** List of top notes */
  notes: TopNote[];
  /** Show loading skeleton */
  loading?: boolean;
}

/**
 * Top notes list component
 */
export function TopNotesList({ notes, loading = false }: TopNotesListProps) {
  if (loading) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Notes les plus consultées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <FileText className="mb-2 h-8 w-8" aria-hidden="true" />
            <p>Aucune note consultée</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Notes les plus consultées
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead className="w-24 text-right">Vues</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.map((note, index) => (
              <TableRow key={note.id}>
                <TableCell className="font-medium text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/notes/${note.id}`}
                      className="font-medium hover:underline"
                    >
                      {note.title || "Sans titre"}
                    </Link>
                    {note.workspaceName && (
                      <Badge variant="secondary" className="w-fit text-xs">
                        {note.workspaceName}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatViewCount(note.viewCount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

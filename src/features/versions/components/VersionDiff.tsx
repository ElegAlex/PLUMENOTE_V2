"use client";

/**
 * VersionDiff Component
 *
 * Displays a visual diff between two content strings.
 * Shows additions in green and deletions in red.
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #6 - Diff visuel (ajouts en vert, suppressions en rouge)
 */

import { useMemo } from "react";
import { diffLines, diffWords, type Change } from "diff";
import { cn } from "@/lib/utils";

export interface VersionDiffProps {
  /** Original (old) content */
  oldContent: string;
  /** New content to compare against */
  newContent: string;
  /** Diff mode: 'lines' for line-by-line, 'words' for word-by-word */
  mode?: "lines" | "words";
}

/**
 * Render a single diff change
 */
function DiffChange({ change, mode }: { change: Change; mode: "lines" | "words" }) {
  const { added, removed, value } = change;

  // Determine styling based on change type
  const baseClasses = mode === "lines" ? "block py-0.5 px-2" : "inline";

  if (added) {
    return (
      <span
        className={cn(
          baseClasses,
          "bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100",
          mode === "lines" && "border-l-4 border-green-500"
        )}
        aria-label={`Ajouté: ${value}`}
      >
        {mode === "lines" && <span className="select-none mr-2 text-green-600">+</span>}
        {value}
      </span>
    );
  }

  if (removed) {
    return (
      <span
        className={cn(
          baseClasses,
          "bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100",
          mode === "lines" && "border-l-4 border-red-500 line-through"
        )}
        aria-label={`Supprimé: ${value}`}
      >
        {mode === "lines" && <span className="select-none mr-2 text-red-600">-</span>}
        {value}
      </span>
    );
  }

  // Unchanged content
  return (
    <span className={cn(baseClasses, mode === "lines" && "text-muted-foreground")}>
      {mode === "lines" && <span className="select-none mr-2 opacity-50">&nbsp;</span>}
      {value}
    </span>
  );
}

/**
 * Visual diff between two content strings
 *
 * @example
 * ```tsx
 * <VersionDiff
 *   oldContent={previousVersion.content}
 *   newContent={currentVersion.content}
 *   mode="lines"
 * />
 * ```
 */
export function VersionDiff({
  oldContent,
  newContent,
  mode = "lines",
}: VersionDiffProps) {
  // Compute the diff
  const changes = useMemo(() => {
    if (mode === "words") {
      return diffWords(oldContent, newContent);
    }
    return diffLines(oldContent, newContent);
  }, [oldContent, newContent, mode]);

  // Count additions and deletions
  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;

    for (const change of changes) {
      if (change.added) {
        additions += mode === "lines" ? change.value.split("\n").filter(Boolean).length : 1;
      } else if (change.removed) {
        deletions += mode === "lines" ? change.value.split("\n").filter(Boolean).length : 1;
      }
    }

    return { additions, deletions };
  }, [changes, mode]);

  // Check if there are any changes
  const hasChanges = stats.additions > 0 || stats.deletions > 0;

  // No changes
  if (!hasChanges) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Aucune différence</p>
        <p className="text-sm mt-1">Les contenus sont identiques</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats header */}
      <div className="flex gap-4 text-sm">
        <span className="text-green-600 dark:text-green-400">
          +{stats.additions} ajout{stats.additions !== 1 ? "s" : ""}
        </span>
        <span className="text-red-600 dark:text-red-400">
          -{stats.deletions} suppression{stats.deletions !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Diff content */}
      <div
        className={cn(
          "font-mono text-sm",
          mode === "lines" && "space-y-0",
          mode === "words" && "whitespace-pre-wrap"
        )}
        role="region"
        aria-label="Différences entre les versions"
      >
        {changes.map((change, index) => (
          <DiffChange key={index} change={change} mode={mode} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground mt-4 pt-2 border-t">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded" />
          <span>Ajouts</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-100 dark:bg-red-900/30 rounded" />
          <span>Suppressions</span>
        </div>
      </div>
    </div>
  );
}

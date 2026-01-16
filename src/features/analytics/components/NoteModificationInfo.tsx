"use client";

/**
 * NoteModificationInfo Component
 *
 * Combines modification date and last modified by user into a single display.
 * Supports fallback to createdBy when lastModifiedBy is null.
 *
 * @see Story 10.3: Affichage Date de Modification et Contributeur (FR44, FR45)
 * @see AC #1: Date de modification affichée
 * @see AC #3: Contributeur affiché avec avatar
 * @see AC #5: Fallback vers createdBy si jamais modifiée
 */

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModificationDate } from "./ModificationDate";
import { LastModifiedBy } from "./LastModifiedBy";
import type { LastModifiedByUser } from "@/features/notes/types";

export interface NoteModificationInfoProps {
  /** The date the note was last updated */
  updatedAt: Date | string;
  /** The user who last modified the note */
  lastModifiedBy: LastModifiedByUser | null;
  /** Fallback user (creator) when lastModifiedBy is null */
  createdBy?: LastModifiedByUser | null;
  /** Display variant - default shows icon, compact is minimal */
  variant?: "default" | "compact";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays modification date and last contributor in a combined layout
 */
export function NoteModificationInfo({
  updatedAt,
  lastModifiedBy,
  createdBy,
  variant = "default",
  className,
}: NoteModificationInfoProps) {
  // Fallback to createdBy if lastModifiedBy is null (note never modified after creation)
  const contributor = lastModifiedBy || createdBy || null;
  const isCompact = variant === "compact";

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {/* Clock icon for visual recognition (default variant only) */}
      {!isCompact && (
        <Clock
          className="h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
      )}

      {/* Modification date with tooltip */}
      <ModificationDate date={updatedAt} variant={variant} />

      {/* Contributor info */}
      {contributor && (
        <>
          <span className="text-muted-foreground">par</span>
          <LastModifiedBy user={contributor} variant={variant} />
        </>
      )}
    </div>
  );
}

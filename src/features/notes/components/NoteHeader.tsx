"use client";

/**
 * Note Header Component
 *
 * Displays the note title (editable), view count, modification info, and save status indicator.
 * Handles auto-focus for new notes.
 *
 * @see Story 3.3: Creation d'une Nouvelle Note
 * @see Story 3.4: Sauvegarde Automatique des Notes
 * @see Story 10.2: Affichage du Nombre de Vues (FR43)
 * @see Story 10.3: Affichage Date de Modification et Contributeur (FR44, FR45)
 * @see AC #3: Auto-focus sur le titre
 * @see AC #5: Indicateur "Sauvegarde"
 * @see AC #2 (3.4): Indicateur "Hors ligne"
 */

import { useRef, useEffect } from "react";
import { Check, Loader2, AlertCircle, Cloud, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { ViewCount } from "@/features/analytics/components/ViewCount";
import { NoteModificationInfo } from "@/features/analytics/components/NoteModificationInfo";
import type { LastModifiedByUser } from "@/features/analytics";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

export interface NoteHeaderProps {
  /** Current title value */
  title: string;
  /** Callback when title changes */
  onTitleChange: (title: string) => void;
  /** Current save status */
  saveStatus: SaveStatus;
  /** Whether this is a new note (triggers auto-focus) */
  isNewNote?: boolean;
  /** Placeholder text for empty title */
  placeholder?: string;
  /** View count for the note (Story 10.2) */
  viewCount?: number;
  /** Last updated timestamp (Story 10.3) */
  updatedAt?: Date | string;
  /** User who last modified the note (Story 10.3) */
  lastModifiedBy?: LastModifiedByUser | null;
  /** User who created the note - fallback for lastModifiedBy (Story 10.3) */
  createdBy?: LastModifiedByUser | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Save status indicator with icon and text
 */
function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const config = {
    idle: {
      icon: Cloud,
      text: "",
      className: "text-muted-foreground opacity-0",
    },
    saving: {
      icon: Loader2,
      text: "Sauvegarde...",
      className: "text-muted-foreground animate-pulse",
    },
    saved: {
      icon: Check,
      text: "Sauvegardé",
      className: "text-green-600 dark:text-green-500",
    },
    error: {
      icon: AlertCircle,
      text: "Erreur",
      className: "text-destructive",
    },
    offline: {
      icon: WifiOff,
      text: "Hors ligne",
      className: "text-orange-500 dark:text-orange-400",
    },
  };

  const { icon: Icon, text, className } = config[status];

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-sm transition-opacity duration-200",
        className,
        status === "idle" && "opacity-0"
      )}
      role="status"
      aria-live="polite"
    >
      <Icon
        className={cn("h-4 w-4", status === "saving" && "animate-spin")}
        aria-hidden="true"
      />
      <span>{text}</span>
    </div>
  );
}

/**
 * Note header with editable title, view count, modification info, and save status
 */
export function NoteHeader({
  title,
  onTitleChange,
  saveStatus,
  isNewNote = false,
  placeholder = "Sans titre",
  viewCount,
  updatedAt,
  lastModifiedBy,
  createdBy,
  className,
}: NoteHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and select title for new notes
  useEffect(() => {
    if (isNewNote && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isNewNote]);

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {/* Editable title */}
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={placeholder}
        maxLength={255}
        className="flex-1 border-none bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground focus:ring-0"
        aria-label="Titre de la note"
      />

      {/* View count indicator (Story 10.2) */}
      {viewCount !== undefined && <ViewCount count={viewCount} />}

      {/* Modification info (Story 10.3) */}
      {updatedAt && (
        <NoteModificationInfo
          updatedAt={updatedAt}
          lastModifiedBy={lastModifiedBy || null}
          createdBy={createdBy}
        />
      )}

      {/* Save status indicator */}
      <SaveStatusIndicator status={saveStatus} />
    </div>
  );
}

"use client";

/**
 * VersionListItem Component
 *
 * Displays a single version entry in the history list.
 * Shows version number, relative date, and author info.
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #2 - Version number, formatted date, author name and avatar
 */

import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getInitials } from "../utils";
import type { NoteVersionSummary } from "../types";

export interface VersionListItemProps {
  /** Version data */
  version: NoteVersionSummary;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Click handler */
  onClick?: () => void;
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
 * Single version item in the history list
 *
 * @example
 * ```tsx
 * <VersionListItem
 *   version={version}
 *   isSelected={selectedId === version.id}
 *   onClick={() => setSelectedId(version.id)}
 * />
 * ```
 */
export function VersionListItem({
  version,
  isSelected = false,
  onClick,
}: VersionListItemProps) {
  const authorName = version.createdBy?.name ?? "Utilisateur inconnu";
  const authorImage = version.createdBy?.image ?? null;
  const initials = getInitials(authorName);
  const relativeDate = formatRelativeDate(version.createdAt);
  const fullDate = formatFullDate(version.createdAt);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors",
        "hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected && "bg-accent"
      )}
      aria-label={`Version ${version.version}, ${fullDate}, par ${authorName}`}
      aria-current={isSelected ? "true" : undefined}
    >
      {/* Version badge */}
      <Badge variant="secondary" className="shrink-0 font-mono">
        v{version.version}
      </Badge>

      {/* Date and title info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm text-muted-foreground truncate"
          title={fullDate}
        >
          {relativeDate}
        </p>
      </div>

      {/* Author avatar */}
      <Avatar className="h-7 w-7 shrink-0">
        {authorImage && <AvatarImage src={authorImage} alt={authorName} />}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
    </button>
  );
}

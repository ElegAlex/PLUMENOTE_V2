"use client";

/**
 * BacklinkItem Component
 *
 * Displays a single backlink item in the BacklinksPanel.
 * Shows note title, link context, relative date, and handles click navigation.
 *
 * @see Story 6.7: Panneau Backlinks
 * @see AC: #2 - Affiche titre, contexte (linkTitle), et date relative
 * @see AC: #3 - Cliquable pour navigation
 */

import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Format a date as relative time (e.g., "il y a 2 heures")
 */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "à l'instant";
  } else if (diffMinutes < 60) {
    return `il y a ${diffMinutes} min`;
  } else if (diffHours < 24) {
    return `il y a ${diffHours}h`;
  } else if (diffDays < 7) {
    return `il y a ${diffDays}j`;
  } else {
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  }
}

export interface BacklinkItemProps {
  /** Note title */
  title: string;
  /** Link context (title at time of linking) */
  context: string | null;
  /** Last modification date (ISO 8601) */
  updatedAt: string;
  /** Click handler for navigation */
  onClick: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single backlink item with title, context, date, and click handler
 *
 * @example
 * ```tsx
 * <BacklinkItem
 *   title="Meeting Notes"
 *   context="Project Alpha"
 *   updatedAt="2026-01-13T10:30:00Z"
 *   onClick={() => router.push('/notes/123')}
 * />
 * ```
 */
export function BacklinkItem({
  title,
  context,
  updatedAt,
  onClick,
  className,
}: BacklinkItemProps) {
  const relativeDate = formatRelativeDate(updatedAt);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-md text-left",
        "hover:bg-accent transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      aria-label={`Ouvrir la note ${title}`}
    >
      <FileText
        className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium truncate">{title}</p>
          <span className="text-xs text-muted-foreground shrink-0">
            {relativeDate}
          </span>
        </div>
        {context && (
          <p className="text-sm text-muted-foreground truncate">
            Lié comme: {context}
          </p>
        )}
      </div>
    </button>
  );
}

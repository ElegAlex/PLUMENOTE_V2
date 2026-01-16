"use client";

/**
 * ModificationDate Component
 *
 * Displays a date in relative format with optional tooltip showing exact date.
 * Supports default (with "Modifié" prefix) and compact variants.
 *
 * @see Story 10.3: Affichage Date de Modification et Contributeur (FR44)
 * @see AC #1: Date relative lisible ("Modifié il y a 2 heures")
 * @see AC #2: Tooltip avec date exacte au format local
 */

import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ModificationDateProps {
  /** The date to display (Date object or ISO string) */
  date: Date | string;
  /** Display variant - default shows "Modifié", compact shows date only */
  variant?: "default" | "compact";
  /** Whether to show tooltip with exact date on hover */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays a modification date in relative format with optional tooltip
 */
export function ModificationDate({
  date,
  variant = "default",
  showTooltip = true,
  className,
}: ModificationDateProps) {
  // Convert string to Date if needed
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Handle invalid dates gracefully
  if (isNaN(dateObj.getTime())) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        Date inconnue
      </span>
    );
  }

  // Format relative date (e.g., "il y a 2 heures")
  const relativeDate = formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: fr,
  });

  // Format exact date for tooltip (e.g., "16 janvier 2026 à 14:30")
  const exactDate = format(dateObj, "d MMMM yyyy 'à' HH:mm", { locale: fr });

  // Build display text based on variant
  const displayText = variant === "default" ? `Modifié ${relativeDate}` : relativeDate;

  const content = (
    <span
      tabIndex={0}
      className={cn("text-muted-foreground cursor-help focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm", className)}
    >
      {displayText}
    </span>
  );

  // Return without tooltip if disabled
  if (!showTooltip) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>
        <p>{exactDate}</p>
      </TooltipContent>
    </Tooltip>
  );
}

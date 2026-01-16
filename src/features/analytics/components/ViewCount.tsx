"use client";

/**
 * ViewCount Component
 *
 * Displays a note's view count with optional tooltip.
 * Supports default and compact variants for different UI contexts.
 *
 * @see Story 10.2: Affichage du Nombre de Vues (FR43)
 * @see AC #1: View count displayed in header
 * @see AC #2: Human-readable format (42 vues, 1.5k vues)
 * @see AC #3: Tooltip explains "Vues uniques des 30 derniers jours"
 * @see AC #5: Singular/plural handling
 * @see AC #6: Compact variant for NoteCard
 * @see AC #7: Eye icon for visual recognition
 */

import { Eye } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatViewCount } from "@/lib/format-number";

export interface ViewCountProps {
  /** The view count to display */
  count: number;
  /** Display variant - default shows label, compact omits it */
  variant?: "default" | "compact";
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * View count display component with icon and optional tooltip
 */
export function ViewCount({
  count,
  variant = "default",
  showTooltip = true,
  className,
}: ViewCountProps) {
  const formattedCount = formatViewCount(count);
  // French: 0 or 1 = singular "vue", > 1 = plural "vues"
  const label = count <= 1 ? "vue" : "vues";
  const isCompact = variant === "compact";

  // Full aria-label for screen readers (especially important for compact variant)
  const ariaLabel = `${formattedCount} ${label}`;

  const content = (
    <div
      className={cn(
        "flex items-center gap-1 text-muted-foreground",
        className
      )}
      aria-label={ariaLabel}
      role="status"
    >
      <Eye
        className={cn("h-4 w-4", isCompact && "h-3 w-3")}
        aria-hidden="true"
      />
      <span className={cn("text-sm", isCompact && "text-xs")}>
        {formattedCount}
      </span>
      {!isCompact && <span className="text-sm">{label}</span>}
    </div>
  );

  if (!showTooltip) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>
        <p>Vues uniques des 30 derniers jours</p>
      </TooltipContent>
    </Tooltip>
  );
}

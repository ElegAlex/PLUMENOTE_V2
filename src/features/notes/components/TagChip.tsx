"use client";

/**
 * TagChip Component
 *
 * Displays a tag as a colored chip with optional remove button.
 *
 * @see Story 3.6: Métadonnées et Tags
 */

import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tag } from "../types";

export interface TagChipProps {
  /** The tag to display */
  tag: Tag;
  /** Callback when remove button is clicked (if not provided, no X button shown) */
  onRemove?: () => void;
  /** Visual variant */
  variant?: "default" | "compact";
  /** Whether the tag is being removed (shows loading state) */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Safely generate a background color with opacity from a hex color.
 * Returns a valid CSS color or a fallback for non-hex inputs.
 */
function getBackgroundColor(color: string): string {
  // Match 6-char hex (#RRGGBB) or 3-char hex (#RGB)
  const hex6Match = /^#([0-9A-Fa-f]{6})$/.exec(color);
  const hex3Match = /^#([0-9A-Fa-f]{3})$/.exec(color);

  if (hex6Match) {
    // 6-char hex: append opacity
    return `${color}20`;
  }

  if (hex3Match && hex3Match[1]) {
    // 3-char hex: expand to 6-char then append opacity
    const chars = hex3Match[1].split("");
    const r = chars[0] ?? "0";
    const g = chars[1] ?? "0";
    const b = chars[2] ?? "0";
    return `#${r}${r}${g}${g}${b}${b}20`;
  }

  // Fallback for named colors or other formats: use CSS color-mix
  // This works in modern browsers for any valid CSS color
  return `color-mix(in srgb, ${color} 12%, transparent)`;
}

/**
 * Renders a tag as a colored chip
 *
 * @example
 * ```tsx
 * // Editable tag (with remove button)
 * <TagChip tag={tag} onRemove={() => handleRemove(tag.id)} />
 *
 * // Read-only tag (compact, no remove button)
 * <TagChip tag={tag} variant="compact" />
 * ```
 */
export function TagChip({
  tag,
  onRemove,
  variant = "default",
  isLoading = false,
  className,
}: TagChipProps) {
  // Generate light background color from tag color (safely handles different formats)
  const bgColor = getBackgroundColor(tag.color);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium transition-colors",
        variant === "default" && "px-2 py-0.5 text-xs",
        variant === "compact" && "px-1.5 py-0.5 text-[10px]",
        isLoading && "opacity-50",
        className
      )}
      style={{
        backgroundColor: bgColor,
        color: tag.color,
        borderColor: tag.color,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isLoading) {
              onRemove();
            }
          }}
          disabled={isLoading}
          className={cn(
            "rounded-full p-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-current",
            isLoading ? "cursor-not-allowed" : "hover:bg-black/10"
          )}
          aria-label={`Supprimer le tag ${tag.name}`}
        >
          {isLoading ? (
            <Loader2 className={cn(
              "animate-spin",
              variant === "default" && "h-3 w-3",
              variant === "compact" && "h-2.5 w-2.5"
            )} />
          ) : (
            <X className={cn(
              variant === "default" && "h-3 w-3",
              variant === "compact" && "h-2.5 w-2.5"
            )} />
          )}
        </button>
      )}
    </span>
  );
}

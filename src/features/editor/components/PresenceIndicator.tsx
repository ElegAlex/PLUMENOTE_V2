/**
 * PresenceIndicator Component
 *
 * Displays avatars of users currently present on a note.
 * Shows activity status (active/idle) via visual indicators.
 *
 * @see Story 4-5: Indicateur de Présence
 */

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type PresenceUser } from "../hooks/usePresence";

/**
 * Props for the PresenceIndicator component
 */
export interface PresenceIndicatorProps {
  /** List of present users to display */
  users: PresenceUser[];
  /** Maximum number of avatars to display (default: 5) */
  maxVisible?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get initials from a user's name
 * Returns 2-char initials, or "??" for empty/invalid names
 */
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "??";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  // Single word: take first 2 chars, pad with second char if only 1 char
  const initials = trimmed.slice(0, 2).toUpperCase();
  return initials.length === 1 ? initials + initials : initials;
}

/**
 * PresenceIndicator Component
 *
 * Displays a row of overlapping avatars for users present on the note.
 * Active users have a green ring, idle users have a gray ring.
 * Tooltip shows user name and status on hover.
 *
 * @example
 * ```tsx
 * <PresenceIndicator
 *   users={presenceUsers}
 *   maxVisible={5}
 *   className="ml-auto"
 * />
 * ```
 */
export function PresenceIndicator({
  users,
  maxVisible = 5,
  className,
}: PresenceIndicatorProps) {
  // No users present - render nothing
  if (users.length === 0) {
    return null;
  }

  const visibleUsers = users.slice(0, maxVisible);
  const hiddenCount = Math.max(0, users.length - maxVisible);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn("flex -space-x-2", className)}
        role="group"
        aria-label={`${users.length} utilisateur${users.length > 1 ? "s" : ""} présent${users.length > 1 ? "s" : ""}`}
      >
        {visibleUsers.map((user) => (
          <Tooltip key={user.clientId}>
            <TooltipTrigger asChild>
              <div
                role="img"
                tabIndex={0}
                className="relative cursor-default focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
                aria-label={`${user.name} - ${user.isActive ? "Actif" : "Inactif"}`}
              >
                <Avatar
                  className={cn(
                    "h-8 w-8 border-2 border-background transition-opacity",
                    user.isActive
                      ? "ring-2 ring-green-500"
                      : "ring-2 ring-gray-300 opacity-70"
                  )}
                >
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback
                    style={{ backgroundColor: user.color }}
                    className="text-white text-xs font-medium"
                  >
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                {/* Activity indicator dot */}
                <span
                  className={cn(
                    "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                    user.isActive ? "bg-green-500" : "bg-gray-400"
                  )}
                  aria-hidden="true"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-center">
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {user.isActive ? "Actif" : "Inactif"}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Hidden users count */}
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                role="img"
                tabIndex={0}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground cursor-default focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label={`${hiddenCount} autre${hiddenCount > 1 ? "s" : ""} utilisateur${hiddenCount > 1 ? "s" : ""}`}
              >
                +{hiddenCount}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">
                {hiddenCount} autre{hiddenCount > 1 ? "s" : ""} utilisateur
                {hiddenCount > 1 ? "s" : ""}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

export default PresenceIndicator;

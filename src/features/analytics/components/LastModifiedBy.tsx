"use client";

/**
 * LastModifiedBy Component
 *
 * Displays the user who last modified a note with their avatar.
 * Supports default and compact variants, with optional link to profile.
 *
 * @see Story 10.3: Affichage Date de Modification et Contributeur (FR45)
 * @see AC #3: Nom du contributeur affiché avec avatar
 * @see AC #4: Lien cliquable vers profil
 * @see AC #8: Avatar par défaut (initiales) si pas d'image
 */

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { LastModifiedByUser } from "@/features/notes/types";

// Re-export the type for convenience
export type { LastModifiedByUser };

export interface LastModifiedByProps {
  /** The user who last modified the note */
  user: LastModifiedByUser | null;
  /** Display variant - default shows name, compact shows avatar only */
  variant?: "default" | "compact";
  /** Whether to link to the user's profile */
  linkToProfile?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Generate initials from a user's name
 * @param name - The user's full name
 * @returns Up to 2 uppercase initials, or "?" if no name
 */
function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Displays a user's avatar and optionally their name
 */
export function LastModifiedBy({
  user,
  variant = "default",
  linkToProfile = true,
  className,
}: LastModifiedByProps) {
  // Don't render anything if no user
  if (!user) return null;

  const displayName = user.name || "Utilisateur";
  const initials = getInitials(user.name);
  const isCompact = variant === "compact";
  const avatarSize = isCompact ? "h-5 w-5" : "h-6 w-6";

  const content = (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Avatar className={avatarSize}>
        <AvatarImage src={user.image || undefined} alt={displayName} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      {!isCompact && (
        <span className="text-sm text-muted-foreground">{displayName}</span>
      )}
    </div>
  );

  // Wrap in link if linkToProfile is true and user has an id
  if (linkToProfile && user.id) {
    return (
      <Link
        href={`/settings/profile/${user.id}`}
        className="hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        {content}
      </Link>
    );
  }

  return content;
}

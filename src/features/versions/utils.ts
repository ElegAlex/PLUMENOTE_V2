/**
 * Utility functions for the versions feature
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 */

/**
 * Get initials from a name for avatar fallback
 *
 * @param name - Full name or null
 * @returns Uppercase initials (e.g., "JD" for "John Doe") or "?" if no name
 *
 * @example
 * ```ts
 * getInitials("John Doe") // "JD"
 * getInitials("Alice") // "A"
 * getInitials(null) // "?"
 * ```
 */
export function getInitials(name: string | null): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

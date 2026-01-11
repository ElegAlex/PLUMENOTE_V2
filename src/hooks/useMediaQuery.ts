"use client";

/**
 * useMediaQuery Hook
 *
 * React hook for responsive design using CSS media queries.
 * Returns true when the media query matches.
 *
 * @see Story 5.4: Sidebar et Navigation Arborescente
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery("(max-width: 768px)");
 * const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
 * ```
 */

import { useSyncExternalStore } from "react";

/**
 * Hook to check if a media query matches.
 * Uses useSyncExternalStore for SSR compatibility and avoiding setState in effects.
 *
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  // Use useSyncExternalStore for better SSR handling and to avoid lint warnings
  const getSnapshot = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => false;

  const subscribe = (callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    const media = window.matchMedia(query);
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

"use client";

/**
 * Global keyboard shortcuts hook
 *
 * Provides application-wide keyboard shortcuts.
 * Must be used within a client component in the dashboard layout.
 *
 * @see Story 3.3: Raccourci Ctrl+N pour nouvelle note
 * @see FR7: Un utilisateur peut creer une nouvelle note
 */

import { useEffect, useCallback } from "react";

export interface KeyboardShortcutConfig {
  /** Ctrl+N: Create new note */
  onCreateNote?: () => void;
  /** Ctrl+K: Open search (future) */
  onSearch?: () => void;
  /** Whether shortcuts are enabled */
  enabled?: boolean;
}

/**
 * Hook to handle global keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   onCreateNote: handleCreateNote,
 *   onSearch: openSearchPalette,
 * });
 * ```
 */
export function useKeyboardShortcuts(config: KeyboardShortcutConfig) {
  const { onCreateNote, onSearch, enabled = true } = config;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if shortcuts disabled
      if (!enabled) return;

      // Skip if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Ctrl+N or Cmd+N: Create new note
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        // Allow Ctrl+N even when in editor - it's a global action
        e.preventDefault();
        onCreateNote?.();
        return;
      }

      // Ctrl+K or Cmd+K: Open search (future implementation)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        // Skip if typing in input (allow browser default search in inputs)
        if (!isTyping) {
          e.preventDefault();
          onSearch?.();
        }
        return;
      }
    },
    [enabled, onCreateNote, onSearch]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

"use client";

/**
 * Keyboard Shortcuts Provider
 *
 * Client component that provides global keyboard shortcuts throughout the dashboard.
 * Must be mounted within a QueryClientProvider for React Query support.
 *
 * @see Story 3.3: Raccourci Ctrl+N pour nouvelle note
 * @see Story 6.2: Raccourci Ctrl+K pour Command Palette
 */

import { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useNotes } from "@/features/notes/hooks/useNotes";
import { useCommandPaletteStore } from "@/stores/commandPaletteStore";

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export function KeyboardShortcutsProvider({
  children,
}: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const { createNoteAsync, isCreating } = useNotes({ enabled: false });
  const { open: openCommandPalette } = useCommandPaletteStore();

  // Use ref to prevent race condition with rapid key presses
  const isCreatingRef = useRef(false);

  const handleCreateNote = useCallback(async () => {
    // Prevent multiple creations (check both ref and React Query state)
    if (isCreatingRef.current || isCreating) return;

    isCreatingRef.current = true;
    try {
      const note = await createNoteAsync({});
      toast.success("Note creee");
      router.push(`/notes/${note.id}`);
    } catch (err) {
      console.error("Failed to create note via shortcut:", err);
      toast.error("Echec de la creation", {
        description: "Impossible de creer la note.",
      });
    } finally {
      isCreatingRef.current = false;
    }
  }, [createNoteAsync, isCreating, router]);

  // Handle Ctrl+K to open command palette
  const handleSearch = useCallback(() => {
    openCommandPalette();
  }, [openCommandPalette]);

  useKeyboardShortcuts({
    onCreateNote: handleCreateNote,
    onSearch: handleSearch,
    enabled: true,
  });

  return <>{children}</>;
}

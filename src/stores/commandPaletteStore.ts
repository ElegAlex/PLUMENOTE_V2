/**
 * Zustand store for Command Palette state
 *
 * Global state for controlling the command palette visibility.
 * Used by KeyboardShortcutsProvider (Ctrl+K) and CommandPalette component.
 *
 * @see Story 6.2: Command Palette et Recherche (Task 2)
 */

import { create } from "zustand";

interface CommandPaletteStore {
  /** Whether the command palette is currently open */
  isOpen: boolean;
  /** Open the command palette */
  open: () => void;
  /** Close the command palette */
  close: () => void;
  /** Toggle the command palette */
  toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));

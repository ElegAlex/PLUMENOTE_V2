"use client";

/**
 * Dashboard Providers
 *
 * Client-side providers for the dashboard layout.
 * Includes keyboard shortcuts, command palette, and other dashboard-specific functionality.
 *
 * @see Story 3.3: Raccourci Ctrl+N pour nouvelle note
 * @see Story 6.2: Command Palette et Recherche
 */

import { KeyboardShortcutsProvider } from "./KeyboardShortcutsProvider";
import { CommandPalette } from "@/features/search/components/CommandPalette";

interface DashboardProvidersProps {
  children: React.ReactNode;
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <KeyboardShortcutsProvider>
      {children}
      <CommandPalette />
    </KeyboardShortcutsProvider>
  );
}

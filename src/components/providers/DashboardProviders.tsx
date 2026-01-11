"use client";

/**
 * Dashboard Providers
 *
 * Client-side providers for the dashboard layout.
 * Includes keyboard shortcuts and other dashboard-specific functionality.
 *
 * @see Story 3.3: Raccourci Ctrl+N pour nouvelle note
 */

import { KeyboardShortcutsProvider } from "./KeyboardShortcutsProvider";

interface DashboardProvidersProps {
  children: React.ReactNode;
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>;
}

/**
 * Analytics feature module - Server-safe exports
 *
 * This file contains only server-safe exports (types and services).
 * For client-side components and hooks, import from "./client" instead.
 *
 * @see Story 10.1: Tracking des Vues et Métadonnées
 * @see Story 10.4: Dashboard Statistiques Admin
 */

// Types (safe for both server and client)
export type { ViewTrackingResult, NoteViewStats } from "./types";
export type {
  AdminStats,
  DailyActivity,
  TopNote,
  TopContributor,
  AdminStatsQueryParams,
} from "./types/admin-stats";

// Services (server-only)
export { trackNoteView, getNoteViewCount } from "./services/note-view.service";
export { getAdminStats } from "./services/admin-stats.service";

/**
 * Analytics feature module
 * @see Story 10.1: Tracking des Vues et Métadonnées
 *
 * Provides note view tracking and metrics infrastructure.
 */

// Types
export type { ViewTrackingResult, NoteViewStats } from "./types";

// Services
export { trackNoteView, getNoteViewCount } from "./services/note-view.service";

/**
 * Analytics feature module
 * @see Story 10.1: Tracking des Vues et Métadonnées
 * @see Story 10.2: Affichage du Nombre de Vues
 *
 * Provides note view tracking, metrics infrastructure, and display components.
 */

// Types
export type { ViewTrackingResult, NoteViewStats } from "./types";

// Services
export { trackNoteView, getNoteViewCount } from "./services/note-view.service";

// Components
export { ViewCount } from "./components/ViewCount";
export type { ViewCountProps } from "./components/ViewCount";

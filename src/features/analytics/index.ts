/**
 * Analytics feature module
 * @see Story 10.1: Tracking des Vues et Métadonnées
 * @see Story 10.2: Affichage du Nombre de Vues
 * @see Story 10.3: Affichage Date de Modification et Contributeur
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

// Story 10.3 Components
export { LastModifiedBy } from "./components/LastModifiedBy";
export type { LastModifiedByProps, LastModifiedByUser } from "./components/LastModifiedBy";

export { ModificationDate } from "./components/ModificationDate";
export type { ModificationDateProps } from "./components/ModificationDate";

export { NoteModificationInfo } from "./components/NoteModificationInfo";
export type { NoteModificationInfoProps } from "./components/NoteModificationInfo";

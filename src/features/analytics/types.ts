/**
 * Analytics feature types
 * @see Story 10.1: Tracking des Vues et Métadonnées
 */

/**
 * Result of tracking a note view
 */
export interface ViewTrackingResult {
  /** Whether the view was counted (false if deduplicated within 1 hour) */
  counted: boolean;
  /** Current total view count for the note */
  viewCount: number;
}

/**
 * Note view statistics
 */
export interface NoteViewStats {
  noteId: string;
  viewCount: number;
  lastViewedAt: Date | null;
  uniqueViewers: number;
}

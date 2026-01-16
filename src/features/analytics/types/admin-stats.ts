/**
 * Admin Statistics Types
 *
 * Type definitions for the admin dashboard statistics API and components.
 *
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

/**
 * Complete admin statistics response
 */
export interface AdminStats {
  /** Total number of non-deleted notes in the instance */
  totalNotes: number;
  /** Number of notes created in the last 7 days */
  notesThisWeek: number;
  /** Number of users who viewed at least one note in the last 7 days */
  activeUsers: number;
  /** Daily activity for the last 30 days */
  dailyActivity: DailyActivity[];
  /** Top 10 most viewed notes */
  topNotes: TopNote[];
  /** Top 5 contributors by activity */
  topContributors: TopContributor[];
}

/**
 * Daily activity data point for the activity chart
 */
export interface DailyActivity {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Number of notes created on this day */
  created: number;
  /** Number of notes modified on this day */
  modified: number;
}

/**
 * Top note by view count
 */
export interface TopNote {
  /** Note ID */
  id: string;
  /** Note title */
  title: string;
  /** Total view count */
  viewCount: number;
  /** Workspace name (null if not in a workspace) */
  workspaceName: string | null;
}

/**
 * Top contributor statistics
 */
export interface TopContributor {
  /** User ID */
  id: string;
  /** User display name */
  name: string | null;
  /** User avatar URL */
  image: string | null;
  /** Number of notes created by this user */
  notesCreated: number;
  /** Number of notes last modified by this user */
  notesModified: number;
}

/**
 * Query parameters for the admin stats API
 */
export interface AdminStatsQueryParams {
  /** Optional workspace ID to filter statistics */
  workspaceId?: string;
}

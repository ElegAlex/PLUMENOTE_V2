/**
 * Analytics feature module - Client exports only
 *
 * Use this file for client-side imports to avoid importing server-only code.
 *
 * @see Story 10.4: Dashboard Statistiques Admin
 */

// Types (safe for client)
export type {
  AdminStats,
  DailyActivity,
  TopNote,
  TopContributor,
  AdminStatsQueryParams,
} from "./types/admin-stats";

// Hooks
export { useAdminStats, adminStatsQueryKey } from "./hooks/useAdminStats";
export type { UseAdminStatsOptions } from "./hooks/useAdminStats";

// Story 10.2 Components
export { ViewCount } from "./components/ViewCount";
export type { ViewCountProps } from "./components/ViewCount";

// Story 10.3 Components
export { LastModifiedBy } from "./components/LastModifiedBy";
export type { LastModifiedByProps, LastModifiedByUser } from "./components/LastModifiedBy";

export { ModificationDate } from "./components/ModificationDate";
export type { ModificationDateProps } from "./components/ModificationDate";

export { NoteModificationInfo } from "./components/NoteModificationInfo";
export type { NoteModificationInfoProps } from "./components/NoteModificationInfo";

// Story 10.4 Components
export { StatCard } from "./components/StatCard";
export type { StatCardProps } from "./components/StatCard";

export { ActivityChart } from "./components/ActivityChart";
export type { ActivityChartProps } from "./components/ActivityChart";

export { TopNotesList } from "./components/TopNotesList";
export type { TopNotesListProps } from "./components/TopNotesList";

export { TopContributorsList } from "./components/TopContributorsList";
export type { TopContributorsListProps } from "./components/TopContributorsList";

export { WorkspaceFilter } from "./components/WorkspaceFilter";
export type { WorkspaceFilterProps } from "./components/WorkspaceFilter";

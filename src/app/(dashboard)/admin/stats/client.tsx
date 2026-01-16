"use client";

/**
 * Admin Statistics Client Component
 *
 * Client-side dashboard displaying admin statistics with filtering and refresh.
 *
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

import { useState } from "react";
import { RefreshCw, FileText, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAdminStats,
  StatCard,
  ActivityChart,
  TopNotesList,
  TopContributorsList,
  WorkspaceFilter,
} from "@/features/analytics/client";

/**
 * Admin statistics dashboard client component
 */
export function StatsClient() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useAdminStats({
    workspaceId,
  });

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Statistiques</h2>
          <p className="text-muted-foreground">
            Vue d&apos;ensemble de l&apos;activité PlumeNote
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WorkspaceFilter value={workspaceId} onChange={setWorkspaceId} />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isFetching}
            aria-label="Actualiser les statistiques"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total notes"
          value={data?.totalNotes ?? 0}
          icon={FileText}
          description="Notes non-supprimées"
          loading={isLoading}
        />
        <StatCard
          title="Notes cette semaine"
          value={data?.notesThisWeek ?? 0}
          icon={CalendarDays}
          description="Créées les 7 derniers jours"
          loading={isLoading}
        />
        <StatCard
          title="Utilisateurs actifs"
          value={data?.activeUsers ?? 0}
          icon={Users}
          description="Consultations les 7 derniers jours"
          loading={isLoading}
        />
      </div>

      {/* Activity Chart */}
      <ActivityChart data={data?.dailyActivity ?? []} loading={isLoading} />

      {/* Bottom Grid: Top Notes and Top Contributors */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopNotesList notes={data?.topNotes ?? []} loading={isLoading} />
        <TopContributorsList
          contributors={data?.topContributors ?? []}
          loading={isLoading}
        />
      </div>
    </div>
  );
}

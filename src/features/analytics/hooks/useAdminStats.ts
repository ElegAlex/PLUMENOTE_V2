/**
 * useAdminStats Hook
 *
 * React Query hook for fetching admin dashboard statistics.
 *
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

import { useQuery } from "@tanstack/react-query";
import type { AdminStats } from "../types/admin-stats";

/**
 * Query key for admin stats
 */
export const adminStatsQueryKey = (workspaceId?: string | null) =>
  ["admin", "stats", workspaceId ?? "all"] as const;

/**
 * Options for the useAdminStats hook
 */
export interface UseAdminStatsOptions {
  /** Optional workspace ID to filter statistics */
  workspaceId?: string | null;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

/**
 * Fetch admin statistics from the API
 */
async function fetchAdminStats(workspaceId?: string | null): Promise<AdminStats> {
  const params = workspaceId ? `?workspaceId=${workspaceId}` : "";
  const response = await fetch(`/api/admin/stats${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch admin statistics");
  }

  const json = await response.json();
  return json.data as AdminStats;
}

/**
 * Hook to fetch admin dashboard statistics
 *
 * @param options - Configuration options
 * @returns React Query result with admin statistics
 *
 * @example
 * ```tsx
 * const { data, isLoading, refetch } = useAdminStats();
 *
 * // With workspace filter
 * const { data } = useAdminStats({ workspaceId: "workspace-123" });
 * ```
 */
export function useAdminStats(options: UseAdminStatsOptions = {}) {
  const { workspaceId, enabled = true } = options;

  return useQuery({
    queryKey: adminStatsQueryKey(workspaceId),
    queryFn: () => fetchAdminStats(workspaceId),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

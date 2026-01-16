/**
 * Admin Statistics Page
 *
 * Server component that renders the admin statistics dashboard.
 * Authentication and authorization are handled by the admin layout.
 *
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

import { StatsClient } from "./client";

export default function AdminStatsPage() {
  return <StatsClient />;
}

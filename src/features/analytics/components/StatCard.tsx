"use client";

/**
 * StatCard Component
 *
 * Displays a KPI metric with icon, value, and optional description.
 * Supports loading state with skeleton.
 *
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 * @see AC #1, #2, #3, #10 - KPI display with loading states
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatViewCount } from "@/lib/format-number";
import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  /** Card title */
  title: string;
  /** Numeric value to display */
  value: number;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Optional description text */
  description?: string;
  /** Show loading skeleton */
  loading?: boolean;
}

/**
 * KPI card component for displaying statistics
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <Card aria-busy="true">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16" />
          {description && <Skeleton className="mt-1 h-3 w-32" />}
        </CardContent>
      </Card>
    );
  }

  const formattedValue = formatViewCount(value);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

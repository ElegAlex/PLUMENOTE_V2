"use client";

/**
 * ActivityChart Component
 *
 * Displays a 30-day activity chart showing notes created and modified.
 * Uses Recharts with shadcn/ui Chart components.
 *
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 * @see AC #4 - Activity graph for last 30 days
 */

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DailyActivity } from "../types/admin-stats";

export interface ActivityChartProps {
  /** Daily activity data for the chart */
  data: DailyActivity[];
  /** Show loading skeleton */
  loading?: boolean;
}

const chartConfig = {
  created: {
    label: "Notes créées",
    color: "hsl(var(--chart-1))",
  },
  modified: {
    label: "Notes modifiées",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

/**
 * Format date for X-axis labels
 */
function formatXAxisDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, "d MMM", { locale: fr });
  } catch {
    return dateStr;
  }
}

/**
 * Activity chart component displaying 30-day trends
 */
export function ActivityChart({ data, loading = false }: ActivityChartProps) {
  if (loading) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Activité des 30 derniers jours
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatXAxisDate}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    try {
                      const date = new Date(value as string);
                      return format(date, "d MMMM yyyy", { locale: fr });
                    } catch {
                      return value as string;
                    }
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="created"
              name="created"
              fill="var(--color-created)"
              stroke="var(--color-created)"
              fillOpacity={0.4}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="modified"
              name="modified"
              fill="var(--color-modified)"
              stroke="var(--color-modified)"
              fillOpacity={0.4}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

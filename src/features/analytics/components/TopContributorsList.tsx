"use client";

/**
 * TopContributorsList Component
 *
 * Displays the top 5 contributors with their activity stats.
 *
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 * @see AC #6 - Top 5 contributors with avatar and activity
 */

import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatViewCount } from "@/lib/format-number";
import type { TopContributor } from "../types/admin-stats";

export interface TopContributorsListProps {
  /** List of top contributors */
  contributors: TopContributor[];
  /** Show loading skeleton */
  loading?: boolean;
}

/**
 * Get initials from a name
 */
function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Top contributors list component
 */
export function TopContributorsList({
  contributors,
  loading = false,
}: TopContributorsListProps) {
  if (loading) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contributors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Top contributeurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Users className="mb-2 h-8 w-8" aria-hidden="true" />
            <p>Aucun contributeur</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Top contributeurs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contributors.map((contributor, index) => {
            const total = contributor.notesCreated + contributor.notesModified;
            return (
              <div key={contributor.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center text-sm font-medium text-muted-foreground">
                  {index + 1}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={contributor.image || undefined}
                    alt={contributor.name || "Utilisateur"}
                  />
                  <AvatarFallback>
                    {getInitials(contributor.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">
                    {contributor.name || "Utilisateur"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatViewCount(contributor.notesCreated)} créées ·{" "}
                    {formatViewCount(contributor.notesModified)} modifiées
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-medium">
                    {formatViewCount(total)}
                  </p>
                  <p className="text-xs text-muted-foreground">total</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

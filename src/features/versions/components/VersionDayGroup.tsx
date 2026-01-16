"use client";

/**
 * VersionDayGroup Component
 *
 * Groups versions by day with visual separators.
 * Shows "Aujourd'hui", "Hier", or formatted date.
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #3 - Versions groupées par jour avec séparateur visuel
 */

import { useMemo } from "react";
import { isToday, isYesterday, format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { VersionListItem } from "./VersionListItem";
import type { NoteVersionSummary } from "../types";

export interface VersionDayGroupProps {
  /** List of versions to group by day */
  versions: NoteVersionSummary[];
  /** Currently selected version ID */
  selectedVersionId?: string;
  /** Callback when a version is selected */
  onVersionSelect?: (version: NoteVersionSummary) => void;
}

/**
 * Group structure for versions by day
 */
interface DayGroup {
  /** Date key for the group (ISO date string) */
  dateKey: string;
  /** Display label for the group */
  label: string;
  /** Versions in this group */
  versions: NoteVersionSummary[];
}

/**
 * Format day label based on date
 */
function formatDayLabel(date: Date): string {
  if (isToday(date)) {
    return "Aujourd'hui";
  }
  if (isYesterday(date)) {
    return "Hier";
  }
  return format(date, "d MMMM yyyy", { locale: fr });
}

/**
 * Group versions by day
 */
function groupVersionsByDay(versions: NoteVersionSummary[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const version of versions) {
    const date =
      typeof version.createdAt === "string"
        ? new Date(version.createdAt)
        : version.createdAt;
    const dayStart = startOfDay(date);
    const dateKey = dayStart.toISOString();

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        dateKey,
        label: formatDayLabel(dayStart),
        versions: [],
      });
    }

    groups.get(dateKey)!.versions.push(version);
  }

  // Convert to array and sort by date (newest first)
  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
  );
}

/**
 * Groups versions by day with separators
 *
 * @example
 * ```tsx
 * <VersionDayGroup
 *   versions={versions}
 *   selectedVersionId={selectedId}
 *   onVersionSelect={(v) => setSelectedId(v.id)}
 * />
 * ```
 */
export function VersionDayGroup({
  versions,
  selectedVersionId,
  onVersionSelect,
}: VersionDayGroupProps) {
  const dayGroups = useMemo(() => groupVersionsByDay(versions), [versions]);

  if (versions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4" role="list" aria-label="Liste des versions">
      {dayGroups.map((group) => (
        <div key={group.dateKey} role="group" aria-label={group.label}>
          {/* Day separator with label */}
          <div className="flex items-center gap-3 mb-2">
            <Separator className="flex-1" />
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {group.label}
            </span>
            <Separator className="flex-1" />
          </div>

          {/* Versions for this day */}
          <div className="space-y-1">
            {group.versions.map((version) => (
              <div key={version.id} role="listitem">
                <VersionListItem
                  version={version}
                  isSelected={version.id === selectedVersionId}
                  onClick={() => onVersionSelect?.(version)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Export the grouping utility for testing
 */
export { groupVersionsByDay, formatDayLabel };

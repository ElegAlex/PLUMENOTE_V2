"use client";

/**
 * Graph Page
 *
 * Displays an interactive graph visualization of note connections.
 * Supports folder-based filtering (Story 6.9).
 * Accepts ?folderId= query parameter for initial folder scope.
 *
 * @see Story 6.8: Vue Graphe des Connexions
 * @see Story 6.9: Scope de la Vue Graphe
 * @see AC: #1 - Graphe interactif accessible via /graph
 * @see AC: #4 - Action "Graphe local" depuis une note
 * @see AC: #6 - Loading state
 * @see AC: #7 - Empty state avec CTA
 */

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { GraphView, GraphScopeFilter } from "@/features/graph";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the graph
 */
function GraphSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="space-y-4 text-center">
        <Skeleton className="mx-auto h-64 w-64 rounded-full" />
        <Skeleton className="mx-auto h-4 w-48" />
      </div>
    </div>
  );
}

/**
 * Graph page component
 */
export default function GraphPage() {
  const searchParams = useSearchParams();
  const initialFolderId = searchParams.get("folderId");
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);

  // Sync folderId state with URL param changes (Story 6.9: AC #4)
  useEffect(() => {
    setFolderId(initialFolderId);
  }, [initialFolderId]);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Graphe des connexions</h1>
            <p className="text-sm text-muted-foreground">
              Explorez les liens entre vos notes
            </p>
          </div>
          <GraphScopeFilter
            selectedFolderId={folderId}
            onFolderChange={setFolderId}
          />
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Suspense fallback={<GraphSkeleton />}>
          <GraphView folderId={folderId} />
        </Suspense>
      </main>
    </div>
  );
}

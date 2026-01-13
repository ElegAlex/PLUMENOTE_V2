"use client";

/**
 * React Query hook for fetching graph data
 *
 * Returns nodes (notes) and edges (links) for graph visualization.
 * Used by GraphView component.
 * Supports optional folder filtering via folderId parameter (Story 6.9).
 *
 * @see Story 6.8: Vue Graphe des Connexions
 * @see Story 6.9: Scope de la Vue Graphe
 * @see AC: #1 - Graphe interactif avec notes comme nœuds
 * @see AC: #6 - staleTime 60s (données moins volatiles que notes individuelles)
 */

import { useQuery } from "@tanstack/react-query";

/**
 * Graph node representing a note
 */
export interface GraphNode {
  /** Note ID */
  id: string;
  /** Note title */
  title: string;
  /** Number of links (incoming + outgoing) */
  linkCount: number;
}

/**
 * Graph edge representing a link between notes
 */
export interface GraphEdge {
  /** Source note ID */
  source: string;
  /** Target note ID */
  target: string;
}

/**
 * Graph data structure
 * @property outOfScopeEdges - Edges to notes outside the filtered folder scope (Story 6.9)
 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  outOfScopeEdges: GraphEdge[];
}

/**
 * API response format
 */
interface GraphDataResponse {
  data: GraphData;
}

/**
 * Fetch graph data from the API
 * @param folderId - Optional folder ID to filter by (Story 6.9)
 */
async function fetchGraphData(folderId?: string): Promise<GraphData> {
  const url = folderId ? `/api/graph?folderId=${folderId}` : "/api/graph";
  const response = await fetch(url);

  if (!response.ok) {
    let errorMessage = "Échec du chargement du graphe";
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data: GraphDataResponse = await response.json();
  return data.data;
}

/**
 * Hook to fetch graph data for visualization
 *
 * @param folderId - Optional folder ID to filter by (Story 6.9)
 * @returns Graph nodes, edges, outOfScopeEdges, loading state, and refetch function
 *
 * @example
 * ```tsx
 * // Without folder filter
 * const { nodes, edges, isLoading, error } = useGraphData();
 *
 * // With folder filter (Story 6.9)
 * const { nodes, edges, outOfScopeEdges, isLoading } = useGraphData("folder-123");
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorMessage error={error} />;
 * return <ForceGraph2D nodes={nodes} links={edges} />;
 * ```
 */
export function useGraphData(folderId?: string) {
  const query = useQuery({
    queryKey: ["graph", "data", folderId] as const,
    queryFn: () => fetchGraphData(folderId),
    staleTime: 60 * 1000, // 60 seconds (data is less volatile than individual notes)
  });

  return {
    /** Graph nodes (notes) */
    nodes: query.data?.nodes ?? [],
    /** Graph edges (links between notes) */
    edges: query.data?.edges ?? [],
    /** Edges to notes outside the filtered folder scope (Story 6.9) */
    outOfScopeEdges: query.data?.outOfScopeEdges ?? [],
    /** Whether data is being loaded */
    isLoading: query.isLoading,
    /** Whether data is being refetched */
    isFetching: query.isFetching,
    /** Error if fetch failed */
    error: query.error as Error | null,
    /** Refetch graph data */
    refetch: query.refetch,
  };
}

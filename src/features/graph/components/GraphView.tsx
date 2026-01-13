"use client";

/**
 * GraphView Component
 *
 * Interactive force-directed graph visualization of note connections.
 * Uses react-force-graph-2d for canvas-based rendering.
 * Supports folder scoping with out-of-scope edge visualization (Story 6.9).
 *
 * @see Story 6.8: Vue Graphe des Connexions
 * @see Story 6.9: Scope de la Vue Graphe
 * @see AC: #1 - Graphe interactif avec notes comme nœuds
 * @see AC: #2 - Zoom, pan interactions
 * @see AC: #3 - Navigation au clic sur nœud
 * @see AC: #4 - Mise en évidence de la note courante
 * @see AC: #5 - Tooltip et mise en évidence au hover
 */

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useGraphData, GraphNode, GraphEdge } from "../hooks/useGraphData";
import { GraphControls } from "./GraphControls";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2 } from "lucide-react";

// Dynamically import ForceGraph2D to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Skeleton className="h-64 w-64 rounded-full" />
    </div>
  ),
});

/**
 * Extended node type with position (added by force simulation)
 */
interface GraphNodeWithPosition extends GraphNode {
  x?: number;
  y?: number;
}

/**
 * Extended edge type with out-of-scope flag
 */
interface ExtendedGraphEdge extends GraphEdge {
  isOutOfScope?: boolean;
}

/**
 * Graph colors following design tokens
 */
const COLORS = {
  highlighted: "#4F46E5", // Primary indigo - current note
  connected: "#06B6D4", // Accent cyan - connected nodes on hover
  highLinks: "#4F46E5", // > 5 links
  mediumLinks: "#6366F1", // 2-5 links
  fewLinks: "#94A3B8", // 0-2 links
  dimmed: "#E2E8F0", // Non-connected nodes on hover
  edge: "#CBD5E1", // Link color
  edgeOutOfScope: "#E2E8F0", // Out-of-scope edge color (Story 6.9)
};

/**
 * Props for GraphView component
 */
export interface GraphViewProps {
  /** ID of note to highlight (overrides URL param) */
  highlightedNoteId?: string;
  /** ID of folder to filter by (Story 6.9) */
  folderId?: string | null;
}

/**
 * Interactive graph visualization of note connections
 *
 * @example
 * ```tsx
 * // Basic usage
 * <GraphView />
 *
 * // With highlighted note
 * <GraphView highlightedNoteId={currentNoteId} />
 *
 * // With folder filtering (Story 6.9)
 * <GraphView folderId="folder-123" />
 * ```
 */
export function GraphView({ highlightedNoteId, folderId }: GraphViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = highlightedNoteId || searchParams.get("highlightId");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const { nodes, edges, outOfScopeEdges, isLoading } = useGraphData(folderId ?? undefined);

  // Combine edges and outOfScopeEdges with flag (Story 6.9)
  const allEdges = useMemo<ExtendedGraphEdge[]>(() => {
    const inScopeEdges: ExtendedGraphEdge[] = edges.map((e) => ({
      ...e,
      isOutOfScope: false,
    }));
    const outEdges: ExtendedGraphEdge[] = outOfScopeEdges.map((e) => ({
      ...e,
      isOutOfScope: true,
    }));
    return [...inScopeEdges, ...outEdges];
  }, [edges, outOfScopeEdges]);

  // Hovered node state
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Connected nodes to hovered node (includes both in-scope and out-of-scope edges)
  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const connected = new Set<string>();
    allEdges.forEach((edge: ExtendedGraphEdge) => {
      const source =
        typeof edge.source === "object"
          ? (edge.source as GraphNodeWithPosition).id
          : edge.source;
      const target =
        typeof edge.target === "object"
          ? (edge.target as GraphNodeWithPosition).id
          : edge.target;

      if (source === hoveredNode) connected.add(target);
      if (target === hoveredNode) connected.add(source);
    });
    connected.add(hoveredNode);
    return connected;
  }, [hoveredNode, allEdges]);

  // Edge color function (Story 6.9: different color for out-of-scope edges)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getEdgeColor = useCallback((edge: any) => {
    const e = edge as ExtendedGraphEdge;
    return e.isOutOfScope ? COLORS.edgeOutOfScope : COLORS.edge;
  }, []);

  // Edge dash pattern (Story 6.9: dashed for out-of-scope edges)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getEdgeDash = useCallback((edge: any) => {
    const e = edge as ExtendedGraphEdge;
    return e.isOutOfScope ? [5, 5] : null;
  }, []);

  // Edge width (Story 6.9: thinner for out-of-scope edges)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getEdgeWidth = useCallback((edge: any) => {
    const e = edge as ExtendedGraphEdge;
    return e.isOutOfScope ? 0.5 : 1;
  }, []);

  // Node color function
  const getNodeColor = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      const n = node as GraphNodeWithPosition;
      // Highlighted note (current note)
      if (n.id === highlightId) return COLORS.highlighted;

      // Hovered node or connected
      if (hoveredNode) {
        if (n.id === hoveredNode) return COLORS.highlighted;
        if (connectedNodes.has(n.id)) return COLORS.connected;
        return COLORS.dimmed;
      }

      // Default color based on link count
      if (n.linkCount > 5) return COLORS.highLinks;
      if (n.linkCount > 2) return COLORS.mediumLinks;
      return COLORS.fewLinks;
    },
    [highlightId, hoveredNode, connectedNodes]
  );

  // Node size function
  const getNodeSize = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      const n = node as GraphNodeWithPosition;
      if (n.id === highlightId) return 8;
      return 4 + Math.min(n.linkCount, 6);
    },
    [highlightId]
  );

  // Node click handler - navigate to note
  const handleNodeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      const n = node as GraphNodeWithPosition;
      router.push(`/notes/${n.id}`);
    },
    [router]
  );

  // Node hover handler
  const handleNodeHover = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      const n = node as GraphNodeWithPosition | null;
      setHoveredNode(n?.id ?? null);
      document.body.style.cursor = n ? "pointer" : "default";
    },
    []
  );

  // Center on highlighted node on mount
  useEffect(() => {
    if (highlightId && graphRef.current && nodes.length > 0) {
      const node = nodes.find((n) => n.id === highlightId);
      if (node) {
        setTimeout(() => {
          graphRef.current?.centerAt(
            (node as GraphNodeWithPosition).x ?? 0,
            (node as GraphNodeWithPosition).y ?? 0,
            1000
          );
          graphRef.current?.zoom(2, 1000);
        }, 500);
      }
    }
  }, [highlightId, nodes]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-64 w-64 rounded-full" />
          <p className="text-muted-foreground">Chargement du graphe...</p>
        </div>
      </div>
    );
  }

  // Empty state - no connections
  if (nodes.length === 0 || edges.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-12 text-center">
        <Link2 className="mb-4 h-16 w-16 text-muted-foreground/50" />
        <h3 className="mb-2 text-lg font-medium">Pas encore de connexions</h3>
        <p className="mb-4 max-w-md text-muted-foreground">
          Créez des liens entre vos notes avec{" "}
          <code className="rounded bg-muted px-1">[[</code> pour voir
          apparaître un graphe de vos connaissances.
        </p>
        <p className="text-sm text-muted-foreground/70">
          {nodes.length} notes · {edges.length} connexions
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" data-testid="graph-container">
      <GraphControls graphRef={graphRef} />
      <ForceGraph2D
        ref={graphRef}
        graphData={{ nodes, links: allEdges }}
        nodeId="id"
        nodeLabel="title"
        nodeColor={getNodeColor}
        nodeVal={getNodeSize}
        linkColor={getEdgeColor}
        linkWidth={getEdgeWidth}
        linkLineDash={getEdgeDash}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
        cooldownTicks={100}
        onEngineStop={() => graphRef.current?.zoomToFit(400)}
      />
    </div>
  );
}

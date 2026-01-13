/**
 * Graph Feature Module
 *
 * Provides graph visualization of note connections.
 *
 * @see Story 6.8: Vue Graphe des Connexions
 * @see Story 6.9: Scope de la Vue Graphe
 */

// Hooks
export { useGraphData } from "./hooks/useGraphData";
export type { GraphNode, GraphEdge, GraphData } from "./hooks/useGraphData";

// Components
export { GraphView } from "./components/GraphView";
export type { GraphViewProps } from "./components/GraphView";
export { GraphControls } from "./components/GraphControls";
export type { GraphControlsProps } from "./components/GraphControls";
export { GraphScopeFilter } from "./components/GraphScopeFilter";

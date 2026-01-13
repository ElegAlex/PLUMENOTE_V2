"use client";

/**
 * GraphControls Component
 *
 * Zoom and pan controls for the graph visualization.
 *
 * @see Story 6.8: Vue Graphe des Connexions
 * @see AC: #2 - Zoom, pan interactions
 */

import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

/**
 * Graph methods exposed by react-force-graph-2d
 */
interface ForceGraphMethods {
  zoom: (scale?: number, duration?: number) => number;
  zoomToFit: (duration?: number, padding?: number) => void;
}

/**
 * Props for GraphControls component
 */
export interface GraphControlsProps {
  /** Reference to the ForceGraph2D instance */
  graphRef: RefObject<ForceGraphMethods | undefined>;
}

/**
 * Zoom controls for the graph visualization
 *
 * @example
 * ```tsx
 * const graphRef = useRef<ForceGraphMethods>();
 * <GraphControls graphRef={graphRef} />
 * ```
 */
export function GraphControls({ graphRef }: GraphControlsProps) {
  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.5, 300);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom / 1.5, 300);
    }
  };

  const handleReset = () => {
    graphRef.current?.zoomToFit(400);
  };

  return (
    <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handleZoomIn}
        aria-label="Zoom avant"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleZoomOut}
        aria-label="Zoom arrière"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleReset}
        aria-label="Réinitialiser la vue"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

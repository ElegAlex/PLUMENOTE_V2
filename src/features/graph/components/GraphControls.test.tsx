/**
 * Tests for GraphControls component
 *
 * @see Story 6.8: Vue Graphe des Connexions
 * @see AC: #2 - Zoom, pan interactions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { GraphControls } from "./GraphControls";

describe("GraphControls", () => {
  const mockGraphRef = {
    current: {
      zoom: vi.fn().mockReturnValue(1),
      zoomToFit: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders zoom in button", () => {
    render(<GraphControls graphRef={mockGraphRef} />);
    expect(screen.getByRole("button", { name: /zoom avant/i })).toBeInTheDocument();
  });

  it("renders zoom out button", () => {
    render(<GraphControls graphRef={mockGraphRef} />);
    expect(screen.getByRole("button", { name: /zoom arrière/i })).toBeInTheDocument();
  });

  it("renders reset button", () => {
    render(<GraphControls graphRef={mockGraphRef} />);
    expect(screen.getByRole("button", { name: /réinitialiser/i })).toBeInTheDocument();
  });

  it("calls zoom with increased value on zoom in click", () => {
    render(<GraphControls graphRef={mockGraphRef} />);

    fireEvent.click(screen.getByRole("button", { name: /zoom avant/i }));

    expect(mockGraphRef.current.zoom).toHaveBeenCalledWith(1.5, 300);
  });

  it("calls zoom with decreased value on zoom out click", () => {
    render(<GraphControls graphRef={mockGraphRef} />);

    fireEvent.click(screen.getByRole("button", { name: /zoom arrière/i }));

    // 1 / 1.5 ≈ 0.666...
    expect(mockGraphRef.current.zoom).toHaveBeenCalledWith(
      expect.closeTo(0.666, 2),
      300
    );
  });

  it("calls zoomToFit on reset click", () => {
    render(<GraphControls graphRef={mockGraphRef} />);

    fireEvent.click(screen.getByRole("button", { name: /réinitialiser/i }));

    expect(mockGraphRef.current.zoomToFit).toHaveBeenCalledWith(400);
  });

  it("handles undefined graphRef gracefully", () => {
    const emptyRef = { current: undefined };
    render(<GraphControls graphRef={emptyRef} />);

    // Should not throw when clicking buttons
    fireEvent.click(screen.getByRole("button", { name: /zoom avant/i }));
    fireEvent.click(screen.getByRole("button", { name: /zoom arrière/i }));
    fireEvent.click(screen.getByRole("button", { name: /réinitialiser/i }));
  });
});

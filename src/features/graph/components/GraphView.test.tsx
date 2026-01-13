/**
 * Tests for GraphView component
 *
 * @see Story 6.8: Vue Graphe des Connexions
 * @see AC: #1-#7 - Graph visualization requirements
 */

import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { GraphView } from "./GraphView";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock useGraphData hook
vi.mock("../hooks/useGraphData", () => ({
  useGraphData: vi.fn(),
}));

// Mock next/dynamic to return the component directly (skip SSR issues in tests)
vi.mock("next/dynamic", () => ({
  default: vi.fn(() => {
    // Return a mock component that renders our test mock
    const MockComponent = vi.fn(({ onNodeClick, onNodeHover, graphData }: {
      onNodeClick?: (node: { id: string; title: string }) => void;
      onNodeHover?: (node: { id: string; title: string } | null) => void;
      graphData?: { nodes?: { id: string; title: string }[]; links?: unknown[] };
    }) => (
      <div data-testid="force-graph-mock">
        <span data-testid="node-count">{graphData?.nodes?.length ?? 0}</span>
        <span data-testid="edge-count">{graphData?.links?.length ?? 0}</span>
        {graphData?.nodes?.map((node: { id: string; title: string }) => (
          <button
            key={node.id}
            data-testid={`node-${node.id}`}
            onClick={() => onNodeClick?.(node)}
            onMouseEnter={() => onNodeHover?.(node)}
            onMouseLeave={() => onNodeHover?.(null)}
          >
            {node.title}
          </button>
        ))}
      </div>
    ));
    return MockComponent;
  }),
}));

import { useGraphData } from "../hooks/useGraphData";

describe("GraphView", () => {
  const mockPush = vi.fn();
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as Mock).mockReturnValue({ get: mockGet });
    mockGet.mockReturnValue(null);
  });

  it("displays loading state while data is loading", () => {
    (useGraphData as Mock).mockReturnValue({
      nodes: [],
      edges: [],
      outOfScopeEdges: [],
      isLoading: true,
      error: null,
    });

    render(<GraphView />);

    expect(screen.getByText(/chargement/i)).toBeInTheDocument();
  });

  it("displays empty state when no connections exist", () => {
    (useGraphData as Mock).mockReturnValue({
      nodes: [{ id: "note-1", title: "Note 1", linkCount: 0 }],
      edges: [],
      outOfScopeEdges: [],
      isLoading: false,
      error: null,
    });

    render(<GraphView />);

    expect(screen.getByText(/pas encore de connexions/i)).toBeInTheDocument();
  });

  it("displays the graph when nodes and edges exist", () => {
    (useGraphData as Mock).mockReturnValue({
      nodes: [
        { id: "note-1", title: "Note 1", linkCount: 1 },
        { id: "note-2", title: "Note 2", linkCount: 1 },
      ],
      edges: [{ source: "note-1", target: "note-2" }],
      outOfScopeEdges: [],
      isLoading: false,
      error: null,
    });

    render(<GraphView />);

    expect(screen.getByTestId("force-graph-mock")).toBeInTheDocument();
    expect(screen.getByTestId("node-count")).toHaveTextContent("2");
    expect(screen.getByTestId("edge-count")).toHaveTextContent("1");
  });

  it("navigates to note when node is clicked", () => {
    (useGraphData as Mock).mockReturnValue({
      nodes: [
        { id: "note-1", title: "Note 1", linkCount: 1 },
        { id: "note-2", title: "Note 2", linkCount: 1 },
      ],
      edges: [{ source: "note-1", target: "note-2" }],
      outOfScopeEdges: [],
      isLoading: false,
      error: null,
    });

    render(<GraphView />);

    fireEvent.click(screen.getByTestId("node-note-1"));

    expect(mockPush).toHaveBeenCalledWith("/notes/note-1");
  });

  it("accepts highlightedNoteId prop", () => {
    (useGraphData as Mock).mockReturnValue({
      nodes: [
        { id: "note-1", title: "Note 1", linkCount: 1 },
        { id: "note-2", title: "Note 2", linkCount: 1 },
      ],
      edges: [{ source: "note-1", target: "note-2" }],
      outOfScopeEdges: [],
      isLoading: false,
      error: null,
    });

    // Should render without errors with highlightedNoteId
    const { container } = render(<GraphView highlightedNoteId="note-1" />);
    expect(container).toBeTruthy();
  });

  it("reads highlightId from URL search params", () => {
    mockGet.mockReturnValue("note-2");

    (useGraphData as Mock).mockReturnValue({
      nodes: [
        { id: "note-1", title: "Note 1", linkCount: 1 },
        { id: "note-2", title: "Note 2", linkCount: 1 },
      ],
      edges: [{ source: "note-1", target: "note-2" }],
      outOfScopeEdges: [],
      isLoading: false,
      error: null,
    });

    render(<GraphView />);

    expect(mockGet).toHaveBeenCalledWith("highlightId");
  });

  it("shows note count and connection count in empty state", () => {
    (useGraphData as Mock).mockReturnValue({
      nodes: [
        { id: "note-1", title: "Note 1", linkCount: 0 },
        { id: "note-2", title: "Note 2", linkCount: 0 },
      ],
      edges: [],
      outOfScopeEdges: [],
      isLoading: false,
      error: null,
    });

    render(<GraphView />);

    // Should show "2 notes · 0 connexions" in empty state
    expect(screen.getByText(/2 notes/i)).toBeInTheDocument();
    expect(screen.getByText(/0 connexions/i)).toBeInTheDocument();
  });

  it("handles error state gracefully", () => {
    (useGraphData as Mock).mockReturnValue({
      nodes: [],
      edges: [],
      outOfScopeEdges: [],
      isLoading: false,
      error: new Error("Failed to load"),
    });

    render(<GraphView />);

    // Should show empty state on error (fallback behavior)
    expect(screen.getByText(/pas encore de connexions/i)).toBeInTheDocument();
  });

  it("updates cursor on node hover", () => {
    (useGraphData as Mock).mockReturnValue({
      nodes: [
        { id: "note-1", title: "Note 1", linkCount: 1 },
        { id: "note-2", title: "Note 2", linkCount: 1 },
      ],
      edges: [{ source: "note-1", target: "note-2" }],
      outOfScopeEdges: [],
      isLoading: false,
      error: null,
    });

    render(<GraphView />);

    // Hover on node
    fireEvent.mouseEnter(screen.getByTestId("node-note-1"));
    expect(document.body.style.cursor).toBe("pointer");

    // Leave node
    fireEvent.mouseLeave(screen.getByTestId("node-note-1"));
    expect(document.body.style.cursor).toBe("default");
  });

  // Story 6.9: Out-of-scope edge tests
  it("passes folderId to useGraphData hook", () => {
    (useGraphData as Mock).mockReturnValue({
      nodes: [{ id: "note-1", title: "Note 1", linkCount: 1 }],
      edges: [],
      outOfScopeEdges: [],
      isLoading: false,
      error: null,
    });

    render(<GraphView folderId="folder-123" />);

    expect(useGraphData).toHaveBeenCalledWith("folder-123");
  });

  it("combines edges and outOfScopeEdges in graph data", () => {
    (useGraphData as Mock).mockReturnValue({
      nodes: [
        { id: "note-1", title: "Note 1", linkCount: 2 },
        { id: "note-2", title: "Note 2", linkCount: 1 },
        { id: "note-3", title: "Note 3 (out of scope)", linkCount: 1 },
      ],
      edges: [{ source: "note-1", target: "note-2" }],
      outOfScopeEdges: [{ source: "note-1", target: "note-3" }],
      isLoading: false,
      error: null,
    });

    render(<GraphView folderId="folder-123" />);

    // Total edges should be 2 (1 in-scope + 1 out-of-scope)
    expect(screen.getByTestId("edge-count")).toHaveTextContent("2");
  });

  it("renders with null folderId (global view)", () => {
    (useGraphData as Mock).mockReturnValue({
      nodes: [
        { id: "note-1", title: "Note 1", linkCount: 1 },
        { id: "note-2", title: "Note 2", linkCount: 1 },
      ],
      edges: [{ source: "note-1", target: "note-2" }],
      outOfScopeEdges: [],
      isLoading: false,
      error: null,
    });

    render(<GraphView folderId={null} />);

    // Should call useGraphData with undefined (converted from null)
    expect(useGraphData).toHaveBeenCalledWith(undefined);
    expect(screen.getByTestId("force-graph-mock")).toBeInTheDocument();
  });
});

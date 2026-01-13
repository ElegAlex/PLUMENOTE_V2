/**
 * Tests for GraphScopeFilter component
 *
 * @see Story 6.9: Scope de la Vue Graphe
 * @see AC: #1 - Filtrer par dossier
 * @see AC: #3 - Supprimer le filtre pour revenir à la vue globale
 * @see AC: #5 - Badge indiquant le filtre actif
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { GraphScopeFilter } from "./GraphScopeFilter";

// Mock scrollIntoView for jsdom (required for Radix Select)
Element.prototype.scrollIntoView = vi.fn();

// Mock useFolders hook
const mockFolders = [
  { id: "folder-1", name: "Documentation", _count: { notes: 5 } },
  { id: "folder-2", name: "Projets", _count: { notes: 3 } },
  { id: "folder-3", name: "Personnel", _count: { notes: 2 } },
];

vi.mock("@/features/notes/hooks/useFolders", () => ({
  useFolders: vi.fn(() => ({
    folders: mockFolders,
    isLoading: false,
    error: null,
  })),
}));

import { useFolders } from "@/features/notes/hooks/useFolders";
import type { Mock } from "vitest";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("GraphScopeFilter", () => {
  const mockOnFolderChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset useFolders mock to default state
    (useFolders as Mock).mockReturnValue({
      folders: mockFolders,
      isLoading: false,
      error: null,
    });
  });

  it("renders select with folder list", () => {
    render(
      <GraphScopeFilter
        selectedFolderId={null}
        onFolderChange={mockOnFolderChange}
      />,
      { wrapper: createWrapper() }
    );

    // Should have a select/combobox
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
  });

  it("calls onFolderChange when a folder is selected", async () => {
    render(
      <GraphScopeFilter
        selectedFolderId={null}
        onFolderChange={mockOnFolderChange}
      />,
      { wrapper: createWrapper() }
    );

    // Open the select
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    // Select a folder (Radix Select renders options with role="option")
    const folderOption = await screen.findByRole("option", { name: "Documentation" });
    fireEvent.click(folderOption);

    expect(mockOnFolderChange).toHaveBeenCalledWith("folder-1");
  });

  it("displays badge when filter is active", () => {
    render(
      <GraphScopeFilter
        selectedFolderId="folder-1"
        onFolderChange={mockOnFolderChange}
      />,
      { wrapper: createWrapper() }
    );

    // Badge should exist with clear button
    const clearButton = screen.getByRole("button", { name: /supprimer le filtre/i });
    expect(clearButton).toBeInTheDocument();
    // Badge contains the folder name (there may be multiple "Documentation" texts - in select and badge)
    expect(screen.getAllByText("Documentation").length).toBeGreaterThanOrEqual(1);
  });

  it("clears filter when badge clear button is clicked", () => {
    render(
      <GraphScopeFilter
        selectedFolderId="folder-1"
        onFolderChange={mockOnFolderChange}
      />,
      { wrapper: createWrapper() }
    );

    // Click the clear button
    const clearButton = screen.getByRole("button", { name: /supprimer le filtre/i });
    fireEvent.click(clearButton);

    expect(mockOnFolderChange).toHaveBeenCalledWith(null);
  });

  it("calls onFolderChange with null when 'all' is selected", async () => {
    render(
      <GraphScopeFilter
        selectedFolderId="folder-1"
        onFolderChange={mockOnFolderChange}
      />,
      { wrapper: createWrapper() }
    );

    // Open the select
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    // Select "Toutes les notes" (Radix Select renders options with role="option")
    const allOption = await screen.findByRole("option", { name: "Toutes les notes" });
    fireEvent.click(allOption);

    expect(mockOnFolderChange).toHaveBeenCalledWith(null);
  });

  it("shows loading state when folders are loading", () => {
    (useFolders as Mock).mockReturnValue({
      folders: [],
      isLoading: true,
      error: null,
    });

    render(
      <GraphScopeFilter
        selectedFolderId={null}
        onFolderChange={mockOnFolderChange}
      />,
      { wrapper: createWrapper() }
    );

    // Select should be disabled when loading
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("data-disabled");
  });

  it("has accessible aria-labels", () => {
    render(
      <GraphScopeFilter
        selectedFolderId="folder-1"
        onFolderChange={mockOnFolderChange}
      />,
      { wrapper: createWrapper() }
    );

    // Clear button should have aria-label
    const clearButton = screen.getByRole("button", { name: /supprimer le filtre/i });
    expect(clearButton).toBeInTheDocument();
  });
});

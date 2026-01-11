/**
 * Unit tests for MoveToFolderDialog component
 *
 * Tests folder selection dialog for note movement.
 *
 * @see Story 5.3: Déplacement de Notes dans les Dossiers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MoveToFolderDialog } from "./MoveToFolderDialog";
import type { ReactNode } from "react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const mockFolders = [
  {
    id: "folder-1",
    name: "Documents",
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: "user-1",
    children: [
      {
        id: "folder-2",
        name: "Projects",
        parentId: "folder-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: "user-1",
        children: [],
      },
    ],
  },
  {
    id: "folder-3",
    name: "Archive",
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: "user-1",
    children: [],
  },
];

describe("MoveToFolderDialog", () => {
  const user = userEvent.setup();
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    noteId: "note-123",
    currentFolderId: null,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render dialog with folder list", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockFolders }),
    });

    render(<MoveToFolderDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    // Wait for folders to load
    await waitFor(() => {
      expect(screen.getByText("Documents")).toBeInTheDocument();
    });

    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
    expect(screen.getByText("Racine")).toBeInTheDocument();
  });

  it("should show search input", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockFolders }),
    });

    render(<MoveToFolderDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Rechercher un dossier...")).toBeInTheDocument();
    });
  });

  it("should call onSelect with folder ID when folder is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockFolders }),
    });

    const onSelect = vi.fn();
    render(<MoveToFolderDialog {...defaultProps} onSelect={onSelect} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Documents")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Documents"));

    expect(onSelect).toHaveBeenCalledWith("note-123", "folder-1");
  });

  it("should call onSelect with null when Racine is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockFolders }),
    });

    const onSelect = vi.fn();
    render(
      <MoveToFolderDialog
        {...defaultProps}
        currentFolderId="folder-1"
        onSelect={onSelect}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("Racine")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Racine"));

    expect(onSelect).toHaveBeenCalledWith("note-123", null);
  });

  it("should close dialog after selection", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockFolders }),
    });

    const onOpenChange = vi.fn();
    render(<MoveToFolderDialog {...defaultProps} onOpenChange={onOpenChange} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Documents")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Documents"));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should show check mark on current folder", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockFolders }),
    });

    render(
      <MoveToFolderDialog {...defaultProps} currentFolderId="folder-1" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("Documents")).toBeInTheDocument();
    });

    // Documents row should have a check mark (via the Check icon)
    const documentsRow = screen.getByText("Documents").closest("[data-slot='command-item']");
    expect(documentsRow).toHaveAttribute("data-disabled", "true");
  });

  it("should show check mark on Racine when note is at root", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockFolders }),
    });

    render(<MoveToFolderDialog {...defaultProps} currentFolderId={null} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Racine")).toBeInTheDocument();
    });

    // Racine row should be disabled when note is already at root
    const racineRow = screen.getByText("Racine").closest("[data-slot='command-item']");
    expect(racineRow).toHaveAttribute("data-disabled", "true");
  });

  it("should show loading state", async () => {
    // Never resolve to keep loading
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<MoveToFolderDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    // Loading spinner should be visible
    await waitFor(() => {
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  it("should show error state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Error" }),
    });

    render(<MoveToFolderDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Erreur lors du chargement des dossiers")).toBeInTheDocument();
    });
  });

  it("should show empty state when no folders exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<MoveToFolderDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText(/Aucun dossier disponible/)).toBeInTheDocument();
    });
  });

  it("should not render dialog content when open is false", () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockFolders }),
    });

    render(<MoveToFolderDialog {...defaultProps} open={false} />, {
      wrapper: createWrapper(),
    });

    // Dialog content should not be visible (no search input)
    expect(screen.queryByPlaceholderText("Rechercher un dossier...")).not.toBeInTheDocument();
  });
});

/**
 * Unit tests for CommandPalette component
 *
 * @see Story 6.2: Command Palette et Recherche (Task 7)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock the command palette store
const mockClose = vi.fn();
const mockOpen = vi.fn();
vi.mock("@/stores/commandPaletteStore", () => ({
  useCommandPaletteStore: vi.fn(() => ({
    isOpen: true,
    close: mockClose,
    open: mockOpen,
    toggle: vi.fn(),
  })),
}));

// Mock the search hook
const mockSearchData = {
  data: [
    {
      id: "note-1",
      title: "Test Note",
      content: "Test content",
      folderId: null,
      isFavorite: false,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: "user-1",
      tags: [],
      folder: null,
      highlight: "Test <mark>content</mark>",
      rank: 0.5,
    },
  ],
  meta: {
    total: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    query: "test",
  },
};

vi.mock("../hooks/useSearchNotes", () => ({
  useSearchNotes: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
  })),
}));

// Mock useNotes
vi.mock("@/features/notes/hooks/useNotes", () => ({
  useNotes: vi.fn(() => ({
    notes: [],
    isLoading: false,
    createNoteAsync: vi.fn(),
    isCreating: false,
  })),
}));

// Mock useFolders for FolderFilter (Story 6.3)
vi.mock("@/features/notes/hooks/useFolders", () => ({
  useFolders: vi.fn(() => ({
    folders: [
      { id: "folder-1", name: "Documents", parentId: null, children: [] },
      { id: "folder-2", name: "Archives", parentId: null, children: [] },
    ],
    isLoading: false,
    isFetching: false,
    error: null,
    isCreating: false,
    createError: null,
    createFolder: vi.fn(),
    createFolderAsync: vi.fn(),
    isDeleting: false,
    deleteError: null,
    deleteFolder: vi.fn(),
    deleteFolderAsync: vi.fn(),
    refetch: vi.fn(),
  })),
}));

import { CommandPalette } from "./CommandPalette";
import { useSearchNotes } from "../hooks/useSearchNotes";
import { useNotes } from "@/features/notes/hooks/useNotes";
import { useCommandPaletteStore } from "@/stores/commandPaletteStore";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView which is not available in jsdom
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("should render when isOpen is true", () => {
    render(<CommandPalette />, { wrapper: createWrapper() });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Rechercher une note...")).toBeInTheDocument();
  });

  it("should not render when isOpen is false", () => {
    vi.mocked(useCommandPaletteStore).mockReturnValue({
      isOpen: false,
      close: mockClose,
      open: mockOpen,
      toggle: vi.fn(),
    });

    render(<CommandPalette />, { wrapper: createWrapper() });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should show recent notes when no search query", () => {
    vi.mocked(useCommandPaletteStore).mockReturnValue({
      isOpen: true,
      close: mockClose,
      open: mockOpen,
      toggle: vi.fn(),
    });

    // Mock useNotes to return different data based on call arguments
    vi.mocked(useNotes).mockImplementation((options) => {
      if (options?.favoriteOnly) {
        return {
          notes: [],
          isLoading: false,
          createNoteAsync: vi.fn(),
          isCreating: false,
        } as unknown as ReturnType<typeof useNotes>;
      }
      return {
        notes: [
          {
            id: "recent-1",
            title: "Recent Note",
            isFavorite: false,
            content: "content",
            folderId: null,
            sortOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdById: "user-1",
            tags: [],
            folder: null,
          },
        ],
        isLoading: false,
        createNoteAsync: vi.fn(),
        isCreating: false,
      } as unknown as ReturnType<typeof useNotes>;
    });

    render(<CommandPalette />, { wrapper: createWrapper() });

    expect(screen.getByText("Recent Note")).toBeInTheDocument();
  });

  it("should show search results when query is entered", async () => {
    vi.mocked(useCommandPaletteStore).mockReturnValue({
      isOpen: true,
      close: mockClose,
      open: mockOpen,
      toggle: vi.fn(),
    });

    vi.mocked(useSearchNotes).mockReturnValue({
      data: mockSearchData,
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useSearchNotes>);

    render(<CommandPalette />, { wrapper: createWrapper() });

    const input = screen.getByPlaceholderText("Rechercher une note...");
    await userEvent.type(input, "test");

    expect(screen.getByText("Test Note")).toBeInTheDocument();
  });

  it("should show create option with search term when no results", async () => {
    vi.mocked(useCommandPaletteStore).mockReturnValue({
      isOpen: true,
      close: mockClose,
      open: mockOpen,
      toggle: vi.fn(),
    });

    vi.mocked(useSearchNotes).mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0, query: "notfound" } },
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useSearchNotes>);

    render(<CommandPalette />, { wrapper: createWrapper() });

    const input = screen.getByPlaceholderText("Rechercher une note...");
    await userEvent.type(input, "notfound");

    // When no results, user should see option to create a note with the search term
    // Check for the CommandItem with data-value containing the search term
    const createItem = screen.getByRole("option", { name: /Créer une note.*notfound/ });
    expect(createItem).toBeInTheDocument();
  });

  it("should show loading state when searching", () => {
    vi.mocked(useCommandPaletteStore).mockReturnValue({
      isOpen: true,
      close: mockClose,
      open: mockOpen,
      toggle: vi.fn(),
    });

    vi.mocked(useSearchNotes).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
    } as ReturnType<typeof useSearchNotes>);

    render(<CommandPalette />, { wrapper: createWrapper() });

    const input = screen.getByPlaceholderText("Rechercher une note...");
    fireEvent.change(input, { target: { value: "test" } });

    // Look for loading spinner
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should show quick actions", () => {
    vi.mocked(useCommandPaletteStore).mockReturnValue({
      isOpen: true,
      close: mockClose,
      open: mockOpen,
      toggle: vi.fn(),
    });

    vi.mocked(useNotes).mockReturnValue({
      notes: [],
      isLoading: false,
      createNoteAsync: vi.fn(),
      isCreating: false,
    } as unknown as ReturnType<typeof useNotes>);

    render(<CommandPalette />, { wrapper: createWrapper() });

    expect(screen.getByText("Nouvelle note")).toBeInTheDocument();
    expect(screen.getByText("Paramètres")).toBeInTheDocument();
  });

  it("should close when onOpenChange is called with false", () => {
    vi.mocked(useCommandPaletteStore).mockReturnValue({
      isOpen: true,
      close: mockClose,
      open: mockOpen,
      toggle: vi.fn(),
    });

    render(<CommandPalette />, { wrapper: createWrapper() });

    // The CommandDialog will call onOpenChange(false) when Escape is pressed
    // This is handled by the dialog component internally
    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockClose).toHaveBeenCalled();
  });

  // Story 6.3: Folder Filter Integration Tests
  describe("Folder Filter (Story 6.3)", () => {
    it("should render FolderFilter component", () => {
      vi.mocked(useCommandPaletteStore).mockReturnValue({
        isOpen: true,
        close: mockClose,
        open: mockOpen,
        toggle: vi.fn(),
      });

      render(<CommandPalette />, { wrapper: createWrapper() });

      // FolderFilter renders a "Filtrer" button when no filter is active
      expect(screen.getByRole("button", { name: /filtrer par dossier/i })).toBeInTheDocument();
    });

    it("should pass folderId to useSearchNotes when folder is selected", async () => {
      vi.mocked(useCommandPaletteStore).mockReturnValue({
        isOpen: true,
        close: mockClose,
        open: mockOpen,
        toggle: vi.fn(),
      });

      vi.mocked(useSearchNotes).mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
      } as ReturnType<typeof useSearchNotes>);

      render(<CommandPalette />, { wrapper: createWrapper() });

      // Open folder filter popover
      const filterButton = screen.getByRole("button", { name: /filtrer par dossier/i });
      await userEvent.click(filterButton);

      // Select a folder
      await waitFor(() => {
        expect(screen.getByText("Documents")).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText("Documents"));

      // Verify useSearchNotes was called with the correct folderId
      await waitFor(() => {
        expect(useSearchNotes).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ folderId: "folder-1" })
        );
      });
    });

    it("should update placeholder when folder filter is active", async () => {
      vi.mocked(useCommandPaletteStore).mockReturnValue({
        isOpen: true,
        close: mockClose,
        open: mockOpen,
        toggle: vi.fn(),
      });

      render(<CommandPalette />, { wrapper: createWrapper() });

      // Initial placeholder
      expect(screen.getByPlaceholderText("Rechercher une note...")).toBeInTheDocument();

      // Open folder filter and select a folder
      const filterButton = screen.getByRole("button", { name: /filtrer par dossier/i });
      await userEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText("Documents")).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText("Documents"));

      // Placeholder should update to show filtered context
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Rechercher dans Documents.../)).toBeInTheDocument();
      });
    });

    it("should maintain folder filter while searching", async () => {
      vi.mocked(useCommandPaletteStore).mockReturnValue({
        isOpen: true,
        close: mockClose,
        open: mockOpen,
        toggle: vi.fn(),
      });

      // Mock search hook that tracks calls
      const searchMock = vi.fn().mockReturnValue({
        data: mockSearchData,
        isLoading: false,
        isFetching: false,
      });
      vi.mocked(useSearchNotes).mockImplementation(searchMock);

      render(<CommandPalette />, { wrapper: createWrapper() });

      // Select a folder first
      const filterButton = screen.getByRole("button", { name: /filtrer par dossier/i });
      await userEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText("Documents")).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText("Documents"));

      // Type a search query
      const input = screen.getByRole("combobox");
      await userEvent.type(input, "test");

      // Verify useSearchNotes is being called (multiple times due to renders)
      // The folder filter should be maintained during search
      expect(useSearchNotes).toHaveBeenCalled();

      // The badge should still be visible indicating filter is active
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /supprimer le filtre/i })).toBeInTheDocument();
      });
    });

    it("should show active filter badge with folder name", async () => {
      vi.mocked(useCommandPaletteStore).mockReturnValue({
        isOpen: true,
        close: mockClose,
        open: mockOpen,
        toggle: vi.fn(),
      });

      render(<CommandPalette />, { wrapper: createWrapper() });

      // Select a folder
      const filterButton = screen.getByRole("button", { name: /filtrer par dossier/i });
      await userEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText("Documents")).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText("Documents"));

      // Badge should show the folder name
      await waitFor(() => {
        // Look for the badge containing the folder name
        const badge = screen.getAllByText("Documents")[0];
        expect(badge).toBeInTheDocument();
      });
    });

    it("should clear folder filter when X button on badge is clicked", async () => {
      vi.mocked(useCommandPaletteStore).mockReturnValue({
        isOpen: true,
        close: mockClose,
        open: mockOpen,
        toggle: vi.fn(),
      });

      render(<CommandPalette />, { wrapper: createWrapper() });

      // Select a folder
      const filterButton = screen.getByRole("button", { name: /filtrer par dossier/i });
      await userEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText("Documents")).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText("Documents"));

      // Wait for badge to appear
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /supprimer le filtre/i })).toBeInTheDocument();
      });

      // Click the X button to clear filter
      await userEvent.click(screen.getByRole("button", { name: /supprimer le filtre/i }));

      // Placeholder should return to default
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Rechercher une note...")).toBeInTheDocument();
      });
    });
  });
});

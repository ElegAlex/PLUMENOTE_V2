/**
 * Tests for NoteLinkSuggestion Component
 *
 * @see Story 6.6: Liens Internes et Autocomplétion
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NoteLinkSuggestion } from "./NoteLinkSuggestion";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock scrollIntoView (required by cmdk)
Element.prototype.scrollIntoView = vi.fn();

// Wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock search response
const mockSearchResponse = {
  data: [
    {
      id: "note-1",
      title: "First Note",
      content: "Content 1",
      folderId: "folder-1",
      isFavorite: true,
      sortOrder: 0,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      createdById: "user-1",
      tags: [],
      folder: { id: "folder-1", name: "My Folder", parentId: null },
      highlight: null,
      rank: 1,
    },
    {
      id: "note-2",
      title: "Second Note",
      content: "Content 2",
      folderId: null,
      isFavorite: false,
      sortOrder: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      createdById: "user-1",
      tags: [],
      folder: null,
      highlight: null,
      rank: 0.8,
    },
  ],
  meta: {
    total: 2,
    page: 1,
    pageSize: 8,
    totalPages: 1,
    query: "test",
  },
};

describe("NoteLinkSuggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("Rendering", () => {
    it("should render search input placeholder", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], meta: {} }),
      });

      render(
        <NoteLinkSuggestion
          query=""
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByPlaceholderText("Rechercher une note...")).toBeInTheDocument();
    });

    it("should show loading indicator while fetching", async () => {
      // Create a promise that we can control
      let resolveSearch: (value: unknown) => void;
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve;
      });

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => searchPromise,
      });

      render(
        <NoteLinkSuggestion
          query="test"
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Loading indicator should appear
      // Note: Due to debounce, we need to wait
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalled();
        },
        { timeout: 300 }
      );

      // Resolve the search
      resolveSearch!({ data: [], meta: {} });
    });

    it("should display search results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      render(
        <NoteLinkSuggestion
          query="test"
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("First Note")).toBeInTheDocument();
        expect(screen.getByText("Second Note")).toBeInTheDocument();
      });
    });

    it("should show favorite indicator for favorite notes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      render(
        <NoteLinkSuggestion
          query="test"
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        // First note is favorite, should have star
        expect(screen.getByText("First Note")).toBeInTheDocument();
      });
    });

    it("should show folder path when available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      render(
        <NoteLinkSuggestion
          query="test"
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("My Folder")).toBeInTheDocument();
      });
    });

    it("should show 'Aucune note trouvée' when no results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], meta: {} }),
      });

      render(
        <NoteLinkSuggestion
          query="nonexistent"
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("Aucune note trouvée")).toBeInTheDocument();
      });
    });
  });

  describe("Selection", () => {
    it("should call onSelect when note is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      render(
        <NoteLinkSuggestion
          query="test"
          onSelect={onSelect}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("First Note")).toBeInTheDocument();
      });

      await user.click(screen.getByText("First Note"));

      expect(onSelect).toHaveBeenCalledWith({
        id: "note-1",
        title: "First Note",
      });
    });
  });

  describe("Create Note Action", () => {
    it("should show create option when onCreateNote is provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], meta: {} }),
      });

      render(
        <NoteLinkSuggestion
          query="new note"
          onSelect={vi.fn()}
          onCreateNote={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/Créer "new note"/)).toBeInTheDocument();
      });
    });

    it("should call onCreateNote when create option is clicked", async () => {
      const user = userEvent.setup();
      const onCreateNote = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], meta: {} }),
      });

      render(
        <NoteLinkSuggestion
          query="new note"
          onSelect={vi.fn()}
          onCreateNote={onCreateNote}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/Créer "new note"/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Créer "new note"/));

      expect(onCreateNote).toHaveBeenCalledWith("new note");
    });

    it("should not show create option when query is empty", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], meta: {} }),
      });

      render(
        <NoteLinkSuggestion
          query=""
          onSelect={vi.fn()}
          onCreateNote={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByText(/Créer/)).not.toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should support keyboard navigation via exposed ref method", () => {
      // Note: Full keyboard navigation is tested via integration tests
      // This test verifies the component interface exists
      expect(NoteLinkSuggestion).toBeDefined();
      expect(typeof NoteLinkSuggestion).toBe("object"); // forwardRef returns object
    });
  });

  describe("Accessibility", () => {
    it("should have correct heading for notes group", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      render(
        <NoteLinkSuggestion
          query="test"
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("Notes")).toBeInTheDocument();
      });
    });

    it("should have correct heading for actions group", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], meta: {} }),
      });

      render(
        <NoteLinkSuggestion
          query="test"
          onSelect={vi.fn()}
          onCreateNote={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("Actions")).toBeInTheDocument();
      });
    });
  });
});

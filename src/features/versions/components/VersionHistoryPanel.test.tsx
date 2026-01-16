/**
 * Tests for VersionHistoryPanel component
 *
 * @see Story 9.2: Affichage de l'Historique des Versions
 * @see AC: #1 - Panneau latéral avec liste des versions
 * @see AC: #7 - Pagination avec "Charger plus"
 * @see AC: #8 - Skeleton loaders pendant le chargement
 * @see AC: #9 - Message vide si aucune version
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import type { NoteVersionSummary } from "../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.matchMedia for responsive behavior
const mockMatchMedia = vi.fn();
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: mockMatchMedia,
});

/**
 * Create a wrapper with React Query provider
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

/**
 * Mock version data factory
 */
function createMockVersion(
  overrides: Partial<NoteVersionSummary> = {}
): NoteVersionSummary {
  return {
    id: "version-1",
    version: 1,
    title: "Test Note",
    createdAt: new Date("2026-01-16T10:00:00Z"),
    noteId: "note-1",
    createdById: "user-1",
    createdBy: { name: "Test User", image: null },
    ...overrides,
  };
}

/**
 * Setup matchMedia mock for desktop
 */
function setupDesktopView() {
  mockMatchMedia.mockImplementation((query: string) => ({
    matches: false, // Not mobile
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/**
 * Setup matchMedia mock for mobile
 */
function setupMobileView() {
  mockMatchMedia.mockImplementation((query: string) => ({
    matches: query.includes("max-width: 639px"), // Mobile
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("VersionHistoryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDesktopView();
  });

  describe("rendering", () => {
    it("should not render content when closed", () => {
      const onOpenChange = vi.fn();

      render(
        <VersionHistoryPanel
          noteId="note-1"
          open={false}
          onOpenChange={onOpenChange}
        />,
        { wrapper: createWrapper() }
      );

      // Sheet content should not be visible when closed
      expect(
        screen.queryByText("Historique des versions")
      ).not.toBeInTheDocument();
    });

    it("should render panel title when open", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        }),
      });

      const onOpenChange = vi.fn();

      render(
        <VersionHistoryPanel
          noteId="note-1"
          open={true}
          onOpenChange={onOpenChange}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText("Historique des versions")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show skeleton loader while loading", async () => {
      // Never resolve to keep loading state
      mockFetch.mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <VersionHistoryPanel
          noteId="note-1"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Should show loading skeleton
      expect(
        screen.getByLabelText("Chargement de l'historique")
      ).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message when no versions exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        }),
      });

      render(
        <VersionHistoryPanel
          noteId="note-1"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(
          screen.getByText("Aucune version enregistrée")
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(/versions sont créées automatiquement/i)
      ).toBeInTheDocument();
    });
  });

  describe("version list", () => {
    it("should display versions when available", async () => {
      const mockVersions = [
        createMockVersion({ id: "v1", version: 2 }),
        createMockVersion({ id: "v2", version: 1 }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockVersions,
          meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
        }),
      });

      render(
        <VersionHistoryPanel
          noteId="note-1"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("v2")).toBeInTheDocument();
        expect(screen.getByText("v1")).toBeInTheDocument();
      });

      // Should show total count
      expect(screen.getByText("(2)")).toBeInTheDocument();
    });

    it("should show load more button when more pages exist", async () => {
      const mockVersions = Array.from({ length: 20 }, (_, i) =>
        createMockVersion({ id: `v${i}`, version: 20 - i })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockVersions,
          meta: { total: 50, page: 1, pageSize: 20, totalPages: 3 },
        }),
      });

      render(
        <VersionHistoryPanel
          noteId="note-1"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("Charger plus")).toBeInTheDocument();
      });
    });

    it("should not show load more button on last page", async () => {
      const mockVersions = [createMockVersion()];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockVersions,
          meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
        }),
      });

      render(
        <VersionHistoryPanel
          noteId="note-1"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("v1")).toBeInTheDocument();
      });

      expect(screen.queryByText("Charger plus")).not.toBeInTheDocument();
    });
  });

  describe("version selection", () => {
    it("should show back button and preview when version selected", async () => {
      const mockVersions = [createMockVersion({ id: "v1", version: 1 })];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockVersions,
            meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              ...mockVersions[0],
              content: "# Test Content",
            },
          }),
        });

      render(
        <VersionHistoryPanel
          noteId="note-1"
          currentContent="Current content"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Wait for version list to load
      await waitFor(() => {
        expect(screen.getByText("v1")).toBeInTheDocument();
      });

      // Click on version to select it
      fireEvent.click(screen.getByText("v1"));

      // Should show back button
      await waitFor(() => {
        expect(screen.getByText("Retour à la liste")).toBeInTheDocument();
      });

      // Description should update
      expect(
        screen.getByText("Prévisualisation de la version 1")
      ).toBeInTheDocument();
    });

    it("should return to list when back button clicked", async () => {
      const mockVersions = [createMockVersion({ id: "v1", version: 1 })];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockVersions,
            meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              ...mockVersions[0],
              content: "# Test Content",
            },
          }),
        });

      render(
        <VersionHistoryPanel
          noteId="note-1"
          currentContent="Current content"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Wait and select version
      await waitFor(() => {
        expect(screen.getByText("v1")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("v1"));

      // Wait for back button
      await waitFor(() => {
        expect(screen.getByText("Retour à la liste")).toBeInTheDocument();
      });

      // Click back button
      fireEvent.click(screen.getByText("Retour à la liste"));

      // Should return to list view
      await waitFor(() => {
        expect(
          screen.getByText("Consultez et comparez les versions de cette note")
        ).toBeInTheDocument();
      });
    });
  });

  describe("panel close behavior", () => {
    it("should call onOpenChange when closing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        }),
      });

      const onOpenChange = vi.fn();

      render(
        <VersionHistoryPanel
          noteId="note-1"
          open={true}
          onOpenChange={onOpenChange}
        />,
        { wrapper: createWrapper() }
      );

      // Find and click close button (X button in sheet)
      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("responsive behavior", () => {
    it("should render sheet when open on desktop", async () => {
      setupDesktopView();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        }),
      });

      render(
        <VersionHistoryPanel
          noteId="note-1"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Sheet title should be visible when open
      await waitFor(() => {
        expect(screen.getByText("Historique des versions")).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("should have accessible description", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        }),
      });

      render(
        <VersionHistoryPanel
          noteId="note-1"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(
          screen.getByText("Consultez et comparez les versions de cette note")
        ).toBeInTheDocument();
      });
    });
  });
});

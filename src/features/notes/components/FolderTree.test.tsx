/**
 * Tests for FolderTree component
 * @see Story 5.2: Création et Gestion des Dossiers
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { FolderTree } from "./FolderTree";
import type { FolderWithChildren } from "../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

// Test data
const mockFoldersTree: FolderWithChildren[] = [
  {
    id: "folder-1",
    name: "Work",
    parentId: null,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
    children: [
      {
        id: "folder-2",
        name: "Projects",
        parentId: "folder-1",
        createdAt: new Date("2026-01-10"),
        updatedAt: new Date("2026-01-10"),
        createdById: "user-1",
        children: [],
      },
    ],
  },
  {
    id: "folder-3",
    name: "Personal",
    parentId: null,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
    children: [],
  },
];

// Wrapper component for testing
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

describe("FolderTree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loading state", () => {
    it("should show loading skeletons while fetching", () => {
      // Don't resolve the fetch immediately
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<FolderTree />, { wrapper: createWrapper() });

      expect(screen.getByRole("tree")).toHaveAttribute("aria-busy", "true");
    });
  });

  describe("error state", () => {
    it("should show error message and retry button on fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
        json: async () => ({ detail: "Server error" }),
      });

      render(<FolderTree />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByText("Erreur lors du chargement des dossiers")
        ).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /réessayer/i })).toBeInTheDocument();
    });

    it("should retry fetch when retry button is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Error" }),
      });

      render(<FolderTree />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Erreur lors du chargement des dossiers")).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersTree }),
      });

      await userEvent.click(screen.getByRole("button", { name: /réessayer/i }));

      await waitFor(() => {
        expect(screen.getByText("Work")).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    it("should show empty message when no folders", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(<FolderTree onCreateFolder={vi.fn()} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Aucun dossier pour l'instant")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /créer un dossier/i })).toBeInTheDocument();
    });

    it("should call onCreateFolder when create button is clicked in empty state", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const onCreateFolder = vi.fn();
      render(<FolderTree onCreateFolder={onCreateFolder} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Aucun dossier pour l'instant")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: /créer un dossier/i }));

      expect(onCreateFolder).toHaveBeenCalledWith(null);
    });
  });

  describe("folder display", () => {
    it("should display folders after loading", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersTree }),
      });

      render(<FolderTree />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Work")).toBeInTheDocument();
      });

      expect(screen.getByText("Personal")).toBeInTheDocument();
    });

    it("should show header with create button", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersTree }),
      });

      render(<FolderTree onCreateFolder={vi.fn()} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Dossiers")).toBeInTheDocument();
      });

      expect(screen.getByLabelText("Nouveau dossier")).toBeInTheDocument();
    });
  });

  describe("folder selection", () => {
    it("should call onSelectFolder when folder is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersTree }),
      });

      const onSelectFolder = vi.fn();
      render(<FolderTree onSelectFolder={onSelectFolder} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("Work")).toBeInTheDocument();
      });

      const workFolder = screen.getByText("Work").closest('[role="treeitem"]');
      if (workFolder) {
        await userEvent.click(workFolder);
      }

      expect(onSelectFolder).toHaveBeenCalledWith("folder-1");
    });
  });

  describe("expand/collapse", () => {
    it("should persist expanded state to localStorage", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersTree }),
      });

      render(<FolderTree />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Work")).toBeInTheDocument();
      });

      // Expand folder (get the first visible expand button)
      const expandButtons = screen.getAllByLabelText("Développer");
      await userEvent.click(expandButtons[0]);

      // Check localStorage was updated
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "plumenote:expanded-folders",
        expect.stringContaining("folder-1")
      );
    });

    it("should restore expanded state from localStorage", async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(["folder-1"]));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersTree }),
      });

      render(<FolderTree />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Work")).toBeInTheDocument();
      });

      // Children should be visible since folder-1 was expanded
      expect(screen.getByText("Projects")).toBeInTheDocument();
    });
  });

  describe("create folder", () => {
    it("should call onCreateFolder with null for root folder", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersTree }),
      });

      const onCreateFolder = vi.fn();
      render(<FolderTree onCreateFolder={onCreateFolder} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("Work")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByLabelText("Nouveau dossier"));

      expect(onCreateFolder).toHaveBeenCalledWith(null);
    });
  });

  describe("delete folder", () => {
    it("should call onDeleteFolder when delete is requested", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersTree }),
      });

      const onDeleteFolder = vi.fn();
      render(<FolderTree onDeleteFolder={onDeleteFolder} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("Work")).toBeInTheDocument();
      });

      // Open dropdown menu for Work folder
      const actionButtons = screen.getAllByLabelText("Actions du dossier");
      await userEvent.click(actionButtons[0]);

      // Click delete
      await userEvent.click(screen.getByText("Supprimer"));

      expect(onDeleteFolder).toHaveBeenCalledWith("folder-1");
    });
  });

  describe("accessibility", () => {
    it("should have tree role", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFoldersTree }),
      });

      render(<FolderTree />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Work")).toBeInTheDocument();
      });

      expect(screen.getByRole("tree", { name: "Dossiers" })).toBeInTheDocument();
    });
  });
});

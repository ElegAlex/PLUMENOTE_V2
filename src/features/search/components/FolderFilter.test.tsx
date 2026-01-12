/**
 * FolderFilter Component Tests
 *
 * @see Story 6.3: Filtrage des Résultats (Task 5.1)
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FolderFilter } from "./FolderFilter";

// Mock scrollIntoView for cmdk
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock useFolders hook
vi.mock("@/features/notes/hooks/useFolders", () => ({
  useFolders: vi.fn(),
}));

// Import mock to control it
import { useFolders } from "@/features/notes/hooks/useFolders";
const mockUseFolders = vi.mocked(useFolders);

// Mock folder data
const mockFolders = [
  {
    id: "folder-1",
    name: "Documents",
    parentId: null,
    children: [
      {
        id: "folder-1-1",
        name: "Travail",
        parentId: "folder-1",
        children: [],
      },
    ],
  },
  {
    id: "folder-2",
    name: "Archives",
    parentId: null,
    children: [],
  },
];

describe("FolderFilter", () => {
  const defaultProps = {
    selectedFolderId: null,
    selectedFolderName: null,
    onFolderSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFolders.mockReturnValue({
      folders: mockFolders,
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
    });
  });

  describe("Rendering", () => {
    it("renders filter button when no folder selected", () => {
      render(<FolderFilter {...defaultProps} />);

      expect(screen.getByRole("button", { name: /filtrer par dossier/i })).toBeInTheDocument();
      expect(screen.getByText("Filtrer")).toBeInTheDocument();
    });

    it("renders badge with folder name when folder selected", () => {
      render(
        <FolderFilter
          {...defaultProps}
          selectedFolderId="folder-1"
          selectedFolderName="Documents"
        />
      );

      expect(screen.getByText("Documents")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /supprimer le filtre/i })).toBeInTheDocument();
    });

    it("renders filter button without text when folder selected", () => {
      render(
        <FolderFilter
          {...defaultProps}
          selectedFolderId="folder-1"
          selectedFolderName="Documents"
        />
      );

      // Button should exist but not show "Filtrer" text
      expect(screen.getByRole("button", { name: /modifier le filtre/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /filtrer$/i })).not.toBeInTheDocument();
    });
  });

  describe("Popover Interaction", () => {
    it("opens popover when filter button is clicked", async () => {
      const user = userEvent.setup();
      render(<FolderFilter {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /filtrer par dossier/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/rechercher un dossier/i)).toBeInTheDocument();
      });
    });

    it("shows folders list in popover", async () => {
      const user = userEvent.setup();
      render(<FolderFilter {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /filtrer par dossier/i }));

      await waitFor(() => {
        expect(screen.getByText("Documents")).toBeInTheDocument();
        expect(screen.getByText("Travail")).toBeInTheDocument();
        expect(screen.getByText("Archives")).toBeInTheDocument();
      });
    });

    it("shows 'All folders' option", async () => {
      const user = userEvent.setup();
      render(<FolderFilter {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /filtrer par dossier/i }));

      await waitFor(() => {
        expect(screen.getByText("Tous les dossiers")).toBeInTheDocument();
      });
    });

    it("shows loading state", async () => {
      mockUseFolders.mockReturnValue({
        folders: [],
        isLoading: true,
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
      });

      const user = userEvent.setup();
      render(<FolderFilter {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /filtrer par dossier/i }));

      // Check for loading status using accessible role
      await waitFor(() => {
        expect(screen.getByRole("status", { name: /chargement des dossiers/i })).toBeInTheDocument();
      });
    });
  });

  describe("Folder Selection", () => {
    it("calls onFolderSelect when folder is clicked", async () => {
      const user = userEvent.setup();
      const onFolderSelect = vi.fn();
      render(<FolderFilter {...defaultProps} onFolderSelect={onFolderSelect} />);

      await user.click(screen.getByRole("button", { name: /filtrer par dossier/i }));

      await waitFor(() => {
        expect(screen.getByText("Documents")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Documents"));

      expect(onFolderSelect).toHaveBeenCalledWith("folder-1", "Documents");
    });

    it("calls onFolderSelect with null when 'All folders' is clicked", async () => {
      const user = userEvent.setup();
      const onFolderSelect = vi.fn();
      render(
        <FolderFilter
          {...defaultProps}
          selectedFolderId="folder-1"
          selectedFolderName="Documents"
          onFolderSelect={onFolderSelect}
        />
      );

      await user.click(screen.getByRole("button", { name: /modifier le filtre/i }));

      await waitFor(() => {
        expect(screen.getByText("Tous les dossiers")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Tous les dossiers"));

      expect(onFolderSelect).toHaveBeenCalledWith(null, null);
    });

    it("closes popover after selection", async () => {
      const user = userEvent.setup();
      render(<FolderFilter {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /filtrer par dossier/i }));

      await waitFor(() => {
        expect(screen.getByText("Documents")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Documents"));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/rechercher un dossier/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Clear Filter", () => {
    it("calls onFolderSelect with null when X button is clicked", async () => {
      const user = userEvent.setup();
      const onFolderSelect = vi.fn();
      render(
        <FolderFilter
          {...defaultProps}
          selectedFolderId="folder-1"
          selectedFolderName="Documents"
          onFolderSelect={onFolderSelect}
        />
      );

      await user.click(screen.getByRole("button", { name: /supprimer le filtre/i }));

      expect(onFolderSelect).toHaveBeenCalledWith(null, null);
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels on filter button", () => {
      render(<FolderFilter {...defaultProps} />);

      expect(screen.getByRole("button", { name: /filtrer par dossier/i })).toBeInTheDocument();
    });

    it("has proper ARIA labels on clear button when filter active", () => {
      render(
        <FolderFilter
          {...defaultProps}
          selectedFolderId="folder-1"
          selectedFolderName="Documents"
        />
      );

      expect(screen.getByRole("button", { name: /supprimer le filtre/i })).toBeInTheDocument();
    });

    it("has proper ARIA label on filter button when filter active", () => {
      render(
        <FolderFilter
          {...defaultProps}
          selectedFolderId="folder-1"
          selectedFolderName="Documents"
        />
      );

      expect(screen.getByRole("button", { name: /modifier le filtre/i })).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("shows message when no folders exist", async () => {
      mockUseFolders.mockReturnValue({
        folders: [],
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
      });

      const user = userEvent.setup();
      render(<FolderFilter {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /filtrer par dossier/i }));

      await waitFor(() => {
        expect(screen.getByText("Aucun dossier disponible")).toBeInTheDocument();
      });
    });
  });
});

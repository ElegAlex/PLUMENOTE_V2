/**
 * Tests for FolderTreeItem component
 * @see Story 5.2: Création et Gestion des Dossiers
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { FolderTreeItem } from "./FolderTreeItem";
import type { FolderWithChildren } from "../types";

// Test data
const mockFolder: FolderWithChildren = {
  id: "folder-1",
  name: "Work",
  parentId: null,
  createdAt: new Date("2026-01-10"),
  updatedAt: new Date("2026-01-10"),
  createdById: "user-1",
  children: [],
};

const mockFolderWithChildren: FolderWithChildren = {
  ...mockFolder,
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
};

describe("FolderTreeItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render folder name", () => {
      render(<FolderTreeItem folder={mockFolder} />);
      expect(screen.getByText("Work")).toBeInTheDocument();
    });

    it("should render folder icon", () => {
      render(<FolderTreeItem folder={mockFolder} />);
      expect(screen.getByRole("treeitem")).toBeInTheDocument();
    });

    it("should apply selected styles when isSelected is true", () => {
      render(<FolderTreeItem folder={mockFolder} isSelected />);
      const item = screen.getByRole("treeitem");
      expect(item).toHaveClass("bg-accent");
    });

    it("should apply disabled styles when isDeleting is true", () => {
      render(<FolderTreeItem folder={mockFolder} isDeleting />);
      const item = screen.getByRole("treeitem");
      expect(item).toHaveClass("opacity-50", "pointer-events-none");
    });
  });

  describe("expand/collapse", () => {
    it("should show chevron for folders with children", () => {
      render(<FolderTreeItem folder={mockFolderWithChildren} />);
      // Chevron should be visible
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should hide chevron for folders without children", () => {
      render(<FolderTreeItem folder={mockFolder} />);
      // Chevron button should be invisible - query by button type within the treeitem
      const treeitem = screen.getByRole("treeitem");
      const chevronButton = treeitem.querySelector('button[aria-hidden="true"]');
      // Button exists with invisible class
      expect(chevronButton).not.toBeNull();
      expect(chevronButton).toHaveClass("invisible");
    });

    it("should call onExpand when chevron is clicked", async () => {
      const onExpand = vi.fn();
      render(
        <FolderTreeItem folder={mockFolderWithChildren} onExpand={onExpand} />
      );

      const expandButton = screen.getByLabelText("Développer");
      await userEvent.click(expandButton);

      expect(onExpand).toHaveBeenCalledWith("folder-1");
    });

    it("should render children when expanded", () => {
      render(<FolderTreeItem folder={mockFolderWithChildren} isExpanded />);
      expect(screen.getByText("Projects")).toBeInTheDocument();
    });

    it("should not render children when collapsed", () => {
      render(
        <FolderTreeItem folder={mockFolderWithChildren} isExpanded={false} />
      );
      expect(screen.queryByText("Projects")).not.toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("should call onSelect when folder is clicked", async () => {
      const onSelect = vi.fn();
      render(<FolderTreeItem folder={mockFolder} onSelect={onSelect} />);

      const item = screen.getByRole("treeitem");
      await userEvent.click(item);

      expect(onSelect).toHaveBeenCalledWith("folder-1");
    });

    it("should set aria-selected when selected", () => {
      render(<FolderTreeItem folder={mockFolder} isSelected />);
      const item = screen.getByRole("treeitem");
      expect(item).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("inline rename", () => {
    it("should enter edit mode on double click when onRename is provided", async () => {
      const onRename = vi.fn();
      render(<FolderTreeItem folder={mockFolder} onRename={onRename} />);

      const item = screen.getByRole("treeitem");
      await userEvent.dblClick(item);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should not enter edit mode on double click when onRename is not provided", async () => {
      render(<FolderTreeItem folder={mockFolder} />);

      const item = screen.getByRole("treeitem");
      await userEvent.dblClick(item);

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("should call onRename when Enter is pressed in edit mode", async () => {
      const onRename = vi.fn();
      render(<FolderTreeItem folder={mockFolder} onRename={onRename} />);

      const item = screen.getByRole("treeitem");
      await userEvent.dblClick(item);

      const input = screen.getByRole("textbox");
      await userEvent.clear(input);
      await userEvent.type(input, "New Name{Enter}");

      expect(onRename).toHaveBeenCalledWith("folder-1", "New Name");
    });

    it("should cancel rename when Escape is pressed", async () => {
      const onRename = vi.fn();
      render(<FolderTreeItem folder={mockFolder} onRename={onRename} />);

      const item = screen.getByRole("treeitem");
      await userEvent.dblClick(item);

      const input = screen.getByRole("textbox");
      await userEvent.clear(input);
      await userEvent.type(input, "New Name{Escape}");

      expect(onRename).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("should not call onRename if name is unchanged", async () => {
      const onRename = vi.fn();
      render(<FolderTreeItem folder={mockFolder} onRename={onRename} />);

      const item = screen.getByRole("treeitem");
      await userEvent.dblClick(item);

      const input = screen.getByRole("textbox");
      fireEvent.blur(input);

      expect(onRename).not.toHaveBeenCalled();
    });
  });

  describe("context menu", () => {
    it("should show context menu button on hover", () => {
      render(<FolderTreeItem folder={mockFolder} onDelete={vi.fn()} />);
      const menuButton = screen.getByLabelText("Actions du dossier");
      expect(menuButton).toBeInTheDocument();
    });

    it("should show create subfolder option when onCreateSubfolder is provided", async () => {
      render(
        <FolderTreeItem folder={mockFolder} onCreateSubfolder={vi.fn()} />
      );

      const menuButton = screen.getByLabelText("Actions du dossier");
      await userEvent.click(menuButton);

      expect(screen.getByText("Nouveau sous-dossier")).toBeInTheDocument();
    });

    it("should show rename option when onRename is provided", async () => {
      render(<FolderTreeItem folder={mockFolder} onRename={vi.fn()} />);

      const menuButton = screen.getByLabelText("Actions du dossier");
      await userEvent.click(menuButton);

      expect(screen.getByText("Renommer")).toBeInTheDocument();
    });

    it("should show delete option when onDelete is provided", async () => {
      render(<FolderTreeItem folder={mockFolder} onDelete={vi.fn()} />);

      const menuButton = screen.getByLabelText("Actions du dossier");
      await userEvent.click(menuButton);

      expect(screen.getByText("Supprimer")).toBeInTheDocument();
    });

    it("should call onCreateSubfolder when clicked", async () => {
      const onCreateSubfolder = vi.fn();
      render(
        <FolderTreeItem
          folder={mockFolder}
          onCreateSubfolder={onCreateSubfolder}
        />
      );

      const menuButton = screen.getByLabelText("Actions du dossier");
      await userEvent.click(menuButton);
      await userEvent.click(screen.getByText("Nouveau sous-dossier"));

      expect(onCreateSubfolder).toHaveBeenCalledWith("folder-1");
    });

    it("should call onDelete when delete is clicked", async () => {
      const onDelete = vi.fn();
      render(<FolderTreeItem folder={mockFolder} onDelete={onDelete} />);

      const menuButton = screen.getByLabelText("Actions du dossier");
      await userEvent.click(menuButton);
      await userEvent.click(screen.getByText("Supprimer"));

      expect(onDelete).toHaveBeenCalledWith("folder-1");
    });
  });

  describe("keyboard navigation", () => {
    it("should call onSelect when Enter is pressed", async () => {
      const onSelect = vi.fn();
      render(<FolderTreeItem folder={mockFolder} onSelect={onSelect} />);

      const item = screen.getByRole("treeitem");
      item.focus();
      await userEvent.keyboard("{Enter}");

      expect(onSelect).toHaveBeenCalledWith("folder-1");
    });

    it("should call onExpand when ArrowRight is pressed on collapsed folder", async () => {
      const onExpand = vi.fn();
      render(
        <FolderTreeItem
          folder={mockFolderWithChildren}
          onExpand={onExpand}
          isExpanded={false}
        />
      );

      const item = screen.getByRole("treeitem");
      item.focus();
      await userEvent.keyboard("{ArrowRight}");

      expect(onExpand).toHaveBeenCalledWith("folder-1");
    });

    it("should call onExpand when ArrowLeft is pressed on expanded folder", async () => {
      const onExpand = vi.fn();
      render(
        <FolderTreeItem
          folder={mockFolderWithChildren}
          onExpand={onExpand}
          isExpanded
        />
      );

      // Get the first (parent) treeitem
      const items = screen.getAllByRole("treeitem");
      const parentItem = items[0];
      parentItem.focus();
      await userEvent.keyboard("{ArrowLeft}");

      expect(onExpand).toHaveBeenCalledWith("folder-1");
    });

    it("should enter edit mode when F2 is pressed", async () => {
      const onRename = vi.fn();
      render(<FolderTreeItem folder={mockFolder} onRename={onRename} />);

      const item = screen.getByRole("treeitem");
      item.focus();
      await userEvent.keyboard("{F2}");

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should call onDelete when Delete is pressed", async () => {
      const onDelete = vi.fn();
      render(<FolderTreeItem folder={mockFolder} onDelete={onDelete} />);

      const item = screen.getByRole("treeitem");
      item.focus();
      await userEvent.keyboard("{Delete}");

      expect(onDelete).toHaveBeenCalledWith("folder-1");
    });
  });

  describe("accessibility", () => {
    it("should have correct ARIA attributes", () => {
      render(<FolderTreeItem folder={mockFolderWithChildren} isExpanded />);
      // Get the first (parent) treeitem
      const items = screen.getAllByRole("treeitem");
      const parentItem = items[0];

      expect(parentItem).toHaveAttribute("aria-expanded", "true");
      expect(parentItem).toHaveAttribute("aria-label", "Work");
    });

    it("should be focusable", () => {
      render(<FolderTreeItem folder={mockFolder} />);
      const item = screen.getByRole("treeitem");
      expect(item).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("depth indentation", () => {
    it("should increase padding based on depth", () => {
      const { rerender } = render(<FolderTreeItem folder={mockFolder} depth={0} />);
      const item0 = screen.getByRole("treeitem");
      expect(item0.style.paddingLeft).toBe("8px");

      rerender(<FolderTreeItem folder={mockFolder} depth={1} />);
      const item1 = screen.getByRole("treeitem");
      expect(item1.style.paddingLeft).toBe("24px");

      rerender(<FolderTreeItem folder={mockFolder} depth={2} />);
      const item2 = screen.getByRole("treeitem");
      expect(item2.style.paddingLeft).toBe("40px");
    });
  });
});

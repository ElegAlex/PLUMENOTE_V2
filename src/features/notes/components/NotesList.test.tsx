/**
 * Unit tests for NotesList component
 *
 * Tests grid display, loading state, and empty state.
 *
 * @see Story 3.3: Liste des Notes
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotesList } from "./NotesList";
import type { Note } from "../types";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const mockNotes: Note[] = [
  {
    id: "note-1",
    title: "First Note",
    content: "<p>Content of first note</p>",
    userId: "user-1",
    createdAt: new Date("2024-01-15T10:00:00Z"),
    updatedAt: new Date("2024-01-15T12:00:00Z"),
  },
  {
    id: "note-2",
    title: "Second Note",
    content: "<p>Content of second note</p>",
    userId: "user-1",
    createdAt: new Date("2024-01-14T10:00:00Z"),
    updatedAt: new Date("2024-01-14T12:00:00Z"),
  },
  {
    id: "note-3",
    title: "Third Note",
    content: null,
    userId: "user-1",
    createdAt: new Date("2024-01-13T10:00:00Z"),
    updatedAt: new Date("2024-01-13T12:00:00Z"),
  },
];

describe("NotesList", () => {
  describe("rendering notes", () => {
    it("should render all notes", () => {
      render(<NotesList notes={mockNotes} />);

      expect(screen.getByText("First Note")).toBeInTheDocument();
      expect(screen.getByText("Second Note")).toBeInTheDocument();
      expect(screen.getByText("Third Note")).toBeInTheDocument();
    });

    it("should render notes in a grid", () => {
      const { container } = render(<NotesList notes={mockNotes} />);

      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <NotesList notes={mockNotes} className="custom-grid" />
      );

      const grid = container.querySelector(".custom-grid");
      expect(grid).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should render skeletons when loading", () => {
      const { container } = render(<NotesList notes={[]} isLoading={true} />);

      // Should render skeleton elements
      const skeletons = container.querySelectorAll("[class*='animate-pulse']");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should not render notes when loading", () => {
      render(<NotesList notes={mockNotes} isLoading={true} />);

      expect(screen.queryByText("First Note")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should render empty state when no notes", () => {
      render(<NotesList notes={[]} />);

      expect(screen.getByText("Aucune note")).toBeInTheDocument();
      expect(
        screen.getByText(/Vous n'avez pas encore cree de note/)
      ).toBeInTheDocument();
    });

    it("should render create button in empty state", async () => {
      const onCreate = vi.fn();
      const user = userEvent.setup();

      render(<NotesList notes={[]} onCreate={onCreate} />);

      const createButton = screen.getByRole("button", {
        name: /creer une note/i,
      });
      expect(createButton).toBeInTheDocument();

      await user.click(createButton);
      expect(onCreate).toHaveBeenCalled();
    });

    it("should not render create button if onCreate not provided", () => {
      render(<NotesList notes={[]} />);

      expect(
        screen.queryByRole("button", { name: /creer une note/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("should render error state when error is provided", () => {
      const error = new Error("Failed to load notes");
      render(<NotesList notes={[]} error={error} />);

      expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
      expect(screen.getByText("Failed to load notes")).toBeInTheDocument();
    });

    it("should render retry button in error state", async () => {
      const error = new Error("Network error");
      const onRetry = vi.fn();
      const user = userEvent.setup();

      render(<NotesList notes={[]} error={error} onRetry={onRetry} />);

      const retryButton = screen.getByRole("button", { name: /reessayer/i });
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });

    it("should not render retry button if onRetry not provided", () => {
      const error = new Error("Network error");
      render(<NotesList notes={[]} error={error} />);

      expect(
        screen.queryByRole("button", { name: /reessayer/i })
      ).not.toBeInTheDocument();
    });

    it("should prioritize loading over error", () => {
      const error = new Error("Error");
      const { container } = render(
        <NotesList notes={[]} isLoading={true} error={error} />
      );

      // Should show loading, not error
      const skeletons = container.querySelectorAll("[class*='animate-pulse']");
      expect(skeletons.length).toBeGreaterThan(0);
      expect(screen.queryByText("Erreur de chargement")).not.toBeInTheDocument();
    });
  });

  describe("delete functionality", () => {
    it("should pass onDelete to NoteCard", async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();

      render(<NotesList notes={mockNotes} onDelete={onDelete} />);

      // Open first note's dropdown
      const menuTriggers = screen.getAllByRole("button", {
        name: /actions pour la note/i,
      });
      await user.click(menuTriggers[0]);

      // Click delete
      const deleteButton = screen.getByText("Supprimer");
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith("note-1");
    });

    it("should mark correct note as deleting", () => {
      const { container } = render(
        <NotesList notes={mockNotes} deletingId="note-2" />
      );

      // The second card should have opacity-50
      const cards = container.querySelectorAll("[class*='group relative']");
      expect(cards[1]).toHaveClass("opacity-50");
    });
  });
});

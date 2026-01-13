/**
 * Unit tests for NoteCard component
 *
 * Tests display, actions, and accessibility features.
 *
 * @see Story 3.3: Liste des Notes
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteCard } from "./NoteCard";
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

const mockNote: Note = {
  id: "note-123",
  title: "Test Note Title",
  content: "<p>This is the note content with some text.</p>",
  userId: "user-1",
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-01-15T12:00:00Z"),
};

const mockNoteWithTags: Note = {
  ...mockNote,
  tags: [
    { id: "tag-1", name: "work", color: "#3b82f6" },
    { id: "tag-2", name: "urgent", color: "#ef4444" },
  ],
};

const mockNoteWithManyTags: Note = {
  ...mockNote,
  tags: [
    { id: "tag-1", name: "work", color: "#3b82f6" },
    { id: "tag-2", name: "urgent", color: "#ef4444" },
    { id: "tag-3", name: "personal", color: "#22c55e" },
    { id: "tag-4", name: "review", color: "#f59e0b" },
    { id: "tag-5", name: "pending", color: "#8b5cf6" },
  ],
};

describe("NoteCard", () => {
  describe("rendering", () => {
    it("should render note title", () => {
      render(<NoteCard note={mockNote} />);

      expect(screen.getByText("Test Note Title")).toBeInTheDocument();
    });

    it("should render 'Sans titre' for notes without title", () => {
      const noteWithoutTitle = { ...mockNote, title: null };
      render(<NoteCard note={noteWithoutTitle} />);

      expect(screen.getByText("Sans titre")).toBeInTheDocument();
    });

    it("should render content preview without HTML tags", () => {
      render(<NoteCard note={mockNote} />);

      expect(
        screen.getByText("This is the note content with some text.")
      ).toBeInTheDocument();
    });

    it("should render 'Aucun contenu' for empty content", () => {
      const noteWithoutContent = { ...mockNote, content: null };
      render(<NoteCard note={noteWithoutContent} />);

      expect(screen.getByText("Aucun contenu")).toBeInTheDocument();
    });

    it("should truncate long content preview", () => {
      const longContent =
        "<p>" +
        "A".repeat(200) +
        "</p>";
      const noteWithLongContent = { ...mockNote, content: longContent };
      render(<NoteCard note={noteWithLongContent} />);

      const preview = screen.getByText(/^A+\.\.\.$/);
      expect(preview).toBeInTheDocument();
    });

    it("should render relative date", () => {
      render(<NoteCard note={mockNote} />);

      // Should contain "Modifié" prefix
      expect(screen.getByText(/Modifié/)).toBeInTheDocument();
    });

    it("should link to note edit page", () => {
      render(<NoteCard note={mockNote} />);

      const links = screen.getAllByRole("link");
      const noteLink = links.find((link) =>
        link.getAttribute("href")?.includes("/notes/note-123")
      );
      expect(noteLink).toBeInTheDocument();
    });
  });

  describe("actions menu", () => {
    it("should render actions menu trigger", () => {
      render(<NoteCard note={mockNote} />);

      expect(
        screen.getByRole("button", { name: /actions pour la note/i })
      ).toBeInTheDocument();
    });

    it("should call onDelete when delete is clicked", async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();

      render(<NoteCard note={mockNote} onDelete={onDelete} />);

      // Open dropdown menu
      const menuTrigger = screen.getByRole("button", {
        name: /actions pour la note/i,
      });
      await user.click(menuTrigger);

      // Click delete
      const deleteButton = screen.getByText("Supprimer");
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith("note-123");
    });

    it("should not render delete option when onDelete is not provided", async () => {
      const user = userEvent.setup();

      render(<NoteCard note={mockNote} />);

      // Open dropdown menu
      const menuTrigger = screen.getByRole("button", {
        name: /actions pour la note/i,
      });
      await user.click(menuTrigger);

      expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
    });
  });

  describe("deleting state", () => {
    it("should apply opacity when isDeleting is true", () => {
      const { container } = render(
        <NoteCard note={mockNote} isDeleting={true} />
      );

      const card = container.querySelector("[class*='opacity-50']");
      expect(card).toBeInTheDocument();
    });

    it("should disable pointer events when isDeleting is true", () => {
      const { container } = render(
        <NoteCard note={mockNote} isDeleting={true} />
      );

      const card = container.querySelector("[class*='pointer-events-none']");
      expect(card).toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <NoteCard note={mockNote} className="custom-class" />
      );

      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });
  });

  describe("tags display", () => {
    it("should not render tags section when note has no tags", () => {
      render(<NoteCard note={mockNote} />);

      // No tag chips should be rendered
      expect(screen.queryByText("work")).not.toBeInTheDocument();
      expect(screen.queryByText("urgent")).not.toBeInTheDocument();
    });

    it("should render all tags when note has 3 or fewer tags", () => {
      render(<NoteCard note={mockNoteWithTags} />);

      expect(screen.getByText("work")).toBeInTheDocument();
      expect(screen.getByText("urgent")).toBeInTheDocument();
    });

    it("should render only first 3 tags and +N indicator when note has more than 3 tags", () => {
      render(<NoteCard note={mockNoteWithManyTags} />);

      // First 3 tags should be visible
      expect(screen.getByText("work")).toBeInTheDocument();
      expect(screen.getByText("urgent")).toBeInTheDocument();
      expect(screen.getByText("personal")).toBeInTheDocument();

      // 4th and 5th tags should NOT be visible
      expect(screen.queryByText("review")).not.toBeInTheDocument();
      expect(screen.queryByText("pending")).not.toBeInTheDocument();

      // Should show +2 indicator
      expect(screen.getByText("+2")).toBeInTheDocument();
    });

    it("should render tags in compact variant", () => {
      const { container } = render(<NoteCard note={mockNoteWithTags} />);

      // Tags should use compact styling (text-[10px])
      const tagChips = container.querySelectorAll(".text-\\[10px\\]");
      expect(tagChips.length).toBeGreaterThan(0);
    });

    it("should not render remove buttons on tags in card view", () => {
      render(<NoteCard note={mockNoteWithTags} />);

      // No remove buttons should be present (tags are read-only in card)
      const removeButtons = screen.queryAllByLabelText(/supprimer le tag/i);
      expect(removeButtons).toHaveLength(0);
    });
  });

  describe("move to folder action (Story 5.3)", () => {
    it("should render 'Déplacer vers...' menu item when onMoveToFolder is provided", async () => {
      const onMoveToFolder = vi.fn();
      const user = userEvent.setup();

      render(<NoteCard note={mockNote} onMoveToFolder={onMoveToFolder} />);

      // Open dropdown menu
      const menuTrigger = screen.getByRole("button", {
        name: /actions pour la note/i,
      });
      await user.click(menuTrigger);

      expect(screen.getByText("Déplacer vers...")).toBeInTheDocument();
    });

    it("should call onMoveToFolder when 'Déplacer vers...' is clicked", async () => {
      const onMoveToFolder = vi.fn();
      const user = userEvent.setup();

      render(<NoteCard note={mockNote} onMoveToFolder={onMoveToFolder} />);

      // Open dropdown menu
      const menuTrigger = screen.getByRole("button", {
        name: /actions pour la note/i,
      });
      await user.click(menuTrigger);

      // Click "Déplacer vers..."
      const moveButton = screen.getByText("Déplacer vers...");
      await user.click(moveButton);

      expect(onMoveToFolder).toHaveBeenCalledWith("note-123");
    });

    it("should not render 'Déplacer vers...' when onMoveToFolder is not provided", async () => {
      const user = userEvent.setup();

      render(<NoteCard note={mockNote} />);

      // Open dropdown menu
      const menuTrigger = screen.getByRole("button", {
        name: /actions pour la note/i,
      });
      await user.click(menuTrigger);

      expect(screen.queryByText("Déplacer vers...")).not.toBeInTheDocument();
    });
  });

  describe("drag and drop (Story 5.3)", () => {
    it("should be draggable when draggable prop is true", () => {
      const { container } = render(<NoteCard note={mockNote} draggable={true} />);

      const card = container.querySelector("[draggable='true']");
      expect(card).toBeInTheDocument();
    });

    it("should not be draggable by default", () => {
      const { container } = render(<NoteCard note={mockNote} />);

      const card = container.querySelector("[draggable='true']");
      expect(card).not.toBeInTheDocument();
    });

    it("should have cursor-grab class when draggable", () => {
      const { container } = render(<NoteCard note={mockNote} draggable={true} />);

      const card = container.querySelector("[class*='cursor-grab']");
      expect(card).toBeInTheDocument();
    });

    it("should set note ID in dataTransfer on drag start", () => {
      const { container } = render(<NoteCard note={mockNote} draggable={true} />);

      const card = container.querySelector("[draggable='true']");
      expect(card).toBeInTheDocument();

      // Create mock dataTransfer
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: "",
      };

      // Simulate drag start
      const dragStartEvent = new Event("dragstart", { bubbles: true });
      Object.defineProperty(dragStartEvent, "dataTransfer", {
        value: dataTransfer,
        writable: true,
      });

      card?.dispatchEvent(dragStartEvent);

      expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "note-123");
      expect(dataTransfer.setData).toHaveBeenCalledWith("application/x-note-id", "note-123");
      expect(dataTransfer.effectAllowed).toBe("move");
    });
  });

  describe("favorite toggle (Story 6.5)", () => {
    const mockFavoriteNote: Note = {
      ...mockNote,
      isFavorite: true,
    };

    it("should render favorite button when onToggleFavorite is provided", () => {
      const onToggleFavorite = vi.fn();
      render(<NoteCard note={mockNote} onToggleFavorite={onToggleFavorite} />);

      const favoriteButton = screen.getByRole("button", {
        name: /ajouter aux favoris/i,
      });
      expect(favoriteButton).toBeInTheDocument();
    });

    it("should not render favorite button when onToggleFavorite is not provided", () => {
      render(<NoteCard note={mockNote} />);

      const favoriteButton = screen.queryByRole("button", {
        name: /ajouter aux favoris/i,
      });
      expect(favoriteButton).not.toBeInTheDocument();
    });

    it("should display filled star when note is favorite", () => {
      const onToggleFavorite = vi.fn();
      const { container } = render(
        <NoteCard note={mockFavoriteNote} onToggleFavorite={onToggleFavorite} />
      );

      const favoriteButton = screen.getByRole("button", {
        name: /retirer des favoris/i,
      });
      expect(favoriteButton).toBeInTheDocument();
      expect(favoriteButton).toHaveClass("text-yellow-500");

      // Check for filled star (fill-current class on the icon)
      const starIcon = container.querySelector("svg.fill-current");
      expect(starIcon).toBeInTheDocument();
    });

    it("should display empty star when note is not favorite", () => {
      const onToggleFavorite = vi.fn();
      const { container } = render(
        <NoteCard note={mockNote} onToggleFavorite={onToggleFavorite} />
      );

      const favoriteButton = screen.getByRole("button", {
        name: /ajouter aux favoris/i,
      });
      expect(favoriteButton).toBeInTheDocument();

      // Check that star is not filled
      const filledStarIcon = container.querySelector("svg.fill-current");
      expect(filledStarIcon).not.toBeInTheDocument();
    });

    it("should call onToggleFavorite when favorite button is clicked", async () => {
      const onToggleFavorite = vi.fn();
      const user = userEvent.setup();

      render(<NoteCard note={mockNote} onToggleFavorite={onToggleFavorite} />);

      const favoriteButton = screen.getByRole("button", {
        name: /ajouter aux favoris/i,
      });
      await user.click(favoriteButton);

      expect(onToggleFavorite).toHaveBeenCalledWith("note-123");
    });

    it("should show correct aria-label for non-favorite note", () => {
      const onToggleFavorite = vi.fn();
      render(<NoteCard note={mockNote} onToggleFavorite={onToggleFavorite} />);

      expect(
        screen.getByRole("button", { name: "Ajouter aux favoris" })
      ).toBeInTheDocument();
    });

    it("should show correct aria-label for favorite note", () => {
      const onToggleFavorite = vi.fn();
      render(
        <NoteCard note={mockFavoriteNote} onToggleFavorite={onToggleFavorite} />
      );

      expect(
        screen.getByRole("button", { name: "Retirer des favoris" })
      ).toBeInTheDocument();
    });

    it("should be disabled when isTogglingFavorite is true", () => {
      const onToggleFavorite = vi.fn();
      render(
        <NoteCard
          note={mockNote}
          onToggleFavorite={onToggleFavorite}
          isTogglingFavorite={true}
        />
      );

      const favoriteButton = screen.getByRole("button", {
        name: /ajouter aux favoris/i,
      });
      expect(favoriteButton).toBeDisabled();
    });

    it("should highlight card with yellow ring when note is favorite", () => {
      const onToggleFavorite = vi.fn();
      const { container } = render(
        <NoteCard note={mockFavoriteNote} onToggleFavorite={onToggleFavorite} />
      );

      const card = container.querySelector("[class*='ring-yellow-400']");
      expect(card).toBeInTheDocument();
    });

    it("should show favorite option in dropdown menu", async () => {
      const onToggleFavorite = vi.fn();
      const user = userEvent.setup();

      render(<NoteCard note={mockNote} onToggleFavorite={onToggleFavorite} />);

      // Open dropdown menu
      const menuTrigger = screen.getByRole("button", {
        name: /actions pour la note/i,
      });
      await user.click(menuTrigger);

      expect(screen.getByText("Ajouter aux favoris")).toBeInTheDocument();
    });

    it("should show remove favorite option in dropdown for favorite notes", async () => {
      const onToggleFavorite = vi.fn();
      const user = userEvent.setup();

      render(
        <NoteCard note={mockFavoriteNote} onToggleFavorite={onToggleFavorite} />
      );

      // Open dropdown menu
      const menuTrigger = screen.getByRole("button", {
        name: /actions pour la note/i,
      });
      await user.click(menuTrigger);

      expect(screen.getByText("Retirer des favoris")).toBeInTheDocument();
    });

    it("should call onToggleFavorite when dropdown favorite option is clicked", async () => {
      const onToggleFavorite = vi.fn();
      const user = userEvent.setup();

      render(<NoteCard note={mockNote} onToggleFavorite={onToggleFavorite} />);

      // Open dropdown menu
      const menuTrigger = screen.getByRole("button", {
        name: /actions pour la note/i,
      });
      await user.click(menuTrigger);

      // Click favorite in dropdown
      const favoriteMenuItem = screen.getByText("Ajouter aux favoris");
      await user.click(favoriteMenuItem);

      expect(onToggleFavorite).toHaveBeenCalledWith("note-123");
    });
  });
});

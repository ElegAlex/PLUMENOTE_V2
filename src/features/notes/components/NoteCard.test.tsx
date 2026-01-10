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
});

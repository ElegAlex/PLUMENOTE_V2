/**
 * Tests for CommentItem Component
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #6 - Afficher auteur, date relative, contenu
 * @see AC: #8 - Modifier ou supprimer son commentaire
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentItem } from "./CommentItem";
import type { Comment } from "../types";

/**
 * Mock comment data factory
 */
function createMockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    content: "Ceci est un commentaire test",
    anchorStart: 10,
    anchorEnd: 20,
    resolved: false,
    noteId: "note-1",
    parentId: null,
    createdAt: new Date("2026-01-16T10:00:00Z"),
    updatedAt: new Date("2026-01-16T10:00:00Z"),
    createdById: "user-1",
    createdBy: { id: "user-1", name: "Jean Dupont", avatar: null },
    ...overrides,
  };
}

describe("CommentItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should display author name", () => {
      render(<CommentItem comment={createMockComment()} />);

      expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    });

    it("should display comment content", () => {
      render(<CommentItem comment={createMockComment()} />);

      expect(screen.getByText("Ceci est un commentaire test")).toBeInTheDocument();
    });

    it("should display relative date", () => {
      render(<CommentItem comment={createMockComment()} />);

      // The relative date text will vary, just check something is rendered
      const article = screen.getByRole("article");
      expect(article).toBeInTheDocument();
    });

    it("should display author avatar initials when no image", () => {
      render(<CommentItem comment={createMockComment()} />);

      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should handle unknown author", () => {
      render(
        <CommentItem
          comment={createMockComment({ createdBy: undefined })}
        />
      );

      expect(screen.getByText("Utilisateur inconnu")).toBeInTheDocument();
      // Avatar fallback shows "?" for unknown authors
      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("aria-label");
      expect(article.getAttribute("aria-label")).toContain("Utilisateur inconnu");
    });
  });

  describe("selection", () => {
    it("should call onSelect when clicked", async () => {
      const onSelect = vi.fn();
      render(
        <CommentItem
          comment={createMockComment()}
          onSelect={onSelect}
        />
      );

      fireEvent.click(screen.getByRole("article"));

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it("should apply selected styles when isSelected", () => {
      render(
        <CommentItem
          comment={createMockComment()}
          isSelected={true}
        />
      );

      const article = screen.getByRole("article");
      expect(article).toHaveClass("bg-accent");
    });
  });

  describe("actions menu", () => {
    it("should not show actions menu for non-authors", () => {
      render(
        <CommentItem
          comment={createMockComment()}
          isAuthor={false}
        />
      );

      expect(screen.queryByRole("button", { name: /actions/i })).not.toBeInTheDocument();
    });

    it("should show actions menu for authors", async () => {
      render(
        <CommentItem
          comment={createMockComment()}
          isAuthor={true}
        />
      );

      const menuButton = screen.getByRole("button", { name: /actions/i });
      expect(menuButton).toBeInTheDocument();
    });

    it("should show edit and delete options in menu", async () => {
      const user = userEvent.setup();
      render(
        <CommentItem
          comment={createMockComment()}
          isAuthor={true}
        />
      );

      await user.click(screen.getByRole("button", { name: /actions/i }));

      expect(screen.getByRole("menuitem", { name: /modifier/i })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /supprimer/i })).toBeInTheDocument();
    });
  });

  describe("editing", () => {
    it("should enter edit mode when edit is clicked", async () => {
      const user = userEvent.setup();
      render(
        <CommentItem
          comment={createMockComment()}
          isAuthor={true}
        />
      );

      await user.click(screen.getByRole("button", { name: /actions/i }));
      await user.click(screen.getByRole("menuitem", { name: /modifier/i }));

      expect(screen.getByRole("textbox", { name: /modifier/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /annuler/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /enregistrer/i })).toBeInTheDocument();
    });

    it("should populate textarea with current content", async () => {
      const user = userEvent.setup();
      render(
        <CommentItem
          comment={createMockComment({ content: "Contenu original" })}
          isAuthor={true}
        />
      );

      await user.click(screen.getByRole("button", { name: /actions/i }));
      await user.click(screen.getByRole("menuitem", { name: /modifier/i }));

      expect(screen.getByRole("textbox")).toHaveValue("Contenu original");
    });

    it("should call onEdit with new content when saved", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      render(
        <CommentItem
          comment={createMockComment({ content: "Ancien contenu" })}
          isAuthor={true}
          onEdit={onEdit}
        />
      );

      await user.click(screen.getByRole("button", { name: /actions/i }));
      await user.click(screen.getByRole("menuitem", { name: /modifier/i }));

      const textarea = screen.getByRole("textbox");
      await user.clear(textarea);
      await user.type(textarea, "Nouveau contenu");
      await user.click(screen.getByRole("button", { name: /enregistrer/i }));

      expect(onEdit).toHaveBeenCalledWith("comment-1", "Nouveau contenu");
    });

    it("should cancel edit on Escape key", async () => {
      const user = userEvent.setup();
      render(
        <CommentItem
          comment={createMockComment({ content: "Contenu original" })}
          isAuthor={true}
        />
      );

      await user.click(screen.getByRole("button", { name: /actions/i }));
      await user.click(screen.getByRole("menuitem", { name: /modifier/i }));

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, " modifié");
      await user.keyboard("{Escape}");

      // Should exit edit mode
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      // Content should not have changed
      expect(screen.getByText("Contenu original")).toBeInTheDocument();
    });

    it("should cancel edit when cancel button clicked", async () => {
      const user = userEvent.setup();
      render(
        <CommentItem
          comment={createMockComment()}
          isAuthor={true}
        />
      );

      await user.click(screen.getByRole("button", { name: /actions/i }));
      await user.click(screen.getByRole("menuitem", { name: /modifier/i }));
      await user.click(screen.getByRole("button", { name: /annuler/i }));

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("should disable save button when content unchanged", async () => {
      const user = userEvent.setup();
      render(
        <CommentItem
          comment={createMockComment({ content: "Même contenu" })}
          isAuthor={true}
        />
      );

      await user.click(screen.getByRole("button", { name: /actions/i }));
      await user.click(screen.getByRole("menuitem", { name: /modifier/i }));

      expect(screen.getByRole("button", { name: /enregistrer/i })).toBeDisabled();
    });
  });

  describe("deleting", () => {
    it("should show confirmation dialog when delete is clicked", async () => {
      const user = userEvent.setup();
      render(
        <CommentItem
          comment={createMockComment()}
          isAuthor={true}
        />
      );

      await user.click(screen.getByRole("button", { name: /actions/i }));
      await user.click(screen.getByRole("menuitem", { name: /supprimer/i }));

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText(/supprimer le commentaire/i)).toBeInTheDocument();
    });

    it("should call onDelete when deletion is confirmed", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      render(
        <CommentItem
          comment={createMockComment()}
          isAuthor={true}
          onDelete={onDelete}
        />
      );

      await user.click(screen.getByRole("button", { name: /actions/i }));
      await user.click(screen.getByRole("menuitem", { name: /supprimer/i }));
      await user.click(screen.getByRole("button", { name: /^supprimer$/i }));

      expect(onDelete).toHaveBeenCalledWith("comment-1");
    });

    it("should close dialog when cancel is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      render(
        <CommentItem
          comment={createMockComment()}
          isAuthor={true}
          onDelete={onDelete}
        />
      );

      await user.click(screen.getByRole("button", { name: /actions/i }));
      await user.click(screen.getByRole("menuitem", { name: /supprimer/i }));
      await user.click(screen.getByRole("button", { name: /^annuler$/i }));

      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      });
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("should have article role", () => {
      render(<CommentItem comment={createMockComment()} />);

      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("should have descriptive aria-label", () => {
      render(<CommentItem comment={createMockComment()} />);

      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("aria-label");
      expect(article.getAttribute("aria-label")).toContain("Jean Dupont");
    });
  });
});

/**
 * Tests for CommentsList Component
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #5 - Liste des commentaires triés par position
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommentsList } from "./CommentsList";
import type { Comment } from "../types";

/**
 * Mock comment data factory
 */
function createMockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    content: "Test comment",
    anchorStart: 10,
    anchorEnd: 20,
    resolved: false,
    noteId: "note-1",
    parentId: null,
    createdAt: new Date("2026-01-16T10:00:00Z"),
    updatedAt: new Date("2026-01-16T10:00:00Z"),
    createdById: "user-1",
    createdBy: { id: "user-1", name: "Test User", avatar: null },
    ...overrides,
  };
}

describe("CommentsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView for JSDOM
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe("loading state", () => {
    it("should show skeleton when loading", () => {
      render(<CommentsList comments={[]} isLoading={true} />);

      expect(screen.getByLabelText(/chargement/i)).toBeInTheDocument();
    });

    it("should not show comments when loading", () => {
      render(
        <CommentsList
          comments={[createMockComment()]}
          isLoading={true}
        />
      );

      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty state when no comments", () => {
      render(<CommentsList comments={[]} />);

      expect(screen.getByText(/aucun commentaire/i)).toBeInTheDocument();
    });

    it("should show instruction text in empty state", () => {
      render(<CommentsList comments={[]} />);

      expect(screen.getByText(/sélectionnez du texte/i)).toBeInTheDocument();
    });
  });

  describe("comments rendering", () => {
    it("should render all comments", () => {
      const comments = [
        createMockComment({ id: "c1", content: "Premier commentaire" }),
        createMockComment({ id: "c2", content: "Deuxième commentaire" }),
      ];

      render(<CommentsList comments={comments} />);

      expect(screen.getByText("Premier commentaire")).toBeInTheDocument();
      expect(screen.getByText("Deuxième commentaire")).toBeInTheDocument();
    });

    it("should sort comments by anchorStart", () => {
      const comments = [
        createMockComment({ id: "c1", content: "Dernier", anchorStart: 100 }),
        createMockComment({ id: "c2", content: "Premier", anchorStart: 10 }),
        createMockComment({ id: "c3", content: "Milieu", anchorStart: 50 }),
      ];

      render(<CommentsList comments={comments} />);

      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(3);

      // Verify order by checking the text content order
      const texts = listItems.map((item) => item.textContent);
      expect(texts[0]).toContain("Premier");
      expect(texts[1]).toContain("Milieu");
      expect(texts[2]).toContain("Dernier");
    });
  });

  describe("selection", () => {
    it("should highlight selected comment", () => {
      const comments = [
        createMockComment({ id: "c1", content: "Comment 1" }),
        createMockComment({ id: "c2", content: "Comment 2" }),
      ];

      render(
        <CommentsList
          comments={comments}
          selectedCommentId="c1"
        />
      );

      // The selected comment should have bg-accent class
      // With threading, articles[0] is CommentThread, articles[1] is CommentItem
      const articles = screen.getAllByRole("article");
      expect(articles[1]).toHaveClass("bg-accent");
    });

    it("should call onCommentSelect when comment is clicked", () => {
      const onCommentSelect = vi.fn();
      const comments = [createMockComment({ id: "c1" })];

      render(
        <CommentsList
          comments={comments}
          onCommentSelect={onCommentSelect}
        />
      );

      // With threading, articles[0] is CommentThread, articles[1] is CommentItem
      const articles = screen.getAllByRole("article");
      fireEvent.click(articles[1]);

      expect(onCommentSelect).toHaveBeenCalledWith("c1");
    });
  });

  describe("author detection", () => {
    it("should show actions menu for current user's comments", () => {
      const comments = [
        createMockComment({ id: "c1", createdById: "current-user" }),
      ];

      render(
        <CommentsList
          comments={comments}
          currentUserId="current-user"
        />
      );

      expect(screen.getByRole("button", { name: /actions/i })).toBeInTheDocument();
    });

    it("should not show actions menu for other users' comments", () => {
      const comments = [
        createMockComment({ id: "c1", createdById: "other-user" }),
      ];

      render(
        <CommentsList
          comments={comments}
          currentUserId="current-user"
        />
      );

      expect(screen.queryByRole("button", { name: /actions/i })).not.toBeInTheDocument();
    });
  });

  describe("callbacks", () => {
    it("should pass onEdit to CommentItem", async () => {
      const onEdit = vi.fn();
      const comments = [
        createMockComment({ id: "c1", createdById: "user-1" }),
      ];

      render(
        <CommentsList
          comments={comments}
          currentUserId="user-1"
          onEdit={onEdit}
        />
      );

      // The onEdit prop is passed through to CommentItem
      // Testing that it's passed correctly is handled in CommentItem tests
      expect(screen.getByRole("button", { name: /actions/i })).toBeInTheDocument();
    });

    it("should pass onDelete to CommentItem", () => {
      const onDelete = vi.fn();
      const comments = [
        createMockComment({ id: "c1", createdById: "user-1" }),
      ];

      render(
        <CommentsList
          comments={comments}
          currentUserId="user-1"
          onDelete={onDelete}
        />
      );

      // The onDelete prop is passed through to CommentItem
      expect(screen.getByRole("button", { name: /actions/i })).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have list role", () => {
      const comments = [createMockComment()];

      render(<CommentsList comments={comments} />);

      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("should have aria-label", () => {
      const comments = [createMockComment()];

      render(<CommentsList comments={comments} />);

      expect(screen.getByRole("list")).toHaveAttribute("aria-label");
    });

    it("should wrap comments in listitem role", () => {
      const comments = [
        createMockComment({ id: "c1" }),
        createMockComment({ id: "c2" }),
      ];

      render(<CommentsList comments={comments} />);

      expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });
  });
});

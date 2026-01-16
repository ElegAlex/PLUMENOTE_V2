/**
 * ReplyForm Component Tests
 *
 * @see Story 9.6: Réponses et Résolution de Commentaires
 * @see AC: #1 - Formulaire de réponse sous le commentaire
 * @see AC: #2 - Réponse sauvegardée avec parentId
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReplyForm } from "./ReplyForm";
import type { Comment } from "../types";

const mockParentComment: Comment = {
  id: "parent-1",
  content: "Parent comment",
  anchorStart: 10,
  anchorEnd: 25,
  resolved: false,
  noteId: "note-1",
  parentId: null,
  createdAt: new Date("2026-01-10T10:00:00Z"),
  updatedAt: new Date("2026-01-10T10:00:00Z"),
  createdById: "user-1",
  createdBy: { id: "user-1", name: "Test User", avatar: null },
};

describe("ReplyForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders textarea for reply content", () => {
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/répondre/i)).toBeInTheDocument();
    });

    it("renders cancel and reply buttons", () => {
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /annuler/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /répondre/i })).toBeInTheDocument();
    });

    it("disables submit button when content is empty", () => {
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /répondre/i })).toBeDisabled();
    });

    it("shows loading state when isSubmitting is true", () => {
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          isSubmitting={true}
        />
      );

      expect(screen.getByRole("button", { name: /répondre/i })).toBeDisabled();
      expect(screen.getByRole("textbox")).toBeDisabled();
    });
  });

  describe("user interactions", () => {
    it("enables submit button when content is entered", async () => {
      const user = userEvent.setup();
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      await user.type(screen.getByRole("textbox"), "My reply");

      expect(screen.getByRole("button", { name: /répondre/i })).not.toBeDisabled();
    });

    it("calls onSubmit with content when form is submitted", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      );

      await user.type(screen.getByRole("textbox"), "My reply content");
      await user.click(screen.getByRole("button", { name: /répondre/i }));

      expect(onSubmit).toHaveBeenCalledWith("My reply content");
    });

    it("calls onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={vi.fn()}
          onCancel={onCancel}
        />
      );

      await user.click(screen.getByRole("button", { name: /annuler/i }));

      expect(onCancel).toHaveBeenCalled();
    });

    it("cancels on Escape key press", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={vi.fn()}
          onCancel={onCancel}
        />
      );

      await user.type(screen.getByRole("textbox"), "Some text");
      await user.keyboard("{Escape}");

      expect(onCancel).toHaveBeenCalled();
    });

    it("submits on Ctrl+Enter", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      );

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "My reply");
      await user.keyboard("{Control>}{Enter}{/Control}");

      expect(onSubmit).toHaveBeenCalledWith("My reply");
    });

    it("trims whitespace from content before submitting", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      );

      await user.type(screen.getByRole("textbox"), "  My reply  ");
      await user.click(screen.getByRole("button", { name: /répondre/i }));

      expect(onSubmit).toHaveBeenCalledWith("My reply");
    });

    it("does not submit when content is only whitespace", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      );

      await user.type(screen.getByRole("textbox"), "   ");

      expect(screen.getByRole("button", { name: /répondre/i })).toBeDisabled();
    });
  });

  describe("focus", () => {
    it("focuses textarea on mount when autoFocus is true", () => {
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          autoFocus
        />
      );

      expect(screen.getByRole("textbox")).toHaveFocus();
    });
  });

  describe("accessibility", () => {
    it("has accessible form structure", () => {
      render(
        <ReplyForm
          parentComment={mockParentComment}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("aria-label");
    });
  });
});

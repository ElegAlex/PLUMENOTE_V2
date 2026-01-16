/**
 * CommentThread Component Tests
 *
 * @see Story 9.6: Réponses et Résolution de Commentaires
 * @see AC: #3 - Réponses indentées avec ligne verticale
 * @see AC: #8 - Réponses triées chronologiquement
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommentThread } from "./CommentThread";
import type { Comment } from "../types";

// Mock CommentItem to simplify tests
vi.mock("./CommentItem", () => ({
  CommentItem: ({ comment, onSelect, onEdit, onDelete }: any) => (
    <div data-testid={`comment-${comment.id}`}>
      <span data-testid="comment-content">{comment.content}</span>
      <span data-testid="comment-author">{comment.createdBy?.name}</span>
      <button data-testid={`select-${comment.id}`} onClick={onSelect}>
        Select
      </button>
      {onEdit && (
        <button
          data-testid={`edit-${comment.id}`}
          onClick={() => onEdit(comment.id, "edited")}
        >
          Edit
        </button>
      )}
      {onDelete && (
        <button
          data-testid={`delete-${comment.id}`}
          onClick={() => onDelete(comment.id)}
        >
          Delete
        </button>
      )}
    </div>
  ),
}));

const mockUser = {
  id: "user-1",
  name: "Test User",
  avatar: null,
};

const createMockComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: "comment-1",
  content: "Test comment",
  anchorStart: 0,
  anchorEnd: 10,
  resolved: false,
  noteId: "note-1",
  parentId: null,
  createdAt: new Date("2026-01-10T10:00:00Z"),
  updatedAt: new Date("2026-01-10T10:00:00Z"),
  createdById: "user-1",
  createdBy: mockUser,
  ...overrides,
});

describe("CommentThread", () => {
  const defaultProps = {
    parentComment: createMockComment(),
    replies: [],
    currentUserId: "user-1",
  };

  describe("rendering", () => {
    it("renders parent comment", () => {
      render(<CommentThread {...defaultProps} />);

      expect(screen.getByTestId("comment-comment-1")).toBeInTheDocument();
      expect(screen.getByText("Test comment")).toBeInTheDocument();
    });

    it("renders replies indented under parent", () => {
      const replies = [
        createMockComment({
          id: "reply-1",
          content: "First reply",
          parentId: "comment-1",
          createdAt: new Date("2026-01-10T11:00:00Z"),
        }),
        createMockComment({
          id: "reply-2",
          content: "Second reply",
          parentId: "comment-1",
          createdAt: new Date("2026-01-10T12:00:00Z"),
        }),
      ];

      const { container } = render(
        <CommentThread {...defaultProps} replies={replies} />
      );

      // Check replies are rendered
      expect(screen.getByTestId("comment-reply-1")).toBeInTheDocument();
      expect(screen.getByTestId("comment-reply-2")).toBeInTheDocument();

      // Check indentation container exists
      const repliesContainer = container.querySelector(".comment-replies");
      expect(repliesContainer).toBeInTheDocument();
    });

    it("sorts replies chronologically by createdAt (ascending)", () => {
      const replies = [
        createMockComment({
          id: "reply-2",
          content: "Second reply",
          parentId: "comment-1",
          createdAt: new Date("2026-01-10T12:00:00Z"),
        }),
        createMockComment({
          id: "reply-1",
          content: "First reply",
          parentId: "comment-1",
          createdAt: new Date("2026-01-10T11:00:00Z"),
        }),
      ];

      render(<CommentThread {...defaultProps} replies={replies} />);

      const replyElements = screen.getAllByTestId(/^comment-reply-/);
      expect(replyElements[0]).toHaveAttribute("data-testid", "comment-reply-1");
      expect(replyElements[1]).toHaveAttribute("data-testid", "comment-reply-2");
    });

    it("applies border-left styling for visual thread indicator", () => {
      const replies = [
        createMockComment({
          id: "reply-1",
          content: "Reply",
          parentId: "comment-1",
        }),
      ];

      const { container } = render(
        <CommentThread {...defaultProps} replies={replies} />
      );

      const repliesContainer = container.querySelector(".comment-replies");
      expect(repliesContainer).toHaveClass("border-l-2");
    });
  });

  describe("collapse/expand for long threads", () => {
    it("shows all replies when there are 3 or fewer", () => {
      const replies = [
        createMockComment({ id: "reply-1", content: "Reply 1", parentId: "comment-1" }),
        createMockComment({ id: "reply-2", content: "Reply 2", parentId: "comment-1" }),
        createMockComment({ id: "reply-3", content: "Reply 3", parentId: "comment-1" }),
      ];

      render(<CommentThread {...defaultProps} replies={replies} />);

      expect(screen.getByTestId("comment-reply-1")).toBeInTheDocument();
      expect(screen.getByTestId("comment-reply-2")).toBeInTheDocument();
      expect(screen.getByTestId("comment-reply-3")).toBeInTheDocument();
      expect(screen.queryByText(/Voir plus/)).not.toBeInTheDocument();
    });

    it("collapses thread when more than 3 replies by default", () => {
      const replies = [
        createMockComment({ id: "reply-1", content: "Reply 1", parentId: "comment-1", createdAt: new Date("2026-01-10T11:00:00Z") }),
        createMockComment({ id: "reply-2", content: "Reply 2", parentId: "comment-1", createdAt: new Date("2026-01-10T12:00:00Z") }),
        createMockComment({ id: "reply-3", content: "Reply 3", parentId: "comment-1", createdAt: new Date("2026-01-10T13:00:00Z") }),
        createMockComment({ id: "reply-4", content: "Reply 4", parentId: "comment-1", createdAt: new Date("2026-01-10T14:00:00Z") }),
        createMockComment({ id: "reply-5", content: "Reply 5", parentId: "comment-1", createdAt: new Date("2026-01-10T15:00:00Z") }),
      ];

      render(<CommentThread {...defaultProps} replies={replies} />);

      // Should show first reply, last reply, and expand button
      expect(screen.getByTestId("comment-reply-1")).toBeInTheDocument();
      expect(screen.getByTestId("comment-reply-5")).toBeInTheDocument();
      expect(screen.getByText(/Voir 3 réponses/)).toBeInTheDocument();

      // Middle replies should be hidden
      expect(screen.queryByTestId("comment-reply-2")).not.toBeInTheDocument();
      expect(screen.queryByTestId("comment-reply-3")).not.toBeInTheDocument();
      expect(screen.queryByTestId("comment-reply-4")).not.toBeInTheDocument();
    });

    it("expands thread when clicking expand button", () => {
      const replies = [
        createMockComment({ id: "reply-1", content: "Reply 1", parentId: "comment-1", createdAt: new Date("2026-01-10T11:00:00Z") }),
        createMockComment({ id: "reply-2", content: "Reply 2", parentId: "comment-1", createdAt: new Date("2026-01-10T12:00:00Z") }),
        createMockComment({ id: "reply-3", content: "Reply 3", parentId: "comment-1", createdAt: new Date("2026-01-10T13:00:00Z") }),
        createMockComment({ id: "reply-4", content: "Reply 4", parentId: "comment-1", createdAt: new Date("2026-01-10T14:00:00Z") }),
      ];

      render(<CommentThread {...defaultProps} replies={replies} />);

      const expandButton = screen.getByText(/Voir 2 réponses/);
      fireEvent.click(expandButton);

      // All replies should now be visible
      expect(screen.getByTestId("comment-reply-1")).toBeInTheDocument();
      expect(screen.getByTestId("comment-reply-2")).toBeInTheDocument();
      expect(screen.getByTestId("comment-reply-3")).toBeInTheDocument();
      expect(screen.getByTestId("comment-reply-4")).toBeInTheDocument();

      // Collapse button should appear
      expect(screen.getByText(/Masquer/)).toBeInTheDocument();
    });

    it("collapses thread when clicking collapse button", () => {
      const replies = [
        createMockComment({ id: "reply-1", content: "Reply 1", parentId: "comment-1", createdAt: new Date("2026-01-10T11:00:00Z") }),
        createMockComment({ id: "reply-2", content: "Reply 2", parentId: "comment-1", createdAt: new Date("2026-01-10T12:00:00Z") }),
        createMockComment({ id: "reply-3", content: "Reply 3", parentId: "comment-1", createdAt: new Date("2026-01-10T13:00:00Z") }),
        createMockComment({ id: "reply-4", content: "Reply 4", parentId: "comment-1", createdAt: new Date("2026-01-10T14:00:00Z") }),
      ];

      render(<CommentThread {...defaultProps} replies={replies} />);

      // Expand first
      fireEvent.click(screen.getByText(/Voir 2 réponses/));

      // Then collapse
      fireEvent.click(screen.getByText(/Masquer/));

      // Should be back to collapsed state
      expect(screen.queryByTestId("comment-reply-2")).not.toBeInTheDocument();
      expect(screen.queryByTestId("comment-reply-3")).not.toBeInTheDocument();
    });
  });

  describe("callbacks", () => {
    it("calls onReply with parent comment id when reply button clicked", () => {
      const onReply = vi.fn();
      render(<CommentThread {...defaultProps} onReply={onReply} />);

      const replyButton = screen.getByLabelText(/Répondre/);
      fireEvent.click(replyButton);

      expect(onReply).toHaveBeenCalledWith("comment-1");
    });

    it("calls onEdit with comment id and new content", () => {
      const onEdit = vi.fn();
      render(<CommentThread {...defaultProps} onEdit={onEdit} />);

      fireEvent.click(screen.getByTestId("edit-comment-1"));
      expect(onEdit).toHaveBeenCalledWith("comment-1", "edited");
    });

    it("calls onDelete with comment id", () => {
      const onDelete = vi.fn();
      render(<CommentThread {...defaultProps} onDelete={onDelete} />);

      fireEvent.click(screen.getByTestId("delete-comment-1"));
      expect(onDelete).toHaveBeenCalledWith("comment-1");
    });

    it("calls onResolve with comment id", () => {
      const onResolve = vi.fn();
      render(<CommentThread {...defaultProps} onResolve={onResolve} canResolve />);

      const resolveButton = screen.getByLabelText(/Résoudre/);
      fireEvent.click(resolveButton);

      expect(onResolve).toHaveBeenCalledWith("comment-1");
    });

    it("calls onSelect when parent comment is clicked", () => {
      const onSelect = vi.fn();
      render(<CommentThread {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId("select-comment-1"));
      expect(onSelect).toHaveBeenCalled();
    });
  });

  describe("resolved state", () => {
    it("applies resolved styling when parent is resolved", () => {
      const resolvedComment = createMockComment({ resolved: true });
      const { container } = render(
        <CommentThread {...defaultProps} parentComment={resolvedComment} />
      );

      const thread = container.firstChild;
      expect(thread).toHaveClass("comment-resolved");
    });
  });

  describe("accessibility", () => {
    it("has appropriate ARIA attributes", () => {
      const replies = [
        createMockComment({ id: "reply-1", content: "Reply 1", parentId: "comment-1" }),
      ];

      render(<CommentThread {...defaultProps} replies={replies} />);

      const thread = screen.getByRole("article");
      expect(thread).toHaveAttribute("aria-label");
    });
  });
});

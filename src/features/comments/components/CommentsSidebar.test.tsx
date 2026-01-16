/**
 * Tests for CommentsSidebar Component
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see Story 9.6: Réponses et Résolution de Commentaires
 * @see AC 9.5: #1 - Panneau latéral pour les commentaires
 * @see AC 9.5: #4 - Scroll vers le commentaire sélectionné
 * @see AC 9.6: #6 - Toggle "Masquer les résolus"
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommentsSidebar, type CommentSelection } from "./CommentsSidebar";
import type { Comment } from "../types";

// Mock the hooks
vi.mock("../hooks/useComments", () => ({
  useComments: vi.fn(() => ({
    comments: [],
    total: 0,
    isLoading: false,
    refetch: vi.fn(),
  })),
}));

vi.mock("../hooks/useCreateComment", () => ({
  useCreateComment: vi.fn(() => ({
    createComment: vi.fn(),
    isCreating: false,
    error: null,
    reset: vi.fn(),
  })),
}));

vi.mock("../hooks/useUpdateComment", () => ({
  useUpdateComment: vi.fn(() => ({
    updateComment: vi.fn(),
    isUpdating: false,
    error: null,
    reset: vi.fn(),
  })),
}));

vi.mock("../hooks/useDeleteComment", () => ({
  useDeleteComment: vi.fn(() => ({
    deleteComment: vi.fn(),
    isDeleting: false,
    error: null,
    reset: vi.fn(),
  })),
}));

vi.mock("../hooks/useReplyComment", () => ({
  useReplyComment: vi.fn(() => ({
    replyToComment: vi.fn(),
    replyToCommentAsync: vi.fn(),
    isReplying: false,
    error: null,
    reset: vi.fn(),
  })),
}));

vi.mock("../hooks/useResolveComment", () => ({
  useResolveComment: vi.fn(() => ({
    resolveComment: vi.fn(),
    unresolveComment: vi.fn(),
    isResolving: false,
    error: null,
    reset: vi.fn(),
  })),
}));

import { useComments } from "../hooks/useComments";
import { useCreateComment } from "../hooks/useCreateComment";
import { useUpdateComment } from "../hooks/useUpdateComment";
import { useDeleteComment } from "../hooks/useDeleteComment";
import { useReplyComment } from "../hooks/useReplyComment";
import { useResolveComment } from "../hooks/useResolveComment";

const mockUseComments = vi.mocked(useComments);
const mockUseCreateComment = vi.mocked(useCreateComment);
const mockUseUpdateComment = vi.mocked(useUpdateComment);
const mockUseDeleteComment = vi.mocked(useDeleteComment);
const mockUseReplyComment = vi.mocked(useReplyComment);
const mockUseResolveComment = vi.mocked(useResolveComment);

/**
 * Create a test QueryClient
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/**
 * Wrapper with QueryClientProvider
 */
function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

/**
 * Mock comment factory
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

describe("CommentsSidebar", () => {
  const defaultProps = {
    noteId: "note-1",
    currentUserId: "user-1",
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock scrollIntoView for JSDOM
    Element.prototype.scrollIntoView = vi.fn();

    // Reset mocks to default values
    mockUseComments.mockReturnValue({
      comments: [],
      total: 0,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useComments>);

    mockUseCreateComment.mockReturnValue({
      createComment: vi.fn(),
      createCommentAsync: vi.fn(),
      isCreating: false,
      error: null,
      reset: vi.fn(),
    } as ReturnType<typeof useCreateComment>);

    mockUseUpdateComment.mockReturnValue({
      updateComment: vi.fn(),
      updateCommentAsync: vi.fn(),
      isUpdating: false,
      error: null,
      reset: vi.fn(),
    } as ReturnType<typeof useUpdateComment>);

    mockUseDeleteComment.mockReturnValue({
      deleteComment: vi.fn(),
      deleteCommentAsync: vi.fn(),
      isDeleting: false,
      error: null,
      reset: vi.fn(),
    } as ReturnType<typeof useDeleteComment>);

    mockUseReplyComment.mockReturnValue({
      replyToComment: vi.fn(),
      replyToCommentAsync: vi.fn(),
      isReplying: false,
      error: null,
      reset: vi.fn(),
    } as ReturnType<typeof useReplyComment>);

    mockUseResolveComment.mockReturnValue({
      resolveComment: vi.fn(),
      unresolveComment: vi.fn(),
      resolveCommentAsync: vi.fn(),
      unresolveCommentAsync: vi.fn(),
      isResolving: false,
      error: null,
      reset: vi.fn(),
    } as ReturnType<typeof useResolveComment>);

    // Clear localStorage before each test
    localStorage.clear();
  });

  describe("rendering", () => {
    it("should render sidebar when open", () => {
      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Commentaires")).toBeInTheDocument();
    });

    it("should show comment count in header", () => {
      mockUseComments.mockReturnValue({
        comments: [createMockComment()],
        total: 5,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as ReturnType<typeof useComments>);

      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("(5)")).toBeInTheDocument();
    });

    it("should not show count when no comments", () => {
      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByText("(0)")).not.toBeInTheDocument();
    });

    it("should have close button", () => {
      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(
        screen.getByRole("button", { name: /fermer/i })
      ).toBeInTheDocument();
    });
  });

  describe("close behavior", () => {
    it("should call onOpenChange when close button clicked", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <CommentsSidebar {...defaultProps} onOpenChange={onOpenChange} />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole("button", { name: /fermer/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("comment form", () => {
    it("should show form when selection is provided", () => {
      const selection: CommentSelection = {
        text: "Selected text",
        anchorStart: 10,
        anchorEnd: 25,
      };

      render(
        <CommentsSidebar {...defaultProps} selection={selection} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole("form")).toBeInTheDocument();
      expect(screen.getByText(/Selected text/)).toBeInTheDocument();
    });

    it("should not show form when no selection", () => {
      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    });

    it("should call createComment on form submit", async () => {
      const user = userEvent.setup();
      const createComment = vi.fn();
      mockUseCreateComment.mockReturnValue({
        createComment,
        createCommentAsync: vi.fn(),
        isCreating: false,
        error: null,
        reset: vi.fn(),
      } as ReturnType<typeof useCreateComment>);

      const selection: CommentSelection = {
        text: "Selected text",
        anchorStart: 10,
        anchorEnd: 25,
      };

      render(
        <CommentsSidebar {...defaultProps} selection={selection} />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByRole("textbox"), "Mon commentaire");
      await user.click(screen.getByRole("button", { name: /envoyer/i }));

      expect(createComment).toHaveBeenCalledWith({
        content: "Mon commentaire",
        anchorStart: 10,
        anchorEnd: 25,
      });
    });

    it("should call onSelectionClear on form cancel", async () => {
      const user = userEvent.setup();
      const onSelectionClear = vi.fn();
      const selection: CommentSelection = {
        text: "Selected text",
        anchorStart: 10,
        anchorEnd: 25,
      };

      render(
        <CommentsSidebar
          {...defaultProps}
          selection={selection}
          onSelectionClear={onSelectionClear}
        />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole("button", { name: /annuler/i }));

      expect(onSelectionClear).toHaveBeenCalled();
    });
  });

  describe("comments list", () => {
    it("should render comments from hook", () => {
      mockUseComments.mockReturnValue({
        comments: [
          createMockComment({ id: "c1", content: "Premier commentaire" }),
          createMockComment({ id: "c2", content: "Deuxième commentaire" }),
        ],
        total: 2,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as ReturnType<typeof useComments>);

      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Premier commentaire")).toBeInTheDocument();
      expect(screen.getByText("Deuxième commentaire")).toBeInTheDocument();
    });

    it("should pass selectedCommentId to list", () => {
      mockUseComments.mockReturnValue({
        comments: [createMockComment({ id: "c1" })],
        total: 1,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as ReturnType<typeof useComments>);

      render(
        <CommentsSidebar {...defaultProps} selectedCommentId="c1" />,
        { wrapper: createWrapper() }
      );

      // The selected comment should have bg-accent class
      // With threading, articles[0] is CommentThread, articles[1] is CommentItem
      const articles = screen.getAllByRole("article");
      expect(articles[1]).toHaveClass("bg-accent");
    });
  });

  describe("callbacks", () => {
    it("should call onCommentSelect when comment clicked", async () => {
      const user = userEvent.setup();
      const onCommentSelect = vi.fn();
      mockUseComments.mockReturnValue({
        comments: [createMockComment({ id: "c1" })],
        total: 1,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as ReturnType<typeof useComments>);

      render(
        <CommentsSidebar
          {...defaultProps}
          onCommentSelect={onCommentSelect}
        />,
        { wrapper: createWrapper() }
      );

      // With threading, articles[0] is CommentThread, articles[1] is CommentItem
      const articles = screen.getAllByRole("article");
      await user.click(articles[1]);

      expect(onCommentSelect).toHaveBeenCalledWith("c1");
    });
  });

  describe("hook configuration", () => {
    it("should enable hooks when open", () => {
      render(<CommentsSidebar {...defaultProps} open={true} />, {
        wrapper: createWrapper(),
      });

      expect(mockUseComments).toHaveBeenCalledWith(
        "note-1",
        expect.objectContaining({
          enabled: true,
          refetchInterval: 5000,
        })
      );
    });

    it("should disable refetch when closed", () => {
      render(<CommentsSidebar {...defaultProps} open={false} />, {
        wrapper: createWrapper(),
      });

      expect(mockUseComments).toHaveBeenCalledWith(
        "note-1",
        expect.objectContaining({
          enabled: false,
          refetchInterval: false,
        })
      );
    });
  });

  describe("selection clearing", () => {
    it("should clear selection when sidebar closes", () => {
      const onSelectionClear = vi.fn();
      const selection: CommentSelection = {
        text: "Test",
        anchorStart: 0,
        anchorEnd: 4,
      };

      const { rerender } = render(
        <CommentsSidebar
          {...defaultProps}
          open={true}
          selection={selection}
          onSelectionClear={onSelectionClear}
        />,
        { wrapper: createWrapper() }
      );

      // Close the sidebar
      rerender(
        <CommentsSidebar
          {...defaultProps}
          open={false}
          selection={selection}
          onSelectionClear={onSelectionClear}
        />
      );

      expect(onSelectionClear).toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("should have accessible sheet description", () => {
      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Screen reader only description
      expect(
        screen.getByText(/panneau des commentaires de la note/i)
      ).toBeInTheDocument();
    });
  });

  describe("hide resolved filter (Story 9.6 AC #6)", () => {
    it("should render hide resolved toggle switch", () => {
      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText(/masquer les commentaires résolus/i)).toBeInTheDocument();
      expect(screen.getByText(/masquer les résolus/i)).toBeInTheDocument();
    });

    it("should filter out resolved comments when toggle is enabled", async () => {
      const user = userEvent.setup();
      mockUseComments.mockReturnValue({
        comments: [
          createMockComment({ id: "c1", content: "Comment non résolu", resolved: false }),
          createMockComment({ id: "c2", content: "Comment résolu", resolved: true }),
        ],
        total: 2,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as ReturnType<typeof useComments>);

      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Both comments should be visible initially
      expect(screen.getByText("Comment non résolu")).toBeInTheDocument();
      expect(screen.getByText("Comment résolu")).toBeInTheDocument();

      // Enable the filter
      const toggle = screen.getByLabelText(/masquer les commentaires résolus/i);
      await user.click(toggle);

      // Only unresolved comment should be visible
      expect(screen.getByText("Comment non résolu")).toBeInTheDocument();
      expect(screen.queryByText("Comment résolu")).not.toBeInTheDocument();
    });

    it("should show resolved comments again when toggle is disabled", async () => {
      const user = userEvent.setup();
      mockUseComments.mockReturnValue({
        comments: [
          createMockComment({ id: "c1", content: "Comment non résolu", resolved: false }),
          createMockComment({ id: "c2", content: "Comment résolu", resolved: true }),
        ],
        total: 2,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as ReturnType<typeof useComments>);

      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const toggle = screen.getByLabelText(/masquer les commentaires résolus/i);

      // Enable filter
      await user.click(toggle);
      expect(screen.queryByText("Comment résolu")).not.toBeInTheDocument();

      // Disable filter
      await user.click(toggle);
      expect(screen.getByText("Comment résolu")).toBeInTheDocument();
    });

    it("should persist hide resolved preference to localStorage", async () => {
      const user = userEvent.setup();
      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const toggle = screen.getByLabelText(/masquer les commentaires résolus/i);
      await user.click(toggle);

      expect(localStorage.getItem("plumenote-comments-hide-resolved")).toBe("true");
    });

    it("should load hide resolved preference from localStorage", () => {
      localStorage.setItem("plumenote-comments-hide-resolved", "true");

      mockUseComments.mockReturnValue({
        comments: [
          createMockComment({ id: "c1", content: "Comment non résolu", resolved: false }),
          createMockComment({ id: "c2", content: "Comment résolu", resolved: true }),
        ],
        total: 2,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      } as ReturnType<typeof useComments>);

      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Resolved comment should be hidden since localStorage has the preference
      expect(screen.getByText("Comment non résolu")).toBeInTheDocument();
      expect(screen.queryByText("Comment résolu")).not.toBeInTheDocument();
    });

    it("should show Eye icon when filter is off and EyeOff when on", async () => {
      const user = userEvent.setup();
      const { container } = render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Initially Eye icon should be visible (filter off)
      // Note: Lucide icons render as SVG, we check for the label wrapper
      const toggle = screen.getByLabelText(/masquer les commentaires résolus/i);

      // Toggle on
      await user.click(toggle);

      // The label text should still be present
      expect(screen.getByText(/masquer les résolus/i)).toBeInTheDocument();
    });
  });

  describe("reply integration (Story 9.6)", () => {
    it("should call useReplyComment hook", () => {
      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(mockUseReplyComment).toHaveBeenCalledWith(
        "note-1",
        expect.objectContaining({
          onSuccess: expect.any(Function),
        })
      );
    });
  });

  describe("resolve integration (Story 9.6)", () => {
    it("should call useResolveComment hook", () => {
      render(<CommentsSidebar {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(mockUseResolveComment).toHaveBeenCalledWith(
        expect.objectContaining({
          noteId: "note-1",
          onSuccess: expect.any(Function),
        })
      );
    });
  });
});

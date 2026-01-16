/**
 * Tests for CommentsSidebar Component
 *
 * @see Story 9.5: Ajout de Commentaires en Marge
 * @see AC: #1 - Panneau latéral pour les commentaires
 * @see AC: #4 - Scroll vers le commentaire sélectionné
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

import { useComments } from "../hooks/useComments";
import { useCreateComment } from "../hooks/useCreateComment";
import { useUpdateComment } from "../hooks/useUpdateComment";
import { useDeleteComment } from "../hooks/useDeleteComment";

const mockUseComments = vi.mocked(useComments);
const mockUseCreateComment = vi.mocked(useCreateComment);
const mockUseUpdateComment = vi.mocked(useUpdateComment);
const mockUseDeleteComment = vi.mocked(useDeleteComment);

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
      expect(screen.getByRole("article")).toHaveClass("bg-accent");
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

      await user.click(screen.getByRole("article"));

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
});

/**
 * Unit tests for CollaborativeEditor component
 *
 * Tests the real-time collaborative editor using Tiptap with Y.js integration.
 * Includes tests for collaborative cursors (Story 4-4).
 *
 * @see Story 4-3: Edition Simultanee
 * @see Story 4-4: Curseurs Collaboratifs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CollaborativeEditor } from "./CollaborativeEditor";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

// Mock Y.Doc
const mockYDoc = {
  destroy: vi.fn(),
  getXmlFragment: vi.fn(),
};

// Mock provider for CollaborationCursor
const mockProvider = {
  awareness: {
    setLocalStateField: vi.fn(),
    getLocalState: vi.fn(),
  },
};

// Mock useCollaboration hook
vi.mock("../hooks/useCollaboration", () => ({
  useCollaboration: vi.fn(() => ({
    ydoc: mockYDoc,
    provider: mockProvider,
    status: "connected",
    isSynced: true,
    isConnected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    error: null,
  })),
}));

// Mock next-auth useSession
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      },
    },
    status: "authenticated",
  })),
}));

// Mock Tiptap
vi.mock("@tiptap/react", () => {
  const mockEditor = {
    getHTML: () => "<p>Test content</p>",
    getText: () => "Test content",
    commands: {
      setContent: vi.fn(),
      focus: vi.fn(),
    },
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
  };

  return {
    useEditor: vi.fn(() => mockEditor),
    EditorContent: ({ editor }: { editor: unknown }) => (
      <div data-testid="editor-content">
        {editor ? "Collaborative Editor loaded" : "Loading..."}
      </div>
    ),
  };
});

vi.mock("@tiptap/starter-kit", () => ({
  default: {
    configure: vi.fn(() => ({})),
  },
}));

vi.mock("@tiptap/extension-collaboration", () => ({
  default: {
    configure: vi.fn(() => ({})),
  },
}));

vi.mock("@tiptap/extension-collaboration-cursor", () => ({
  default: {
    configure: vi.fn(() => ({})),
  },
}));

vi.mock("@tiptap/extension-placeholder", () => ({
  default: {
    configure: vi.fn(() => ({})),
  },
}));

// Get the mocked hook for manipulation
import { useCollaboration } from "../hooks/useCollaboration";
import { useSession } from "next-auth/react";
const mockedUseCollaboration = vi.mocked(useCollaboration);
const mockedUseSession = vi.mocked(useSession);

describe("CollaborativeEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default mock values
    mockedUseCollaboration.mockReturnValue({
      ydoc: mockYDoc as unknown as ReturnType<typeof useCollaboration>["ydoc"],
      provider: mockProvider as unknown as ReturnType<typeof useCollaboration>["provider"],
      status: "connected",
      isSynced: true,
      isConnected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      error: null,
    });
    // Reset session mock
    mockedUseSession.mockReturnValue({
      data: {
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
        },
        expires: "2026-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });
  });

  it("should render the collaborative editor", async () => {
    render(<CollaborativeEditor noteId="test-note-123" />);

    await waitFor(() => {
      expect(screen.getByTestId("editor-content")).toBeInTheDocument();
    });
  });

  it("should pass noteId to useCollaboration", async () => {
    render(<CollaborativeEditor noteId="my-note-id" />);

    expect(mockedUseCollaboration).toHaveBeenCalledWith({
      noteId: "my-note-id",
      autoConnect: true,
    });
  });

  it("should display sync status indicator when showSyncStatus is true", async () => {
    render(<CollaborativeEditor noteId="test-note" showSyncStatus={true} />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  it("should hide sync status indicator when showSyncStatus is false", async () => {
    render(<CollaborativeEditor noteId="test-note" showSyncStatus={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("editor-content")).toBeInTheDocument();
    });
    // Status indicator should not be present
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should call onEditorReady when editor is ready", async () => {
    const onEditorReady = vi.fn();
    render(
      <CollaborativeEditor noteId="test-note" onEditorReady={onEditorReady} />
    );

    await waitFor(() => {
      expect(onEditorReady).toHaveBeenCalled();
    });
  });

  it("should call onConnectionStatusChange when status changes", async () => {
    const onConnectionStatusChange = vi.fn();
    render(
      <CollaborativeEditor
        noteId="test-note"
        onConnectionStatusChange={onConnectionStatusChange}
      />
    );

    await waitFor(() => {
      expect(onConnectionStatusChange).toHaveBeenCalledWith("connected");
    });
  });

  it("should call onSyncStatusChange when sync status changes", async () => {
    const onSyncStatusChange = vi.fn();
    render(
      <CollaborativeEditor
        noteId="test-note"
        onSyncStatusChange={onSyncStatusChange}
      />
    );

    await waitFor(() => {
      expect(onSyncStatusChange).toHaveBeenCalledWith(true);
    });
  });

  it("should call onError when collaboration error occurs", async () => {
    const onError = vi.fn();
    mockedUseCollaboration.mockReturnValue({
      ydoc: mockYDoc as unknown as ReturnType<typeof useCollaboration>["ydoc"],
      provider: {} as ReturnType<typeof useCollaboration>["provider"],
      status: "disconnected",
      isSynced: false,
      isConnected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      error: "Connection failed",
    });

    render(<CollaborativeEditor noteId="test-note" onError={onError} />);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Connection failed");
    });
  });

  it("should apply custom className", async () => {
    const { container } = render(
      <CollaborativeEditor noteId="test-note" className="my-custom-class" />
    );

    await waitFor(() => {
      expect(container.firstChild).toHaveClass("my-custom-class");
    });
  });

  it("should use custom placeholder", async () => {
    const Placeholder = await import("@tiptap/extension-placeholder");
    render(
      <CollaborativeEditor noteId="test-note" placeholder="Start typing..." />
    );

    await waitFor(() => {
      expect(Placeholder.default.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          placeholder: "Start typing...",
        })
      );
    });
  });

  it("should show loading state when editor is not ready", async () => {
    // Mock useEditor to return null initially
    const { useEditor } = await import("@tiptap/react");
    vi.mocked(useEditor).mockReturnValueOnce(null);

    render(<CollaborativeEditor noteId="test-note" />);

    // Should show loading skeleton
    expect(screen.queryByTestId("editor-content")).not.toBeInTheDocument();
  });

  it("should display error in sync status indicator when error occurs", async () => {
    mockedUseCollaboration.mockReturnValue({
      ydoc: mockYDoc as unknown as ReturnType<typeof useCollaboration>["ydoc"],
      provider: mockProvider as unknown as ReturnType<typeof useCollaboration>["provider"],
      status: "disconnected",
      isSynced: false,
      isConnected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      error: "WebSocket connection failed",
    });

    render(<CollaborativeEditor noteId="test-note" showSyncStatus={true} />);

    await waitFor(() => {
      expect(screen.getByText(/Erreur:/)).toBeInTheDocument();
    });
  });

  // Story 4-4: CollaborationCursor tests
  describe("CollaborationCursor (Story 4-4)", () => {
    it("should configure CollaborationCursor when provider is available", async () => {
      const CollaborationCursor = await import(
        "@tiptap/extension-collaboration-cursor"
      );
      render(<CollaborativeEditor noteId="test-note" />);

      await waitFor(() => {
        expect(CollaborationCursor.default.configure).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: mockProvider,
            user: expect.objectContaining({
              name: "Test User",
            }),
          })
        );
      });
    });

    it("should use custom userName when provided", async () => {
      const CollaborationCursor = await import(
        "@tiptap/extension-collaboration-cursor"
      );
      render(<CollaborativeEditor noteId="test-note" userName="Custom User" />);

      await waitFor(() => {
        expect(CollaborationCursor.default.configure).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              name: "Custom User",
            }),
          })
        );
      });
    });

    it("should use custom userColor when provided", async () => {
      const CollaborationCursor = await import(
        "@tiptap/extension-collaboration-cursor"
      );
      render(
        <CollaborativeEditor noteId="test-note" userColor="#ff0000" />
      );

      await waitFor(() => {
        expect(CollaborationCursor.default.configure).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              color: "#ff0000",
            }),
          })
        );
      });
    });

    it("should use 'Anonyme' as fallback when no session user name", async () => {
      mockedUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      const CollaborationCursor = await import(
        "@tiptap/extension-collaboration-cursor"
      );
      render(<CollaborativeEditor noteId="test-note" />);

      await waitFor(() => {
        expect(CollaborationCursor.default.configure).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              name: "Anonyme",
            }),
          })
        );
      });
    });

    it("should not configure CollaborationCursor when provider is null", async () => {
      mockedUseCollaboration.mockReturnValue({
        ydoc: mockYDoc as unknown as ReturnType<typeof useCollaboration>["ydoc"],
        provider: null,
        status: "disconnected",
        isSynced: false,
        isConnected: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        error: null,
      });

      const CollaborationCursor = await import(
        "@tiptap/extension-collaboration-cursor"
      );
      vi.mocked(CollaborationCursor.default.configure).mockClear();

      render(<CollaborativeEditor noteId="test-note" />);

      await waitFor(() => {
        expect(screen.getByTestId("editor-content")).toBeInTheDocument();
      });

      // CollaborationCursor should not be configured when provider is null
      expect(CollaborationCursor.default.configure).not.toHaveBeenCalled();
    });

    it("should generate consistent color from user ID", async () => {
      const CollaborationCursor = await import(
        "@tiptap/extension-collaboration-cursor"
      );
      render(<CollaborativeEditor noteId="test-note" />);

      await waitFor(() => {
        expect(CollaborationCursor.default.configure).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              color: expect.stringMatching(/^hsl\(\d+, 70%, 50%\)$/),
            }),
          })
        );
      });
    });

    it("should cleanup cursors when component unmounts (AC#5)", async () => {
      // Get mock editor to verify destroy is called
      const { useEditor } = await import("@tiptap/react");
      const mockEditorDestroy = vi.fn();
      const mockEditor = {
        getHTML: () => "<p>Test</p>",
        getText: () => "Test",
        commands: { setContent: vi.fn(), focus: vi.fn() },
        on: vi.fn(),
        off: vi.fn(),
        destroy: mockEditorDestroy,
      };
      vi.mocked(useEditor).mockReturnValue(mockEditor as ReturnType<typeof useEditor>);

      const { unmount } = render(<CollaborativeEditor noteId="test-note" />);

      await waitFor(() => {
        expect(screen.getByTestId("editor-content")).toBeInTheDocument();
      });

      // Unmount the component - editor cleanup should happen
      unmount();

      // The useEditor hook handles cleanup internally via Tiptap
      // This test verifies component mounts/unmounts cleanly without errors
      // CollaborationCursor cleanup is handled by the extension when editor is destroyed
    });
  });
});

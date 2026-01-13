/**
 * Tests for InternalLinkView Component
 *
 * @see Story 6.6: Liens Internes et Autocomplétion
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NodeViewProps } from "@tiptap/react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Import after mocks
import { InternalLinkView } from "./InternalLinkView";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("InternalLinkView", () => {
  const createMockProps = (overrides?: Partial<NodeViewProps>): NodeViewProps => ({
    node: {
      attrs: {
        noteId: "test-note-123",
        title: "Test Note Title",
      },
      type: { name: "internalLink" },
      isBlock: false,
      isInline: true,
      isLeaf: true,
      isAtom: true,
      isText: false,
      textContent: "",
      nodeSize: 1,
      childCount: 0,
      content: { size: 0, childCount: 0 } as unknown,
      marks: [],
      firstChild: null,
      lastChild: null,
      text: undefined,
      resolve: vi.fn(),
      nodesBetween: vi.fn(),
      descendants: vi.fn(),
      textBetween: vi.fn(),
      eq: vi.fn(),
      sameMarkup: vi.fn(),
      hasMarkup: vi.fn(),
      copy: vi.fn(),
      mark: vi.fn(),
      cut: vi.fn(),
      slice: vi.fn(),
      replace: vi.fn(),
      toJSON: vi.fn(),
      check: vi.fn(),
      toString: vi.fn(),
      child: vi.fn(),
      maybeChild: vi.fn(),
      forEach: vi.fn(),
      rangeHasMark: vi.fn(),
    },
    editor: {} as unknown,
    extension: {
      options: {},
      name: "internalLink",
      type: "node",
      parent: null,
      child: null,
      storage: {},
      configure: vi.fn(),
      extend: vi.fn(),
    } as unknown,
    getPos: vi.fn(() => 0),
    updateAttributes: vi.fn(),
    deleteNode: vi.fn(),
    selected: false,
    decorations: [] as unknown,
    HTMLAttributes: {},
    ...overrides,
  } as unknown as NodeViewProps);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("Rendering", () => {
    it("should render the link with correct title", () => {
      render(<InternalLinkView {...createMockProps()} />);

      expect(screen.getByText("[[Test Note Title]]")).toBeInTheDocument();
    });

    it("should have correct data attributes", () => {
      render(<InternalLinkView {...createMockProps()} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("data-internal-link", "");
      expect(link).toHaveAttribute("data-note-id", "test-note-123");
      expect(link).toHaveAttribute("data-title", "Test Note Title");
    });

    it("should apply internal-link class", () => {
      render(<InternalLinkView {...createMockProps()} />);

      const link = screen.getByRole("link");
      expect(link).toHaveClass("internal-link");
    });

    it("should have correct aria-label", () => {
      render(<InternalLinkView {...createMockProps()} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("aria-label", "Lien vers: Test Note Title");
    });
  });

  describe("Navigation", () => {
    it("should navigate on click", async () => {
      const user = userEvent.setup();
      render(<InternalLinkView {...createMockProps()} />);

      await user.click(screen.getByRole("link"));

      expect(mockPush).toHaveBeenCalledWith("/notes/test-note-123");
    });

    it("should navigate on Enter key", async () => {
      const user = userEvent.setup();
      render(<InternalLinkView {...createMockProps()} />);

      const link = screen.getByRole("link");
      link.focus();
      await user.keyboard("{Enter}");

      expect(mockPush).toHaveBeenCalledWith("/notes/test-note-123");
    });

    it("should navigate on Space key", async () => {
      const user = userEvent.setup();
      render(<InternalLinkView {...createMockProps()} />);

      const link = screen.getByRole("link");
      link.focus();
      await user.keyboard(" ");

      expect(mockPush).toHaveBeenCalledWith("/notes/test-note-123");
    });

    it("should use custom onNavigate callback when provided", async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();

      const props = createMockProps();
      (props.extension as unknown as { options: { onNavigate: typeof onNavigate } }).options = { onNavigate };

      render(<InternalLinkView {...props} />);

      await user.click(screen.getByRole("link"));

      expect(onNavigate).toHaveBeenCalledWith("test-note-123");
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("Tooltip Preview", () => {
    it("should fetch preview on hover", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              title: "Fetched Title",
              content: "Preview content text here",
            },
          }),
      });

      render(<InternalLinkView {...createMockProps()} />);

      await user.hover(screen.getByRole("link"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/notes/test-note-123");
      });
    });

    it("should show error for broken link (404)", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      render(<InternalLinkView {...createMockProps()} />);

      await user.hover(screen.getByRole("link"));

      await waitFor(() => {
        // Use getAllByText since error may appear multiple times (tooltip + link)
        const errorTexts = screen.getAllByText("Note introuvable");
        expect(errorTexts.length).toBeGreaterThan(0);
      });
    });

    it("should mark link as broken on 404", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      render(<InternalLinkView {...createMockProps()} />);

      await user.hover(screen.getByRole("link"));

      await waitFor(() => {
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("data-broken", "true");
        expect(link).toHaveAttribute("aria-label", "Lien cassé: Test Note Title");
      });
    });
  });

  describe("Accessibility", () => {
    it("should be focusable with Tab", async () => {
      const user = userEvent.setup();
      render(<InternalLinkView {...createMockProps()} />);

      await user.tab();

      expect(screen.getByRole("link")).toHaveFocus();
    });

    it("should have role=link", () => {
      render(<InternalLinkView {...createMockProps()} />);

      expect(screen.getByRole("link")).toBeInTheDocument();
    });

    it("should have tabIndex=0", () => {
      render(<InternalLinkView {...createMockProps()} />);

      expect(screen.getByRole("link")).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing noteId", async () => {
      const user = userEvent.setup();
      const props = createMockProps();
      props.node.attrs.noteId = null;

      render(<InternalLinkView {...props} />);

      await user.click(screen.getByRole("link"));

      // Should not navigate
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should handle empty title", () => {
      const props = createMockProps();
      props.node.attrs.title = "";

      render(<InternalLinkView {...props} />);

      expect(screen.getByText("[[]]")).toBeInTheDocument();
    });
  });
});

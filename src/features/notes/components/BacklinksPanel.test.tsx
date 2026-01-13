/**
 * Tests for BacklinksPanel component
 *
 * @see Story 6.7: Panneau Backlinks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { BacklinksPanel } from "./BacklinksPanel";

// Mock next/navigation with captured push function
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Helper to setup matchMedia mock
function setupMatchMediaMock(matches: boolean = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("BacklinksPanel", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    global.fetch = vi.fn();
    setupMatchMediaMock(false); // Default to desktop
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("renders skeleton loading state when open", async () => {
    // Never resolves to keep loading state
    vi.mocked(global.fetch).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <BacklinksPanel
        noteId="note123"
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    // Check for loading skeletons
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders empty state when no backlinks", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response);

    render(
      <BacklinksPanel
        noteId="note123"
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(
        screen.getByText("Aucune note ne pointe vers celle-ci")
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Créez un lien avec/)).toBeInTheDocument();
    expect(screen.getByText("[[")).toBeInTheDocument();
  });

  it("renders list of backlinks", async () => {
    const mockBacklinks = [
      { id: "note1", title: "First Note", linkTitle: "Reference", updatedAt: "2026-01-13T10:00:00Z" },
      { id: "note2", title: "Second Note", linkTitle: null, updatedAt: "2026-01-13T09:00:00Z" },
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockBacklinks }),
    } as Response);

    render(
      <BacklinksPanel
        noteId="note123"
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("First Note")).toBeInTheDocument();
    });

    expect(screen.getByText("Second Note")).toBeInTheDocument();
    expect(screen.getByText("Lié comme: Reference")).toBeInTheDocument();
  });

  it("shows backlinks count in title", async () => {
    const mockBacklinks = [
      { id: "note1", title: "First Note", linkTitle: null, updatedAt: "2026-01-13T10:00:00Z" },
      { id: "note2", title: "Second Note", linkTitle: null, updatedAt: "2026-01-13T09:00:00Z" },
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockBacklinks }),
    } as Response);

    render(
      <BacklinksPanel
        noteId="note123"
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("(2)")).toBeInTheDocument();
    });
  });

  it("closes panel and navigates when clicking on backlink", async () => {
    const mockBacklinks = [
      { id: "note1", title: "First Note", linkTitle: null, updatedAt: "2026-01-13T10:00:00Z" },
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockBacklinks }),
    } as Response);

    render(
      <BacklinksPanel
        noteId="note123"
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText("First Note")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Ouvrir la note First Note/i }));

    // Verify panel closes
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    // Verify navigation (AC #3)
    expect(mockPush).toHaveBeenCalledWith("/notes/note1");
  });

  it("does not fetch when closed", async () => {
    render(
      <BacklinksPanel
        noteId="note123"
        open={false}
        onOpenChange={mockOnOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    // Wait a bit to ensure no fetch was made
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("renders title and description", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response);

    render(
      <BacklinksPanel
        noteId="note123"
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText("Backlinks")).toBeInTheDocument();
    expect(
      screen.getByText("Notes qui contiennent un lien vers cette note")
    ).toBeInTheDocument();
  });

  it("has accessible list role", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response);

    render(
      <BacklinksPanel
        noteId="note123"
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(
        screen.getByRole("list", { name: "Liste des backlinks" })
      ).toBeInTheDocument();
    });
  });

  it("has accessible empty state", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response);

    render(
      <BacklinksPanel
        noteId="note123"
        open={true}
        onOpenChange={mockOnOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });
});

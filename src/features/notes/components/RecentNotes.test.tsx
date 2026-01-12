/**
 * RecentNotes Component Tests
 *
 * @see Story 5.6: Homepage Dynamique (AC: #2)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecentNotes } from "./RecentNotes";

// Mock useNotes hook
vi.mock("../hooks/useNotes", () => ({
  useNotes: vi.fn(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import { useNotes } from "../hooks/useNotes";

const mockUseNotes = useNotes as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("RecentNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state with skeletons", () => {
    mockUseNotes.mockReturnValue({
      notes: [],
      isLoading: true,
      error: null,
    });

    render(<RecentNotes />, { wrapper: createWrapper() });

    expect(screen.getByText("Notes récentes")).toBeInTheDocument();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render empty state when no notes", () => {
    mockUseNotes.mockReturnValue({
      notes: [],
      isLoading: false,
      error: null,
    });

    render(<RecentNotes />, { wrapper: createWrapper() });

    expect(screen.getByText("Aucune note récente.")).toBeInTheDocument();
  });

  it("should render notes list when data available", () => {
    const mockNotes = [
      {
        id: "1",
        title: "Note 1",
        content: "Content 1",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isFavorite: false,
        tags: [],
      },
      {
        id: "2",
        title: "Note 2",
        content: "Content 2",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isFavorite: false,
        tags: [],
      },
    ];

    mockUseNotes.mockReturnValue({
      notes: mockNotes,
      isLoading: false,
      error: null,
    });

    render(<RecentNotes />, { wrapper: createWrapper() });

    expect(screen.getByText("Note 1")).toBeInTheDocument();
    expect(screen.getByText("Note 2")).toBeInTheDocument();
  });

  it("should render error state", () => {
    mockUseNotes.mockReturnValue({
      notes: [],
      isLoading: false,
      error: new Error("Failed to fetch"),
    });

    render(<RecentNotes />, { wrapper: createWrapper() });

    expect(
      screen.getByText("Erreur lors du chargement des notes")
    ).toBeInTheDocument();
  });

  it("should display 'Sans titre' for notes without title", () => {
    const mockNotes = [
      {
        id: "1",
        title: "",
        content: "Content",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isFavorite: false,
        tags: [],
      },
    ];

    mockUseNotes.mockReturnValue({
      notes: mockNotes,
      isLoading: false,
      error: null,
    });

    render(<RecentNotes />, { wrapper: createWrapper() });

    expect(screen.getByText("Sans titre")).toBeInTheDocument();
  });

  it("should respect limit prop", () => {
    mockUseNotes.mockReturnValue({
      notes: [],
      isLoading: false,
      error: null,
    });

    render(<RecentNotes limit={3} />, { wrapper: createWrapper() });

    expect(mockUseNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: 3,
        sortBy: "updatedAt",
        sortDir: "desc",
      })
    );
  });

  it("should have link to dashboard", () => {
    mockUseNotes.mockReturnValue({
      notes: [],
      isLoading: false,
      error: null,
    });

    render(<RecentNotes />, { wrapper: createWrapper() });

    const link = screen.getByRole("link", { name: /voir tout/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});

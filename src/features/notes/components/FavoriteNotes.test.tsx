/**
 * FavoriteNotes Component Tests
 *
 * @see Story 5.6: Homepage Dynamique (AC: #3)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FavoriteNotes } from "./FavoriteNotes";

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

describe("FavoriteNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state with skeletons", () => {
    mockUseNotes.mockReturnValue({
      notes: [],
      isLoading: true,
      error: null,
    });

    render(<FavoriteNotes />, { wrapper: createWrapper() });

    expect(screen.getByText("Notes favorites")).toBeInTheDocument();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render empty state when no favorites", () => {
    mockUseNotes.mockReturnValue({
      notes: [],
      isLoading: false,
      error: null,
    });

    render(<FavoriteNotes />, { wrapper: createWrapper() });

    expect(screen.getByText("Aucune note favorite.")).toBeInTheDocument();
  });

  it("should render favorites list when data available", () => {
    const mockNotes = [
      {
        id: "1",
        title: "Favorite 1",
        content: "Content 1",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isFavorite: true,
        tags: [],
      },
      {
        id: "2",
        title: "Favorite 2",
        content: "Content 2",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isFavorite: true,
        tags: [],
      },
    ];

    mockUseNotes.mockReturnValue({
      notes: mockNotes,
      isLoading: false,
      error: null,
    });

    render(<FavoriteNotes />, { wrapper: createWrapper() });

    expect(screen.getByText("Favorite 1")).toBeInTheDocument();
    expect(screen.getByText("Favorite 2")).toBeInTheDocument();
  });

  it("should render error state", () => {
    mockUseNotes.mockReturnValue({
      notes: [],
      isLoading: false,
      error: new Error("Failed to fetch"),
    });

    render(<FavoriteNotes />, { wrapper: createWrapper() });

    expect(
      screen.getByText("Erreur lors du chargement des favoris")
    ).toBeInTheDocument();
  });

  it("should display star icon for each favorite note", () => {
    const mockNotes = [
      {
        id: "1",
        title: "Favorite 1",
        content: "Content",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isFavorite: true,
        tags: [],
      },
    ];

    mockUseNotes.mockReturnValue({
      notes: mockNotes,
      isLoading: false,
      error: null,
    });

    render(<FavoriteNotes />, { wrapper: createWrapper() });

    const starIcons = document.querySelectorAll(".text-yellow-500");
    expect(starIcons.length).toBeGreaterThan(0);
  });

  it("should call useNotes with favoriteOnly: true", () => {
    mockUseNotes.mockReturnValue({
      notes: [],
      isLoading: false,
      error: null,
    });

    render(<FavoriteNotes limit={3} />, { wrapper: createWrapper() });

    expect(mockUseNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        favoriteOnly: true,
        pageSize: 3,
        sortBy: "updatedAt",
        sortDir: "desc",
      })
    );
  });

  it("should have link to favorites dashboard view", () => {
    mockUseNotes.mockReturnValue({
      notes: [],
      isLoading: false,
      error: null,
    });

    render(<FavoriteNotes />, { wrapper: createWrapper() });

    const link = screen.getByRole("link", { name: /voir tout/i });
    expect(link).toHaveAttribute("href", "/dashboard?favorites=true");
  });
});

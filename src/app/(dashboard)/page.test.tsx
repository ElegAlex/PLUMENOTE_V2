/**
 * Homepage Tests
 *
 * @see Story 5.6: Homepage Dynamique
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomePage from "./page";

// Mock useRouter
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useSession
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        name: "Test User",
        email: "test@example.com",
      },
    },
    status: "authenticated",
  })),
}));

// Mock useNotes
const mockCreateNoteAsync = vi.fn();
vi.mock("@/features/notes", () => ({
  useNotes: vi.fn(() => ({
    notes: [],
    meta: { total: 10 },
    isLoading: false,
    error: null,
    createNoteAsync: mockCreateNoteAsync,
    isCreating: false,
  })),
  RecentNotes: () => <div data-testid="recent-notes">Recent Notes</div>,
  FavoriteNotes: () => <div data-testid="favorite-notes">Favorite Notes</div>,
}));

// Mock SearchBar
vi.mock("@/features/search", () => ({
  SearchBar: () => <div data-testid="search-bar">Search Bar</div>,
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render welcome message with user name", () => {
    render(<HomePage />, { wrapper: createWrapper() });

    expect(screen.getByText(/bonjour test user/i)).toBeInTheDocument();
  });

  it("should render current date in French format", () => {
    render(<HomePage />, { wrapper: createWrapper() });

    // Date should contain month name in French (checking for common patterns)
    const dateRegex =
      /janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre/i;
    const dateElement = screen.getByText(dateRegex);
    expect(dateElement).toBeInTheDocument();
  });

  it("should render search bar", () => {
    render(<HomePage />, { wrapper: createWrapper() });

    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
  });

  it("should render new note button", () => {
    render(<HomePage />, { wrapper: createWrapper() });

    expect(
      screen.getByRole("button", { name: /nouvelle note/i })
    ).toBeInTheDocument();
  });

  it("should render recent notes section", () => {
    render(<HomePage />, { wrapper: createWrapper() });

    expect(screen.getByTestId("recent-notes")).toBeInTheDocument();
  });

  it("should render favorite notes section", () => {
    render(<HomePage />, { wrapper: createWrapper() });

    expect(screen.getByTestId("favorite-notes")).toBeInTheDocument();
  });

  it("should create note and navigate on button click", async () => {
    mockCreateNoteAsync.mockResolvedValue({ id: "new-note-id" });

    render(<HomePage />, { wrapper: createWrapper() });

    const button = screen.getByRole("button", { name: /nouvelle note/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCreateNoteAsync).toHaveBeenCalledWith({});
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/notes/new-note-id");
    });
  });

  it("should have proper ARIA landmarks", () => {
    render(<HomePage />, { wrapper: createWrapper() });

    // Check for sections with aria-label
    expect(
      document.querySelector('[aria-label="Bienvenue"]')
    ).toBeInTheDocument();
    expect(
      document.querySelector('[aria-label="Statistiques"]')
    ).toBeInTheDocument();
    expect(
      document.querySelector('[aria-label="Notes favorites"]')
    ).toBeInTheDocument();
    expect(
      document.querySelector('[aria-label="Notes récentes"]')
    ).toBeInTheDocument();
  });

  it("should be responsive with proper grid layout", () => {
    render(<HomePage />, { wrapper: createWrapper() });

    // Check that the main container has responsive classes
    const container = document.querySelector(".container");
    expect(container).toBeInTheDocument();

    // Check grid layout for notes sections
    const grid = document.querySelector(".grid.gap-8");
    expect(grid).toBeInTheDocument();
  });
});

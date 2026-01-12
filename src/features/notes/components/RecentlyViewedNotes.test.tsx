/**
 * RecentlyViewedNotes Component Tests
 *
 * @see Story 6.4: Notes Récentes (AC: #1, #3)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecentlyViewedNotes } from "./RecentlyViewedNotes";

// Mock useRecentNotes hook
vi.mock("../hooks/useRecentNotes", () => ({
  useRecentNotes: vi.fn(),
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

import { useRecentNotes } from "../hooks/useRecentNotes";

const mockUseRecentNotes = useRecentNotes as ReturnType<typeof vi.fn>;

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

describe("RecentlyViewedNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state with skeletons", () => {
    mockUseRecentNotes.mockReturnValue({
      recentlyViewed: [],
      recentlyModified: [],
      isLoading: true,
      error: null,
    });

    render(<RecentlyViewedNotes />, { wrapper: createWrapper() });

    expect(screen.getByText("Consultées récemment")).toBeInTheDocument();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render empty state when no notes viewed", () => {
    mockUseRecentNotes.mockReturnValue({
      recentlyViewed: [],
      recentlyModified: [],
      isLoading: false,
      error: null,
    });

    render(<RecentlyViewedNotes />, { wrapper: createWrapper() });

    expect(
      screen.getByText("Aucune note consultée récemment.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ouvrez des notes pour les voir apparaître ici.")
    ).toBeInTheDocument();
  });

  it("should render notes list when data available", () => {
    const mockViewed = [
      {
        id: "1",
        title: "Viewed Note 1",
        folderId: null,
        updatedAt: new Date().toISOString(),
        viewedAt: new Date().toISOString(),
      },
      {
        id: "2",
        title: "Viewed Note 2",
        folderId: "folder-1",
        updatedAt: new Date().toISOString(),
        viewedAt: new Date().toISOString(),
      },
    ];

    mockUseRecentNotes.mockReturnValue({
      recentlyViewed: mockViewed,
      recentlyModified: [],
      isLoading: false,
      error: null,
    });

    render(<RecentlyViewedNotes />, { wrapper: createWrapper() });

    expect(screen.getByText("Viewed Note 1")).toBeInTheDocument();
    expect(screen.getByText("Viewed Note 2")).toBeInTheDocument();
  });

  it("should render error state", () => {
    mockUseRecentNotes.mockReturnValue({
      recentlyViewed: [],
      recentlyModified: [],
      isLoading: false,
      error: new Error("Failed to fetch"),
    });

    render(<RecentlyViewedNotes />, { wrapper: createWrapper() });

    expect(screen.getByText("Erreur lors du chargement")).toBeInTheDocument();
  });

  it("should display 'Sans titre' for notes without title", () => {
    const mockViewed = [
      {
        id: "1",
        title: "",
        folderId: null,
        updatedAt: new Date().toISOString(),
        viewedAt: new Date().toISOString(),
      },
    ];

    mockUseRecentNotes.mockReturnValue({
      recentlyViewed: mockViewed,
      recentlyModified: [],
      isLoading: false,
      error: null,
    });

    render(<RecentlyViewedNotes />, { wrapper: createWrapper() });

    expect(screen.getByText("Sans titre")).toBeInTheDocument();
  });

  it("should respect limit prop", () => {
    const mockViewed = [
      { id: "1", title: "Note 1", folderId: null, updatedAt: new Date().toISOString(), viewedAt: new Date().toISOString() },
      { id: "2", title: "Note 2", folderId: null, updatedAt: new Date().toISOString(), viewedAt: new Date().toISOString() },
      { id: "3", title: "Note 3", folderId: null, updatedAt: new Date().toISOString(), viewedAt: new Date().toISOString() },
      { id: "4", title: "Note 4", folderId: null, updatedAt: new Date().toISOString(), viewedAt: new Date().toISOString() },
      { id: "5", title: "Note 5", folderId: null, updatedAt: new Date().toISOString(), viewedAt: new Date().toISOString() },
      { id: "6", title: "Note 6", folderId: null, updatedAt: new Date().toISOString(), viewedAt: new Date().toISOString() },
    ];

    mockUseRecentNotes.mockReturnValue({
      recentlyViewed: mockViewed,
      recentlyModified: [],
      isLoading: false,
      error: null,
    });

    render(<RecentlyViewedNotes limit={3} />, { wrapper: createWrapper() });

    // Should only show 3 notes
    expect(screen.getByText("Note 1")).toBeInTheDocument();
    expect(screen.getByText("Note 2")).toBeInTheDocument();
    expect(screen.getByText("Note 3")).toBeInTheDocument();
    expect(screen.queryByText("Note 4")).not.toBeInTheDocument();
  });

  it("should render without card wrapper when showCard is false", () => {
    mockUseRecentNotes.mockReturnValue({
      recentlyViewed: [],
      recentlyModified: [],
      isLoading: false,
      error: null,
    });

    const { container } = render(<RecentlyViewedNotes showCard={false} />, {
      wrapper: createWrapper(),
    });

    // Should not have card styling
    expect(container.querySelector('[class*="card"]')).toBeNull();
    expect(screen.queryByText("Consultées récemment")).not.toBeInTheDocument();
  });

  it("should link notes to their detail pages", () => {
    const mockViewed = [
      {
        id: "note-123",
        title: "Test Note",
        folderId: null,
        updatedAt: new Date().toISOString(),
        viewedAt: new Date().toISOString(),
      },
    ];

    mockUseRecentNotes.mockReturnValue({
      recentlyViewed: mockViewed,
      recentlyModified: [],
      isLoading: false,
      error: null,
    });

    render(<RecentlyViewedNotes />, { wrapper: createWrapper() });

    const link = screen.getByRole("link", { name: /test note/i });
    expect(link).toHaveAttribute("href", "/notes/note-123");
  });

  it("should display relative time for viewedAt", () => {
    // Set viewedAt to a known time (1 hour ago)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const mockViewed = [
      {
        id: "1",
        title: "Recent Note",
        folderId: null,
        updatedAt: new Date().toISOString(),
        viewedAt: oneHourAgo.toISOString(),
      },
    ];

    mockUseRecentNotes.mockReturnValue({
      recentlyViewed: mockViewed,
      recentlyModified: [],
      isLoading: false,
      error: null,
    });

    render(<RecentlyViewedNotes />, { wrapper: createWrapper() });

    // Should show relative time (exact text depends on date-fns locale)
    // Looking for "il y a" which is French for "ago"
    expect(screen.getByText(/il y a/i)).toBeInTheDocument();
  });
});

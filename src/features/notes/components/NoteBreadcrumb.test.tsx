/**
 * Tests for NoteBreadcrumb component
 * @see Story 5.5: Fil d'Ariane (Breadcrumb)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NoteBreadcrumb } from "./NoteBreadcrumb";
import type { Folder } from "../types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock useMediaQuery to avoid window.matchMedia issues in tests
vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: () => false, // Default to desktop view
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test data
const mockShortPath: Folder[] = [
  {
    id: "folder-1",
    name: "Documents",
    parentId: null,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
  },
  {
    id: "folder-2",
    name: "Work",
    parentId: "folder-1",
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
  },
];

const mockLongPath: Folder[] = [
  {
    id: "folder-1",
    name: "Documents",
    parentId: null,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
  },
  {
    id: "folder-2",
    name: "Projects",
    parentId: "folder-1",
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
  },
  {
    id: "folder-3",
    name: "Current",
    parentId: "folder-2",
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
  },
  {
    id: "folder-4",
    name: "Phase1",
    parentId: "folder-3",
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
  },
];

const mockPathWithLongNames: Folder[] = [
  {
    id: "folder-1",
    name: "This is a very long folder name that should be truncated",
    parentId: null,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: "user-1",
  },
];

// Wrapper component for testing
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("NoteBreadcrumb", () => {
  const defaultProps = {
    noteTitle: "My Note",
    folderId: "folder-2",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Loading state", () => {
    it("renders loading skeleton when fetching path", () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<NoteBreadcrumb {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Should show skeleton elements
      expect(screen.getByRole("generic", { busy: true })).toBeInTheDocument();
    });
  });

  describe("Empty/null folder", () => {
    it("renders nothing when folderId is null", () => {
      const { container } = render(
        <NoteBreadcrumb {...defaultProps} folderId={null} />,
        { wrapper: createWrapper() }
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Short path (no truncation)", () => {
    it("renders full path for shallow hierarchy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockShortPath }),
      });

      render(<NoteBreadcrumb {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Wait for data to load
      expect(await screen.findByText("Documents")).toBeInTheDocument();
      expect(screen.getByText("Work")).toBeInTheDocument();
      expect(screen.getByText("My Note")).toBeInTheDocument();
    });

    it("renders home icon with sr-only text", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockShortPath }),
      });

      render(<NoteBreadcrumb {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Wait for data to load
      await screen.findByText("Documents");

      // Check for home link with sr-only text
      expect(screen.getByText("Accueil")).toBeInTheDocument();
    });
  });

  describe("Long path (with truncation)", () => {
    it("truncates with dropdown for deep hierarchy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockLongPath }),
      });

      render(<NoteBreadcrumb {...defaultProps} folderId="folder-4" />, {
        wrapper: createWrapper(),
      });

      // Wait for data to load
      await screen.findByText("Documents");

      // First folder should be visible
      expect(screen.getByText("Documents")).toBeInTheDocument();

      // Last folder should be visible
      expect(screen.getByText("Phase1")).toBeInTheDocument();

      // Middle folders should be in dropdown (not directly visible)
      // The ellipsis button should be present
      const ellipsisButton = screen.getByRole("button", {
        name: /dossiers masqués/i,
      });
      expect(ellipsisButton).toBeInTheDocument();
    });

    it("shows hidden folders in dropdown when clicked", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockLongPath }),
      });

      render(<NoteBreadcrumb {...defaultProps} folderId="folder-4" />, {
        wrapper: createWrapper(),
      });

      await screen.findByText("Documents");

      // Click the ellipsis to open dropdown
      const ellipsisButton = screen.getByRole("button", {
        name: /dossiers masqués/i,
      });
      await user.click(ellipsisButton);

      // Hidden folders should now be visible in dropdown
      expect(await screen.findByRole("menuitem", { name: "Projects" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Current" })).toBeInTheDocument();
    });
  });

  describe("Navigation links", () => {
    it("home link navigates to dashboard", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockShortPath }),
      });

      render(<NoteBreadcrumb {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await screen.findByText("Documents");

      // Find the home link (contains Accueil sr-only text)
      const homeLink = screen.getByRole("link", { name: /accueil/i });
      expect(homeLink).toHaveAttribute("href", "/dashboard");
    });

    it("folder links navigate to dashboard with folderId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockShortPath }),
      });

      render(<NoteBreadcrumb {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await screen.findByText("Documents");

      // Check folder links have correct hrefs
      const documentsLink = screen.getByRole("link", { name: "Documents" });
      expect(documentsLink).toHaveAttribute(
        "href",
        "/dashboard?folderId=folder-1"
      );

      const workLink = screen.getByRole("link", { name: "Work" });
      expect(workLink).toHaveAttribute("href", "/dashboard?folderId=folder-2");
    });
  });

  describe("Current note (non-clickable)", () => {
    it("renders note title without link", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockShortPath }),
      });

      render(<NoteBreadcrumb {...defaultProps} noteTitle="My Note" />, {
        wrapper: createWrapper(),
      });

      await screen.findByText("Documents");

      // Note title should be present but not as a link
      const noteElement = screen.getByText("My Note");
      expect(noteElement).toBeInTheDocument();
      expect(noteElement.closest("a")).toBeNull();
    });
  });

  describe("Long folder names truncation", () => {
    it("truncates long folder names with ellipsis", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPathWithLongNames }),
      });

      render(<NoteBreadcrumb {...defaultProps} folderId="folder-1" />, {
        wrapper: createWrapper(),
      });

      await screen.findByText(/This is a very long/);

      // Should show truncated text
      const folderLink = screen.getByRole("link", { name: /This is a very long/ });
      expect(folderLink).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has correct aria labels for navigation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockShortPath }),
      });

      render(<NoteBreadcrumb {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await screen.findByText("Documents");

      // Check for nav with aria-label
      const nav = screen.getByRole("navigation", { name: /fil d'ariane/i });
      expect(nav).toBeInTheDocument();
    });

    it("current page has aria-current attribute", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockShortPath }),
      });

      render(<NoteBreadcrumb {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await screen.findByText("Documents");

      // The note title should have aria-current="page"
      const currentPage = screen.getByText("My Note");
      expect(currentPage).toHaveAttribute("aria-current", "page");
    });
  });

  describe("Error handling", () => {
    it("renders nothing on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
        json: async () => ({ detail: "Dossier non trouvé" }),
      });

      const { container } = render(<NoteBreadcrumb {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Wait for error state
      await vi.waitFor(() => {
        // After error, component should render nothing
        expect(container.querySelector("nav")).toBeNull();
      });
    });
  });
});

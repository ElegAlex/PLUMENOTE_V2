/**
 * Unit tests for TagsPanel component
 *
 * Tests tag display and add/remove interactions.
 *
 * @see Story 3.6: Métadonnées et Tags
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TagsPanel } from "./TagsPanel";
import type { Tag } from "../types";
import type { ReactNode } from "react";

// Mock ResizeObserver for cmdk Command component
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// Mock fetch for useTags
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockTags: Tag[] = [
  { id: "tag-1", name: "work", color: "#3b82f6" },
  { id: "tag-2", name: "personal", color: "#22c55e" },
];

const allTags: Tag[] = [
  ...mockTags,
  { id: "tag-3", name: "urgent", color: "#ef4444" },
];

describe("TagsPanel", () => {
  let queryClient: QueryClient;

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    mockFetch.mockReset();

    // Default mock for fetching all tags
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: allTags }),
    });
  });

  it("should render current tags as chips", () => {
    const onTagsChange = vi.fn();
    render(
      <TagsPanel tags={mockTags} onTagsChange={onTagsChange} />,
      { wrapper }
    );

    expect(screen.getByText("work")).toBeInTheDocument();
    expect(screen.getByText("personal")).toBeInTheDocument();
  });

  it("should show 'Aucun tag' when no tags", () => {
    const onTagsChange = vi.fn();
    render(
      <TagsPanel tags={[]} onTagsChange={onTagsChange} />,
      { wrapper }
    );

    expect(screen.getByText("Aucun tag")).toBeInTheDocument();
  });

  it("should show add button with Plus icon when not disabled", () => {
    const onTagsChange = vi.fn();
    render(
      <TagsPanel tags={mockTags} onTagsChange={onTagsChange} />,
      { wrapper }
    );

    // Find the button containing "Tag" text (the add button)
    expect(screen.getByText("Tag")).toBeInTheDocument();
  });

  it("should not show add button when disabled", () => {
    const onTagsChange = vi.fn();
    render(
      <TagsPanel tags={mockTags} onTagsChange={onTagsChange} disabled />,
      { wrapper }
    );

    expect(screen.queryByText("Tag")).not.toBeInTheDocument();
  });

  it("should call onTagsChange when tag is removed", () => {
    const onTagsChange = vi.fn();
    render(
      <TagsPanel tags={mockTags} onTagsChange={onTagsChange} />,
      { wrapper }
    );

    // Click remove button on first tag (work)
    const removeButtons = screen.getAllByLabelText(/supprimer le tag/i);
    fireEvent.click(removeButtons[0]);

    expect(onTagsChange).toHaveBeenCalledWith(["tag-2"]);
  });

  it("should not show remove buttons when disabled", () => {
    const onTagsChange = vi.fn();
    render(
      <TagsPanel tags={mockTags} onTagsChange={onTagsChange} disabled />,
      { wrapper }
    );

    expect(screen.queryByLabelText(/supprimer le tag/i)).not.toBeInTheDocument();
  });

  it("should show tag input when add button is clicked", () => {
    const onTagsChange = vi.fn();
    render(
      <TagsPanel tags={mockTags} onTagsChange={onTagsChange} />,
      { wrapper }
    );

    // Click the "+ Tag" button
    fireEvent.click(screen.getByText("Tag"));

    // Should show the input
    expect(screen.getByPlaceholderText(/rechercher/i)).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KeyboardShortcutsProvider } from "./KeyboardShortcutsProvider";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useNotes hook
const mockCreateNoteAsync = vi.fn();
vi.mock("@/features/notes/hooks/useNotes", () => ({
  useNotes: () => ({
    createNoteAsync: mockCreateNoteAsync,
    isCreating: false,
  }),
}));

describe("KeyboardShortcutsProvider", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithProviders = (children: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
      </QueryClientProvider>
    );
  };

  it("renders children correctly", () => {
    const { getByText } = renderWithProviders(<div>Test Content</div>);
    expect(getByText("Test Content")).toBeInTheDocument();
  });

  it("creates note and redirects on Ctrl+N", async () => {
    const mockNote = { id: "test-note-id" };
    mockCreateNoteAsync.mockResolvedValueOnce(mockNote);

    renderWithProviders(<div>Test</div>);

    const event = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    await waitFor(() => {
      expect(mockCreateNoteAsync).toHaveBeenCalledWith({});
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/notes/test-note-id");
    });
  });

  it("handles error when note creation fails", async () => {
    const { toast } = await import("sonner");
    mockCreateNoteAsync.mockRejectedValueOnce(new Error("Creation failed"));

    renderWithProviders(<div>Test</div>);

    const event = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Echec de la creation", {
        description: "Impossible de creer la note.",
      });
    });
  });

  it("prevents multiple rapid creations", async () => {
    // Make the first call take some time
    mockCreateNoteAsync.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: "1" }), 100))
    );

    renderWithProviders(<div>Test</div>);

    // Fire two rapid Ctrl+N events
    const event1 = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      bubbles: true,
    });
    const event2 = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      bubbles: true,
    });

    window.dispatchEvent(event1);
    window.dispatchEvent(event2);

    await waitFor(() => {
      // Should only be called once due to race condition prevention
      expect(mockCreateNoteAsync).toHaveBeenCalledTimes(1);
    });
  });
});

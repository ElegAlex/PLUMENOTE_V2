/**
 * Tests for NewNoteButton component
 *
 * @see Story 7.2: Creation de Note depuis Template
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { NewNoteButton } from "./NewNoteButton";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("NewNoteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for templates fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("rendering", () => {
    it("should render button with label by default", () => {
      render(<NewNoteButton />, { wrapper: createWrapper() });
      expect(screen.getByText("Nouvelle note")).toBeInTheDocument();
    });

    it("should render button without label when showLabel is false", () => {
      render(<NewNoteButton showLabel={false} />, { wrapper: createWrapper() });
      expect(screen.queryByText("Nouvelle note")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Créer une nouvelle note")).toBeInTheDocument();
    });

    it("should have accessible button trigger", () => {
      render(<NewNoteButton />, { wrapper: createWrapper() });
      const trigger = screen.getByRole("button", { name: /Créer une nouvelle note/i });
      expect(trigger).toBeInTheDocument();
    });
  });

  describe("dropdown menu", () => {
    it("should show dropdown menu on click", async () => {
      const user = userEvent.setup();
      render(<NewNoteButton />, { wrapper: createWrapper() });

      await user.click(screen.getByRole("button"));

      // Radix dropdown renders in a portal, use findBy for async
      expect(await screen.findByRole("menuitem", { name: /Note vide/i })).toBeInTheDocument();
      expect(await screen.findByRole("menuitem", { name: /Depuis un template/i })).toBeInTheDocument();
    });

    it("should navigate to /notes/new when 'Note vide' is clicked", async () => {
      const user = userEvent.setup();
      render(<NewNoteButton />, { wrapper: createWrapper() });

      await user.click(screen.getByRole("button"));
      const noteVideOption = await screen.findByRole("menuitem", { name: /Note vide/i });
      await user.click(noteVideOption);

      expect(mockPush).toHaveBeenCalledWith("/notes/new");
    });

    it("should open template dialog when 'Depuis un template' is clicked", async () => {
      const user = userEvent.setup();
      render(<NewNoteButton />, { wrapper: createWrapper() });

      await user.click(screen.getByRole("button"));
      const templateOption = await screen.findByRole("menuitem", { name: /Depuis un template/i });
      await user.click(templateOption);

      // Dialog should open
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Choisir un template")).toBeInTheDocument();
    });
  });

  describe("template selection", () => {
    it("should create note with template content and navigate", async () => {
      const user = userEvent.setup();
      const mockNote = { id: "note-123", title: "Sans titre", content: "Template content" };

      // First call: templates fetch, Second call: create note
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "tpl-1",
                name: "Test Template",
                description: "Test",
                content: "Template content",
                icon: "file-text",
                isSystem: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdById: null,
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockNote }),
        });

      render(<NewNoteButton />, { wrapper: createWrapper() });

      // Open dropdown
      await user.click(screen.getByRole("button"));
      const templateOption = await screen.findByRole("menuitem", { name: /Depuis un template/i });
      await user.click(templateOption);

      // Wait for dialog and templates to load
      await waitFor(() => {
        expect(screen.getByText("Test Template")).toBeInTheDocument();
      });

      // Select template
      await user.click(screen.getByLabelText(/Sélectionner le template Test Template/));

      // Should create note with template content
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/notes", expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ title: "Sans titre", content: "Template content" }),
        }));
      });

      // Should navigate to new note
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/notes/note-123");
      });
    });

    it("should call onNoteCreated callback after note creation", async () => {
      const user = userEvent.setup();
      const onNoteCreated = vi.fn();
      const mockNote = { id: "note-456", title: "Sans titre", content: "" };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }), // Empty templates
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockNote }),
        });

      render(<NewNoteButton onNoteCreated={onNoteCreated} />, { wrapper: createWrapper() });

      // Open dropdown and template dialog
      await user.click(screen.getByRole("button"));
      const templateOption = await screen.findByRole("menuitem", { name: /Depuis un template/i });
      await user.click(templateOption);

      // Wait for dialog to open and select "Note vide"
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Select "Note vide" from the dialog
      await user.click(screen.getByLabelText(/Sélectionner le template Note vide/));

      await waitFor(() => {
        expect(onNoteCreated).toHaveBeenCalledWith("note-456");
      });
    });
  });

  describe("error handling", () => {
    it("should show error toast when note creation fails", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ detail: "Creation failed" }),
        });

      render(<NewNoteButton />, { wrapper: createWrapper() });

      // Open dropdown and template dialog
      await user.click(screen.getByRole("button"));
      const templateOption = await screen.findByRole("menuitem", { name: /Depuis un template/i });
      await user.click(templateOption);

      // Select empty note from dialog
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      await user.click(screen.getByLabelText(/Sélectionner le template Note vide/));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Creation failed");
      });
    });
  });
});

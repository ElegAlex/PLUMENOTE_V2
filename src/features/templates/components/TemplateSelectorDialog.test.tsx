/**
 * Tests for TemplateSelectorDialog component
 *
 * @see Story 7.2: Creation de Note depuis Template
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TemplateSelectorDialog } from "./TemplateSelectorDialog";
import type { Template } from "../types";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample templates for testing
const mockTemplates: Template[] = [
  {
    id: "tpl-1",
    name: "Fiche Serveur",
    description: "Template pour documenter un serveur",
    content: "# {{nom}}\n\n## Informations",
    icon: "server",
    isSystem: true,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: null,
  },
  {
    id: "tpl-2",
    name: "Procedure",
    description: "Template pour une procedure",
    content: "# Procedure\n\n## Etapes",
    icon: "list-checks",
    isSystem: true,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    createdById: null,
  },
];

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

describe("TemplateSelectorDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: successful fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockTemplates }),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("rendering", () => {
    it("should render dialog when open", async () => {
      render(
        <TemplateSelectorDialog
          open={true}
          onOpenChange={vi.fn()}
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Choisir un template")).toBeInTheDocument();
    });

    it("should not render dialog when closed", () => {
      render(
        <TemplateSelectorDialog
          open={false}
          onOpenChange={vi.fn()}
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should display templates list when loaded", async () => {
      render(
        <TemplateSelectorDialog
          open={true}
          onOpenChange={vi.fn()}
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("Fiche Serveur")).toBeInTheDocument();
        expect(screen.getByText("Procedure")).toBeInTheDocument();
      });
    });

    it("should show loading state with skeletons", async () => {
      // Make fetch hang to show loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(
        <TemplateSelectorDialog
          open={true}
          onOpenChange={vi.fn()}
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Should show skeleton loaders
      const skeletons = screen.getAllByTestId("template-skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should show empty state when no templates", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(
        <TemplateSelectorDialog
          open={true}
          onOpenChange={vi.fn()}
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("Aucun template disponible")).toBeInTheDocument();
      });
    });

    it("should show error state when fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: "Server error" }),
      });

      render(
        <TemplateSelectorDialog
          open={true}
          onOpenChange={vi.fn()}
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/Erreur lors du chargement/)).toBeInTheDocument();
      });
    });
  });

  describe("interaction", () => {
    it("should call onSelect with template content when template clicked", async () => {
      const onSelect = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <TemplateSelectorDialog
          open={true}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("Fiche Serveur")).toBeInTheDocument();
      });

      // Click on a template
      fireEvent.click(screen.getByLabelText(/Sélectionner le template Fiche Serveur/));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith("# {{nom}}\n\n## Informations");
      // Dialog should close after selection
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should close dialog when close button clicked", async () => {
      const onOpenChange = vi.fn();

      render(
        <TemplateSelectorDialog
          open={true}
          onOpenChange={onOpenChange}
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("Fiche Serveur")).toBeInTheDocument();
      });

      // Click close button
      fireEvent.click(screen.getByRole("button", { name: /close/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should close dialog on Escape key", async () => {
      const onOpenChange = vi.fn();

      render(
        <TemplateSelectorDialog
          open={true}
          onOpenChange={onOpenChange}
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("Fiche Serveur")).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("empty note option", () => {
    it("should show 'Note vide' option", async () => {
      render(
        <TemplateSelectorDialog
          open={true}
          onOpenChange={vi.fn()}
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("Note vide")).toBeInTheDocument();
      });
    });

    it("should call onSelect with empty string when 'Note vide' clicked", async () => {
      const onSelect = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <TemplateSelectorDialog
          open={true}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText("Note vide")).toBeInTheDocument();
      });

      // Click on 'Note vide' option
      fireEvent.click(screen.getByLabelText(/Sélectionner le template Note vide/));

      expect(onSelect).toHaveBeenCalledWith("");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

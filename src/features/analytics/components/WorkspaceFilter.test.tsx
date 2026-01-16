/**
 * @vitest-environment jsdom
 * Tests for WorkspaceFilter component
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkspaceFilter } from "./WorkspaceFilter";

// Mock useWorkspaces hook
vi.mock("@/features/workspaces/hooks/useWorkspaces", () => ({
  useWorkspaces: vi.fn(),
}));

import { useWorkspaces } from "@/features/workspaces/hooks/useWorkspaces";

const mockUseWorkspaces = vi.mocked(useWorkspaces);

describe("WorkspaceFilter", () => {
  const mockWorkspaces = {
    data: {
      data: [
        { id: "ws-1", name: "Team Alpha" },
        { id: "ws-2", name: "Project Beta" },
        { id: "ws-3", name: "Personal" },
      ],
    },
    isLoading: false,
  };

  const defaultProps = {
    value: null,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkspaces.mockReturnValue(mockWorkspaces as ReturnType<typeof useWorkspaces>);
  });

  describe("rendering", () => {
    it("should render select trigger", () => {
      render(<WorkspaceFilter {...defaultProps} />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("should show 'Tous les workspaces' when value is null", () => {
      render(<WorkspaceFilter {...defaultProps} value={null} />);
      expect(screen.getByText("Tous les workspaces")).toBeInTheDocument();
    });

    it("should show workspace icon", () => {
      render(<WorkspaceFilter {...defaultProps} />);
      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it("should have fixed width class", () => {
      render(<WorkspaceFilter {...defaultProps} />);
      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveClass("w-48");
    });
  });

  describe("loading state", () => {
    it("should show skeleton when loading", () => {
      mockUseWorkspaces.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useWorkspaces>);

      const { container } = render(<WorkspaceFilter {...defaultProps} />);

      // Skeleton uses animate-pulse class
      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("should not show select when loading", () => {
      mockUseWorkspaces.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useWorkspaces>);

      render(<WorkspaceFilter {...defaultProps} />);
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("should have correct skeleton dimensions", () => {
      mockUseWorkspaces.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useWorkspaces>);

      const { container } = render(<WorkspaceFilter {...defaultProps} />);

      const skeleton = container.querySelector(".h-10.w-48");
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("props handling", () => {
    it("should accept value prop", () => {
      // Should not throw with any value
      expect(() => render(<WorkspaceFilter value="ws-1" onChange={vi.fn()} />)).not.toThrow();
    });

    it("should accept null value", () => {
      expect(() => render(<WorkspaceFilter value={null} onChange={vi.fn()} />)).not.toThrow();
    });

    it("should accept onChange callback", () => {
      const onChange = vi.fn();
      expect(() => render(<WorkspaceFilter value={null} onChange={onChange} />)).not.toThrow();
    });
  });

  describe("workspaces hook integration", () => {
    it("should call useWorkspaces hook", () => {
      render(<WorkspaceFilter {...defaultProps} />);
      expect(mockUseWorkspaces).toHaveBeenCalled();
    });

    it("should handle empty workspaces", () => {
      mockUseWorkspaces.mockReturnValue({
        data: { data: [] },
        isLoading: false,
      } as ReturnType<typeof useWorkspaces>);

      render(<WorkspaceFilter {...defaultProps} />);
      // Should still render without error
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("should handle undefined data", () => {
      mockUseWorkspaces.mockReturnValue({
        data: undefined,
        isLoading: false,
      } as ReturnType<typeof useWorkspaces>);

      render(<WorkspaceFilter {...defaultProps} />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });
});

/**
 * NoteModificationInfo Component Tests
 *
 * @see Story 10.3: Affichage Date de Modification et Contributeur (FR44, FR45)
 * @see AC #1: Date de modification affichée
 * @see AC #3: Contributeur affiché
 * @see AC #5: Fallback vers createdBy si jamais modifiée
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NoteModificationInfo } from "./NoteModificationInfo";

// Mock child components to simplify testing
vi.mock("./ModificationDate", () => ({
  ModificationDate: ({ date, variant }: { date: Date | string; variant?: string }) => (
    <span data-testid="modification-date" data-variant={variant}>
      Mocked Date: {typeof date === "string" ? date : date.toISOString()}
    </span>
  ),
}));

vi.mock("./LastModifiedBy", () => ({
  LastModifiedBy: ({ user, variant }: { user: { name: string } | null; variant?: string }) => (
    user ? (
      <span data-testid="last-modified-by" data-variant={variant}>
        Mocked User: {user.name}
      </span>
    ) : null
  ),
}));

describe("NoteModificationInfo", () => {
  const testDate = new Date("2026-01-16T14:30:00.000Z");
  const mockLastModifiedBy = { id: "user-1", name: "John Doe", image: null };
  const mockCreatedBy = { id: "user-2", name: "Jane Smith", image: null };

  describe("rendering", () => {
    it("should render modification date", () => {
      render(
        <NoteModificationInfo
          updatedAt={testDate}
          lastModifiedBy={mockLastModifiedBy}
        />
      );
      expect(screen.getByTestId("modification-date")).toBeInTheDocument();
    });

    it("should render lastModifiedBy when provided", () => {
      render(
        <NoteModificationInfo
          updatedAt={testDate}
          lastModifiedBy={mockLastModifiedBy}
        />
      );
      expect(screen.getByTestId("last-modified-by")).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it("should render 'par' text between date and contributor", () => {
      render(
        <NoteModificationInfo
          updatedAt={testDate}
          lastModifiedBy={mockLastModifiedBy}
        />
      );
      expect(screen.getByText("par")).toBeInTheDocument();
    });

    it("should fallback to createdBy when lastModifiedBy is null", () => {
      render(
        <NoteModificationInfo
          updatedAt={testDate}
          lastModifiedBy={null}
          createdBy={mockCreatedBy}
        />
      );
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    });

    it("should not render contributor section when both are null", () => {
      render(
        <NoteModificationInfo
          updatedAt={testDate}
          lastModifiedBy={null}
          createdBy={null}
        />
      );
      expect(screen.queryByTestId("last-modified-by")).not.toBeInTheDocument();
      expect(screen.queryByText("par")).not.toBeInTheDocument();
    });
  });

  describe("variants", () => {
    it("should render Clock icon in default variant", () => {
      const { container } = render(
        <NoteModificationInfo
          updatedAt={testDate}
          lastModifiedBy={mockLastModifiedBy}
          variant="default"
        />
      );
      // Clock icon from lucide-react
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should not render Clock icon in compact variant", () => {
      const { container } = render(
        <NoteModificationInfo
          updatedAt={testDate}
          lastModifiedBy={mockLastModifiedBy}
          variant="compact"
        />
      );
      expect(container.querySelector("svg")).not.toBeInTheDocument();
    });

    it("should pass variant to child components", () => {
      render(
        <NoteModificationInfo
          updatedAt={testDate}
          lastModifiedBy={mockLastModifiedBy}
          variant="compact"
        />
      );
      expect(screen.getByTestId("modification-date")).toHaveAttribute(
        "data-variant",
        "compact"
      );
      expect(screen.getByTestId("last-modified-by")).toHaveAttribute(
        "data-variant",
        "compact"
      );
    });
  });

  describe("styling", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <NoteModificationInfo
          updatedAt={testDate}
          lastModifiedBy={mockLastModifiedBy}
          className="custom-class"
        />
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("should have flex layout", () => {
      const { container } = render(
        <NoteModificationInfo
          updatedAt={testDate}
          lastModifiedBy={mockLastModifiedBy}
        />
      );
      expect(container.firstChild).toHaveClass("flex");
      expect(container.firstChild).toHaveClass("items-center");
    });
  });

  describe("accessibility", () => {
    it("should have aria-hidden on decorative Clock icon", () => {
      const { container } = render(
        <NoteModificationInfo
          updatedAt={testDate}
          lastModifiedBy={mockLastModifiedBy}
          variant="default"
        />
      );
      const icon = container.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });
});

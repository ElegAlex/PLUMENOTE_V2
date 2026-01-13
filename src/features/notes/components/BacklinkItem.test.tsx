/**
 * Tests for BacklinkItem component
 *
 * @see Story 6.7: Panneau Backlinks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BacklinkItem } from "./BacklinkItem";

describe("BacklinkItem", () => {
  // Mock Date for consistent relative date testing
  const mockNow = new Date("2026-01-13T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders title correctly", () => {
    render(
      <BacklinkItem
        title="Test Note"
        context={null}
        updatedAt="2026-01-13T11:00:00Z"
        onClick={() => {}}
      />
    );

    expect(screen.getByText("Test Note")).toBeInTheDocument();
  });

  it("renders context when provided", () => {
    render(
      <BacklinkItem
        title="Test Note"
        context="Project Reference"
        updatedAt="2026-01-13T11:00:00Z"
        onClick={() => {}}
      />
    );

    expect(screen.getByText("Test Note")).toBeInTheDocument();
    expect(screen.getByText("Lié comme: Project Reference")).toBeInTheDocument();
  });

  it("does not render context when null", () => {
    render(
      <BacklinkItem
        title="Test Note"
        context={null}
        updatedAt="2026-01-13T11:00:00Z"
        onClick={() => {}}
      />
    );

    expect(screen.queryByText(/Lié comme:/)).not.toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(
      <BacklinkItem
        title="Test Note"
        context={null}
        updatedAt="2026-01-13T11:00:00Z"
        onClick={handleClick}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("has correct aria-label for accessibility", () => {
    render(
      <BacklinkItem
        title="My Note Title"
        context={null}
        updatedAt="2026-01-13T11:00:00Z"
        onClick={() => {}}
      />
    );

    expect(
      screen.getByRole("button", { name: "Ouvrir la note My Note Title" })
    ).toBeInTheDocument();
  });

  it("renders FileText icon", () => {
    render(
      <BacklinkItem
        title="Test Note"
        context={null}
        updatedAt="2026-01-13T11:00:00Z"
        onClick={() => {}}
      />
    );

    // Icon is rendered with aria-hidden
    const button = screen.getByRole("button");
    const svg = button.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("applies custom className", () => {
    render(
      <BacklinkItem
        title="Test Note"
        context={null}
        updatedAt="2026-01-13T11:00:00Z"
        onClick={() => {}}
        className="custom-class"
      />
    );

    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });

  describe("relative date display (AC #2)", () => {
    it("displays 'à l'instant' for very recent updates", () => {
      render(
        <BacklinkItem
          title="Test Note"
          context={null}
          updatedAt="2026-01-13T11:59:30Z"
          onClick={() => {}}
        />
      );

      expect(screen.getByText("à l'instant")).toBeInTheDocument();
    });

    it("displays minutes for updates less than an hour ago", () => {
      render(
        <BacklinkItem
          title="Test Note"
          context={null}
          updatedAt="2026-01-13T11:30:00Z"
          onClick={() => {}}
        />
      );

      expect(screen.getByText("il y a 30 min")).toBeInTheDocument();
    });

    it("displays hours for updates less than a day ago", () => {
      render(
        <BacklinkItem
          title="Test Note"
          context={null}
          updatedAt="2026-01-13T09:00:00Z"
          onClick={() => {}}
        />
      );

      expect(screen.getByText("il y a 3h")).toBeInTheDocument();
    });

    it("displays days for updates less than a week ago", () => {
      render(
        <BacklinkItem
          title="Test Note"
          context={null}
          updatedAt="2026-01-11T12:00:00Z"
          onClick={() => {}}
        />
      );

      expect(screen.getByText("il y a 2j")).toBeInTheDocument();
    });

    it("displays formatted date for updates older than a week", () => {
      render(
        <BacklinkItem
          title="Test Note"
          context={null}
          updatedAt="2026-01-01T12:00:00Z"
          onClick={() => {}}
        />
      );

      // French locale date format
      expect(screen.getByText("1 janv.")).toBeInTheDocument();
    });
  });
});

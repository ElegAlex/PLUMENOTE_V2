/**
 * Unit tests for SyncStatusIndicator component
 *
 * Tests the visual indicator for collaboration sync status.
 *
 * @see Story 4-3: Edition Simultanee
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import type { ConnectionStatus } from "../hooks/useCollaboration";

describe("SyncStatusIndicator", () => {
  it("should display disconnected status", () => {
    render(<SyncStatusIndicator status="disconnected" />);

    expect(screen.getByText("Déconnecté")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("text-destructive");
  });

  it("should display connecting status with spinner", () => {
    render(<SyncStatusIndicator status="connecting" />);

    expect(screen.getByText("Connexion...")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("text-yellow-500");
  });

  it("should display connected status", () => {
    render(<SyncStatusIndicator status="connected" />);

    expect(screen.getByText("Connecté")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("text-blue-500");
  });

  it("should display synced status", () => {
    render(<SyncStatusIndicator status="synced" />);

    expect(screen.getByText("Synchronisé")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("text-green-500");
  });

  it("should display error state when error is provided", () => {
    render(<SyncStatusIndicator status="connected" error="Connection lost" />);

    expect(screen.getByText("Erreur: Connection lost")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("text-destructive");
  });

  it("should apply custom className", () => {
    const { container } = render(
      <SyncStatusIndicator status="synced" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should have accessible role and aria-live", () => {
    render(<SyncStatusIndicator status="synced" />);

    const statusElement = screen.getByRole("status");
    expect(statusElement).toHaveAttribute("aria-live", "polite");
  });

  it("should prioritize error state over status", () => {
    render(<SyncStatusIndicator status="synced" error="Something went wrong" />);

    // Error should be displayed instead of synced status
    expect(screen.getByText(/Erreur:/)).toBeInTheDocument();
    expect(screen.queryByText("Synchronisé")).not.toBeInTheDocument();
  });

  it.each<ConnectionStatus>([
    "disconnected",
    "connecting",
    "connected",
    "synced",
  ])("should render correctly for status: %s", (status) => {
    const { container } = render(<SyncStatusIndicator status={status} />);

    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

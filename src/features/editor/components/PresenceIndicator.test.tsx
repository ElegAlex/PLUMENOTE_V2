/**
 * Unit tests for PresenceIndicator component
 *
 * Tests avatar display, activity indicators, and accessibility.
 * Co-located with PresenceIndicator.tsx per project conventions.
 *
 * @see Story 4-5: Indicateur de Presence
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PresenceIndicator } from "./PresenceIndicator";
import { type PresenceUser } from "../hooks/usePresence";

const createUser = (overrides: Partial<PresenceUser> = {}): PresenceUser => ({
  clientId: 1,
  name: "Test User",
  color: "#ff0000",
  isActive: true,
  lastActivity: Date.now(),
  ...overrides,
});

describe("PresenceIndicator", () => {
  describe("rendering", () => {
    it("should render nothing when users array is empty", () => {
      const { container } = render(<PresenceIndicator users={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("should render avatars for each user", () => {
      const users = [
        createUser({ clientId: 1, name: "Alice" }),
        createUser({ clientId: 2, name: "Bob" }),
      ];

      render(<PresenceIndicator users={users} />);

      expect(screen.getByText("AL")).toBeInTheDocument();
      expect(screen.getByText("BO")).toBeInTheDocument();
    });

    it("should show correct initials for two-word names", () => {
      const users = [createUser({ name: "John Doe" })];

      render(<PresenceIndicator users={users} />);

      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should show first two letters for single-word names", () => {
      const users = [createUser({ name: "Alice" })];

      render(<PresenceIndicator users={users} />);

      expect(screen.getByText("AL")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const users = [createUser()];

      render(<PresenceIndicator users={users} className="custom-class" />);

      const container = screen.getByRole("group");
      expect(container).toHaveClass("custom-class");
    });

    it("should handle empty name with fallback initials", () => {
      const users = [createUser({ name: "" })];

      render(<PresenceIndicator users={users} />);

      expect(screen.getByText("??")).toBeInTheDocument();
    });

    it("should handle single character name by doubling it", () => {
      const users = [createUser({ name: "A" })];

      render(<PresenceIndicator users={users} />);

      expect(screen.getByText("AA")).toBeInTheDocument();
    });

    it("should handle whitespace-only name with fallback", () => {
      const users = [createUser({ name: "   " })];

      render(<PresenceIndicator users={users} />);

      expect(screen.getByText("??")).toBeInTheDocument();
    });

    it("should handle names with special characters", () => {
      const users = [createUser({ name: "José García" })];

      render(<PresenceIndicator users={users} />);

      expect(screen.getByText("JG")).toBeInTheDocument();
    });
  });

  describe("activity indicators", () => {
    it("should show green ring for active users", () => {
      const users = [createUser({ isActive: true })];

      render(<PresenceIndicator users={users} />);

      const avatar = screen.getByRole("img");
      const avatarElement = avatar.querySelector('[data-slot="avatar"]');
      expect(avatarElement).toHaveClass("ring-green-500");
    });

    it("should show gray ring for inactive users", () => {
      const users = [createUser({ isActive: false })];

      render(<PresenceIndicator users={users} />);

      const avatar = screen.getByRole("img");
      const avatarElement = avatar.querySelector('[data-slot="avatar"]');
      expect(avatarElement).toHaveClass("ring-gray-300");
    });

    it("should have reduced opacity for inactive users", () => {
      const users = [createUser({ isActive: false })];

      render(<PresenceIndicator users={users} />);

      const avatar = screen.getByRole("img");
      const avatarElement = avatar.querySelector('[data-slot="avatar"]');
      expect(avatarElement).toHaveClass("opacity-70");
    });
  });

  describe("maxVisible", () => {
    it("should only show maxVisible users", () => {
      const users = [
        createUser({ clientId: 1, name: "Alice" }),
        createUser({ clientId: 2, name: "Bob" }),
        createUser({ clientId: 3, name: "Charlie" }),
      ];

      render(<PresenceIndicator users={users} maxVisible={2} />);

      expect(screen.getByText("AL")).toBeInTheDocument();
      expect(screen.getByText("BO")).toBeInTheDocument();
      expect(screen.queryByText("CH")).not.toBeInTheDocument();
    });

    it("should show +N indicator for hidden users", () => {
      const users = [
        createUser({ clientId: 1, name: "Alice" }),
        createUser({ clientId: 2, name: "Bob" }),
        createUser({ clientId: 3, name: "Charlie" }),
      ];

      render(<PresenceIndicator users={users} maxVisible={2} />);

      expect(screen.getByText("+1")).toBeInTheDocument();
    });

    it("should not show +N indicator when all users are visible", () => {
      const users = [
        createUser({ clientId: 1, name: "Alice" }),
        createUser({ clientId: 2, name: "Bob" }),
      ];

      render(<PresenceIndicator users={users} maxVisible={5} />);

      expect(screen.queryByText(/\+\d+/)).not.toBeInTheDocument();
    });

    it("should use default maxVisible of 5", () => {
      const users = Array.from({ length: 7 }, (_, i) =>
        createUser({ clientId: i + 1, name: `User${i + 1}` })
      );

      render(<PresenceIndicator users={users} />);

      expect(screen.getByText("+2")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have correct aria-label for user count", () => {
      const users = [
        createUser({ clientId: 1, name: "Alice" }),
        createUser({ clientId: 2, name: "Bob" }),
      ];

      render(<PresenceIndicator users={users} />);

      const group = screen.getByRole("group");
      expect(group).toHaveAttribute("aria-label", "2 utilisateurs présents");
    });

    it("should have correct aria-label for single user", () => {
      const users = [createUser({ name: "Alice" })];

      render(<PresenceIndicator users={users} />);

      const group = screen.getByRole("group");
      expect(group).toHaveAttribute("aria-label", "1 utilisateur présent");
    });

    it("should have aria-label for each user avatar with status", () => {
      const users = [
        createUser({ name: "Alice", isActive: true }),
        createUser({ clientId: 2, name: "Bob", isActive: false }),
      ];

      render(<PresenceIndicator users={users} />);

      expect(
        screen.getByRole("img", { name: "Alice - Actif" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: "Bob - Inactif" })
      ).toBeInTheDocument();
    });
  });

  describe("user color", () => {
    it("should apply user color to avatar fallback background", () => {
      const users = [createUser({ color: "#ff5733" })];

      render(<PresenceIndicator users={users} />);

      // "Test User" -> "TU" (first letters of each word)
      const fallback = screen.getByText("TU");
      expect(fallback).toHaveStyle({ backgroundColor: "#ff5733" });
    });
  });
});

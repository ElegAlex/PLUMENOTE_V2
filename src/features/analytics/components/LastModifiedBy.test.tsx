/**
 * LastModifiedBy Component Tests
 *
 * @see Story 10.3: Affichage Date de Modification et Contributeur (FR45)
 * @see AC #3: Nom du contributeur affiché avec avatar
 * @see AC #4: Lien cliquable vers profil
 * @see AC #8: Avatar par défaut (initiales) si pas d'image
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LastModifiedBy } from "./LastModifiedBy";

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  },
}));

describe("LastModifiedBy", () => {
  const mockUser = {
    id: "user-123",
    name: "John Doe",
    image: "https://example.com/avatar.jpg",
  };

  const mockUserNoImage = {
    id: "user-456",
    name: "Jane Smith",
    image: null,
  };

  const mockUserNoName = {
    id: "user-789",
    name: null,
    image: null,
  };

  describe("rendering", () => {
    it("should render nothing when user is null", () => {
      const { container } = render(<LastModifiedBy user={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("should render avatar container when user has image", () => {
      const { container } = render(<LastModifiedBy user={mockUser} />);
      // Avatar component renders with data-slot="avatar"
      const avatar = container.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
    });

    it("should render initials as fallback when user has no image", () => {
      render(<LastModifiedBy user={mockUserNoImage} />);
      expect(screen.getByText("JS")).toBeInTheDocument();
    });

    it("should render '?' as fallback when user has no name", () => {
      render(<LastModifiedBy user={mockUserNoName} />);
      expect(screen.getByText("?")).toBeInTheDocument();
    });

    it("should display user name in default variant", () => {
      render(<LastModifiedBy user={mockUser} variant="default" />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should not display user name in compact variant", () => {
      render(<LastModifiedBy user={mockUser} variant="compact" />);
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    });

    it("should display 'Utilisateur' when name is null in default variant", () => {
      render(<LastModifiedBy user={mockUserNoName} variant="default" />);
      expect(screen.getByText("Utilisateur")).toBeInTheDocument();
    });
  });

  describe("profile link", () => {
    it("should render link to user profile by default", () => {
      render(<LastModifiedBy user={mockUser} />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/settings/profile/user-123");
    });

    it("should not render link when linkToProfile is false", () => {
      render(<LastModifiedBy user={mockUser} linkToProfile={false} />);
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("initials generation", () => {
    it("should generate two-letter initials from full name", () => {
      render(<LastModifiedBy user={{ id: "1", name: "Alex Martin", image: null }} />);
      expect(screen.getByText("AM")).toBeInTheDocument();
    });

    it("should handle single word name", () => {
      render(<LastModifiedBy user={{ id: "1", name: "Alex", image: null }} />);
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("should limit initials to 2 characters", () => {
      render(<LastModifiedBy user={{ id: "1", name: "Jean Pierre Dupont", image: null }} />);
      expect(screen.getByText("JP")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <LastModifiedBy user={mockUser} className="custom-class" linkToProfile={false} />
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("should have smaller avatar in compact variant", () => {
      const { container } = render(
        <LastModifiedBy user={mockUser} variant="compact" linkToProfile={false} />
      );
      const avatarContainer = container.querySelector('[class*="h-5"]');
      expect(avatarContainer).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have avatar with accessible fallback text", () => {
      const { container } = render(<LastModifiedBy user={mockUser} />);
      // Avatar fallback contains initials for accessibility
      const fallback = container.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent("JD");
    });

    it("should be keyboard navigable when linked", () => {
      render(<LastModifiedBy user={mockUser} />);
      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
      link.focus();
      expect(link).toHaveFocus();
    });
  });
});

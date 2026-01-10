/**
 * Unit tests for UserAvatar component
 *
 * Tests avatar display with image or fallback initial.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #8: Accessible form with labels, focus visible, ARIA
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  describe('rendering with image', () => {
    it('should render image when avatar URL is provided', () => {
      render(
        <UserAvatar
          src="/uploads/avatars/test.jpg"
          name="Jean Dupont"
        />
      );

      const img = screen.getByRole('img', { name: /jean dupont/i });
      expect(img).toHaveAttribute('src');
    });

    it('should use alt text from name', () => {
      render(
        <UserAvatar
          src="/uploads/avatars/test.jpg"
          name="Marie Martin"
        />
      );

      expect(screen.getByRole('img', { name: /marie martin/i })).toBeInTheDocument();
    });
  });

  describe('rendering with fallback', () => {
    it('should show initial when no image is provided', () => {
      render(<UserAvatar name="Jean Dupont" />);

      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should show initial when src is null', () => {
      render(<UserAvatar src={null} name="Pierre Paul" />);

      expect(screen.getByText('P')).toBeInTheDocument();
    });

    it('should show question mark when no name is provided', () => {
      render(<UserAvatar />);

      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('should show question mark when name is null', () => {
      render(<UserAvatar name={null} />);

      expect(screen.getByText('?')).toBeInTheDocument();
    });
  });

  describe('sizing', () => {
    it('should use default size', () => {
      render(<UserAvatar name="Test" />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveClass('h-8', 'w-8');
    });

    it('should use small size', () => {
      render(<UserAvatar name="Test" size="sm" />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveClass('h-6', 'w-6');
    });

    it('should use medium size', () => {
      render(<UserAvatar name="Test" size="md" />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveClass('h-8', 'w-8');
    });

    it('should use large size', () => {
      render(<UserAvatar name="Test" size="lg" />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveClass('h-10', 'w-10');
    });

    it('should use extra large size', () => {
      render(<UserAvatar name="Test" size="xl" />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveClass('h-16', 'w-16');
    });
  });

  describe('accessibility', () => {
    it('should have role img on fallback', () => {
      render(<UserAvatar name="Test" />);

      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should have aria-label on fallback', () => {
      render(<UserAvatar name="Test User" />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('aria-label', 'Test User');
    });

    it('should use default aria-label when no name', () => {
      render(<UserAvatar />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('aria-label', 'Avatar');
    });
  });

  describe('custom className', () => {
    it('should merge custom className with base classes', () => {
      render(<UserAvatar name="Test" className="ring-2 ring-primary" />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveClass('ring-2', 'ring-primary');
    });
  });
});

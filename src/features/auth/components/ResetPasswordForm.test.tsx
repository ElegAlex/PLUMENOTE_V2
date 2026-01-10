/**
 * Unit tests for ResetPasswordForm component
 *
 * Tests rendering, form behavior, error states, token handling, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResetPasswordForm } from './ResetPasswordForm';

// Mock next/navigation
const mockPush = vi.fn();
const mockGet = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

// Mock the reset-password action
vi.mock('../actions/reset-password.action', () => ({
  resetPasswordAction: vi.fn(),
}));

// Mock React's useActionState
let mockState = { success: false };
const mockFormAction = vi.fn();
let mockIsPending = false;

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useActionState: () => [mockState, mockFormAction, mockIsPending],
  };
});

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { success: false };
    mockIsPending = false;
    mockGet.mockReturnValue('valid-token');
  });

  describe('rendering with token', () => {
    it('should render the reset password form with token prop', () => {
      render(<ResetPasswordForm token="test-token" />);

      // Check for card title using getAllByText and filtering
      const titles = screen.getAllByText('Nouveau mot de passe');
      expect(titles.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByLabelText('Nouveau mot de passe')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmer le mot de passe')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Modifier le mot de passe' })
      ).toBeInTheDocument();
    });

    it('should render the form with token from searchParams', () => {
      mockGet.mockReturnValue('url-token');
      render(<ResetPasswordForm />);

      // Check for card title using getAllByText
      const titles = screen.getAllByText('Nouveau mot de passe');
      expect(titles.length).toBeGreaterThanOrEqual(1);
    });

    it('should include hidden token input', () => {
      const { container } = render(<ResetPasswordForm token="test-token" />);

      const hiddenInput = container.querySelector('input[name="token"]');
      expect(hiddenInput).toHaveAttribute('value', 'test-token');
      expect(hiddenInput).toHaveAttribute('type', 'hidden');
    });

    it('should render password hint', () => {
      render(<ResetPasswordForm token="test-token" />);

      expect(screen.getByText('Minimum 8 caractères')).toBeInTheDocument();
    });

    it('should render back to login link', () => {
      render(<ResetPasswordForm token="test-token" />);

      const backLink = screen.getByRole('link', { name: 'Retour à la connexion' });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/login');
    });
  });

  describe('rendering without token', () => {
    it('should show error when no token provided', () => {
      mockGet.mockReturnValue(null);
      render(<ResetPasswordForm />);

      expect(screen.getByText('Lien invalide')).toBeInTheDocument();
      expect(
        screen.getByText(/Aucun token de réinitialisation/)
      ).toBeInTheDocument();
    });

    it('should show link to request new reset', () => {
      mockGet.mockReturnValue(null);
      render(<ResetPasswordForm />);

      const newLinkRequest = screen.getByRole('link', {
        name: 'Demander un nouveau lien',
      });
      expect(newLinkRequest).toHaveAttribute('href', '/forgot-password');
    });

    it('should not show form when no token', () => {
      mockGet.mockReturnValue(null);
      render(<ResetPasswordForm />);

      expect(screen.queryByLabelText('Nouveau mot de passe')).not.toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('should display success message after reset', () => {
      mockState = { success: true };

      render(<ResetPasswordForm token="test-token" />);

      expect(screen.getByText('Mot de passe modifié !')).toBeInTheDocument();
      expect(
        screen.getByText(/Votre mot de passe a été réinitialisé avec succès/)
      ).toBeInTheDocument();
    });

    it('should hide form after success', () => {
      mockState = { success: true };

      render(<ResetPasswordForm token="test-token" />);

      expect(
        screen.queryByLabelText('Nouveau mot de passe')
      ).not.toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('should display global error message', () => {
      mockState = {
        success: false,
        error: 'Ce lien de réinitialisation est invalide ou a expiré.',
      };

      render(<ResetPasswordForm token="test-token" />);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('invalide ou a expiré');
    });

    it('should display password field error', () => {
      mockState = {
        success: false,
        error: 'Données invalides',
        fieldErrors: {
          password: ['Le mot de passe doit contenir au moins 8 caractères'],
        },
      };

      render(<ResetPasswordForm token="test-token" />);

      expect(
        screen.getByText('Le mot de passe doit contenir au moins 8 caractères')
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Nouveau mot de passe')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });

    it('should display confirm password mismatch error', () => {
      mockState = {
        success: false,
        error: 'Données invalides',
        fieldErrors: {
          confirmPassword: ['Les mots de passe ne correspondent pas'],
        },
      };

      render(<ResetPasswordForm token="test-token" />);

      expect(
        screen.getByText('Les mots de passe ne correspondent pas')
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmer le mot de passe')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });
  });

  describe('accessibility', () => {
    it('should have accessible form elements', () => {
      render(<ResetPasswordForm token="test-token" />);

      const passwordInput = screen.getByLabelText('Nouveau mot de passe');
      const confirmInput = screen.getByLabelText('Confirmer le mot de passe');

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
      expect(confirmInput).toHaveAttribute('type', 'password');
      expect(confirmInput).toHaveAttribute('autocomplete', 'new-password');
    });

    it('should have required password fields', () => {
      render(<ResetPasswordForm token="test-token" />);

      expect(screen.getByLabelText('Nouveau mot de passe')).toBeRequired();
      expect(screen.getByLabelText('Confirmer le mot de passe')).toBeRequired();
    });

    it('should have aria-describedby on password with hint', () => {
      render(<ResetPasswordForm token="test-token" />);

      const passwordInput = screen.getByLabelText('Nouveau mot de passe');
      // Hint is always included, error is added when present
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-hint');
    });

    it('should combine hint and error in aria-describedby when error exists', () => {
      mockState = {
        success: false,
        error: 'Données invalides',
        fieldErrors: {
          password: ['Le mot de passe doit contenir au moins 8 caractères'],
        },
      };

      render(<ResetPasswordForm token="test-token" />);

      const passwordInput = screen.getByLabelText('Nouveau mot de passe');
      // Both hint and error should be referenced for accessibility
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-hint password-error');
    });

    it('should have role="alert" on error messages', () => {
      mockState = {
        success: false,
        error: 'Une erreur est survenue',
      };

      render(<ResetPasswordForm token="test-token" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have role="alert" on success message', () => {
      mockState = { success: true };

      render(<ResetPasswordForm token="test-token" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('should have form element', () => {
      const { container } = render(<ResetPasswordForm token="test-token" />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });
});

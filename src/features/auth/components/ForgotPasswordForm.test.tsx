/**
 * Unit tests for ForgotPasswordForm component
 *
 * Tests rendering, form behavior, error states, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ForgotPasswordForm } from './ForgotPasswordForm';

// Mock the forgot-password action
vi.mock('../actions/forgot-password.action', () => ({
  forgotPasswordAction: vi.fn(),
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

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { success: false };
    mockIsPending = false;
  });

  describe('rendering', () => {
    it('should render the forgot password form', () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByText('Mot de passe oublié')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Envoyer le lien de réinitialisation' })
      ).toBeInTheDocument();
    });

    it('should render back to login link', () => {
      render(<ForgotPasswordForm />);

      const backLink = screen.getByRole('link', { name: 'Retour à la connexion' });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/login');
    });

    it('should have accessible form elements', () => {
      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });

    it('should have required email field', () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByLabelText('Email')).toBeRequired();
    });
  });

  describe('success state', () => {
    it('should display success message after submission', () => {
      mockState = {
        success: true,
        message: 'Si un compte existe avec cet email, vous recevrez un lien.',
      };

      render(<ForgotPasswordForm />);

      expect(screen.getByText('Email envoyé !')).toBeInTheDocument();
      expect(
        screen.getByText('Si un compte existe avec cet email, vous recevrez un lien.')
      ).toBeInTheDocument();
    });

    it('should hide form after success', () => {
      mockState = {
        success: true,
        message: 'Success message',
      };

      render(<ForgotPasswordForm />);

      // Form should not be visible
      expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Envoyer le lien de réinitialisation' })
      ).not.toBeInTheDocument();
    });

    it('should show link to login after success', () => {
      mockState = {
        success: true,
        message: 'Success message',
      };

      render(<ForgotPasswordForm />);

      const loginLink = screen.getByRole('link', { name: 'Retour à la connexion' });
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('error display', () => {
    it('should display global error message', () => {
      mockState = {
        success: false,
        error: 'Une erreur est survenue',
      };

      render(<ForgotPasswordForm />);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Une erreur est survenue');
    });

    it('should display field-level email error', () => {
      mockState = {
        success: false,
        error: 'Données invalides',
        fieldErrors: {
          email: ['Adresse email invalide'],
        },
      };

      render(<ForgotPasswordForm />);

      expect(screen.getByText('Adresse email invalide')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('accessibility', () => {
    it('should have aria-describedby on email when error exists', () => {
      mockState = {
        success: false,
        error: 'Données invalides',
        fieldErrors: {
          email: ['Adresse email invalide'],
        },
      };

      render(<ForgotPasswordForm />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    });

    it('should have role="alert" on error messages', () => {
      mockState = {
        success: false,
        error: 'Une erreur est survenue',
      };

      render(<ForgotPasswordForm />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have role="alert" on success message', () => {
      mockState = {
        success: true,
        message: 'Success',
      };

      render(<ForgotPasswordForm />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('should have form element', () => {
      const { container } = render(<ForgotPasswordForm />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });
});

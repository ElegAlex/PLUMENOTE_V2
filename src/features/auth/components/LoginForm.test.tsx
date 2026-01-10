/**
 * Unit tests for LoginForm component
 *
 * Tests rendering, form behavior, error states, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginForm } from './LoginForm';

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockGet = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

// Mock the login action
vi.mock('../actions/login.action', () => ({
  loginAction: vi.fn(),
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

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { success: false };
    mockIsPending = false;
    mockGet.mockReturnValue(null);
  });

  describe('rendering', () => {
    it('should render the login form', () => {
      render(<LoginForm />);

      // CardTitle uses a div, not a heading, so we check for text content
      expect(screen.getByText('Connexion')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
    });

    it('should render forgot password link', () => {
      render(<LoginForm />);

      const forgotLink = screen.getByRole('link', { name: 'Mot de passe oublié ?' });
      expect(forgotLink).toBeInTheDocument();
      expect(forgotLink).toHaveAttribute('href', '/forgot-password');
    });

    it('should have accessible form elements', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Mot de passe');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should have required fields', () => {
      render(<LoginForm />);

      expect(screen.getByLabelText('Email')).toBeRequired();
      expect(screen.getByLabelText('Mot de passe')).toBeRequired();
    });
  });

  describe('error display', () => {
    it('should display global error message', () => {
      mockState = {
        success: false,
        error: 'Email ou mot de passe incorrect',
      };

      render(<LoginForm />);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Email ou mot de passe incorrect');
    });

    it('should display field-level email error', () => {
      mockState = {
        success: false,
        error: 'Données invalides',
        fieldErrors: {
          email: ['Adresse email invalide'],
        },
      };

      render(<LoginForm />);

      expect(screen.getByText('Adresse email invalide')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should display field-level password error', () => {
      mockState = {
        success: false,
        error: 'Données invalides',
        fieldErrors: {
          password: ['Le mot de passe est requis'],
        },
      };

      render(<LoginForm />);

      expect(screen.getByText('Le mot de passe est requis')).toBeInTheDocument();
      expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not display global error when field errors exist', () => {
      mockState = {
        success: false,
        error: 'Données invalides',
        fieldErrors: {
          email: ['Adresse email invalide'],
        },
      };

      render(<LoginForm />);

      // Global error should not be displayed as alert (field errors take precedence)
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toHaveTextContent('Adresse email invalide');
    });
  });

  describe('callbackUrl validation (open redirect protection)', () => {
    it('should use /dashboard as default callback', () => {
      mockGet.mockReturnValue(null);
      mockState = { success: true };

      render(<LoginForm />);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should accept valid relative callback URL', () => {
      mockGet.mockReturnValue('/projects/123');
      mockState = { success: true };

      render(<LoginForm />);

      expect(mockPush).toHaveBeenCalledWith('/projects/123');
    });

    it('should reject absolute URLs and use default', () => {
      mockGet.mockReturnValue('https://evil.com');
      mockState = { success: true };

      render(<LoginForm />);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should reject protocol-relative URLs', () => {
      mockGet.mockReturnValue('//evil.com');
      mockState = { success: true };

      render(<LoginForm />);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should reject javascript: URLs', () => {
      mockGet.mockReturnValue('javascript:alert(1)');
      mockState = { success: true };

      render(<LoginForm />);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('form submission', () => {
    it('should have form element', () => {
      const { container } = render(<LoginForm />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
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

      render(<LoginForm />);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    });

    it('should have aria-describedby on password when error exists', () => {
      mockState = {
        success: false,
        error: 'Données invalides',
        fieldErrors: {
          password: ['Le mot de passe est requis'],
        },
      };

      render(<LoginForm />);

      const passwordInput = screen.getByLabelText('Mot de passe');
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');
    });

    it('should have role="alert" on error messages', () => {
      mockState = {
        success: false,
        error: 'Email ou mot de passe incorrect',
      };

      render(<LoginForm />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });
});

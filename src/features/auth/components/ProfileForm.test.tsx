/**
 * Unit tests for ProfileForm component
 *
 * Tests form rendering, name update, and accessibility.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #1: Modify name with toast confirmation
 * @see AC #3: Persist name change after refresh
 * @see AC #8: Accessible form with labels, focus visible, ARIA
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileForm } from './ProfileForm';

// Mock the update profile action
const mockUpdateProfileAction = vi.fn();
vi.mock('../actions/update-profile.action', () => ({
  updateProfileAction: (...args: unknown[]) => mockUpdateProfileAction(...args),
}));

// Mock sonner toast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// Mock AvatarUpload component
vi.mock('./AvatarUpload', () => ({
  AvatarUpload: ({ currentAvatar, userName }: { currentAvatar: string | null; userName: string | null }) => (
    <div data-testid="avatar-upload" data-avatar={currentAvatar} data-name={userName}>
      <div role="img" aria-label={userName ? `Avatar de ${userName}` : 'Avatar par defaut'}>
        {userName ? userName.charAt(0).toUpperCase() : '?'}
      </div>
    </div>
  ),
}));

// Mock useActionState to return controlled state
const mockFormAction = vi.fn();
let mockState = { success: false };
let mockIsPending = false;

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useActionState: () => [mockState, mockFormAction, mockIsPending],
  };
});

describe('ProfileForm', () => {
  const defaultUser = {
    id: 'user-123',
    name: 'Jean Dupont',
    email: 'jean@example.com',
    avatar: null,
    image: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { success: false };
    mockIsPending = false;
  });

  describe('rendering', () => {
    it('should render the profile info card', () => {
      render(<ProfileForm user={defaultUser} />);

      expect(screen.getByText('Informations du profil')).toBeInTheDocument();
    });

    it('should render the avatar card', () => {
      render(<ProfileForm user={defaultUser} />);

      expect(screen.getByText('Avatar')).toBeInTheDocument();
    });

    it('should display user name in the name input', () => {
      render(<ProfileForm user={defaultUser} />);

      const nameInput = screen.getByLabelText(/nom/i);
      expect(nameInput).toHaveValue('Jean Dupont');
    });

    it('should display email as disabled', () => {
      render(<ProfileForm user={defaultUser} />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('jean@example.com');
      expect(emailInput).toBeDisabled();
    });

    it('should display a message that email cannot be modified', () => {
      render(<ProfileForm user={defaultUser} />);

      expect(screen.getByText(/l'email ne peut pas etre modifie/i)).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<ProfileForm user={defaultUser} />);

      expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
    });
  });

  describe('accessibility (AC #8)', () => {
    it('should have accessible name input with label', () => {
      render(<ProfileForm user={defaultUser} />);

      const nameInput = screen.getByLabelText(/nom/i);
      expect(nameInput).toHaveAttribute('id', 'name');
      expect(nameInput).toHaveAttribute('name', 'name');
    });

    it('should have proper focus-visible classes on input', () => {
      render(<ProfileForm user={defaultUser} />);

      const nameInput = screen.getByLabelText(/nom/i);
      expect(nameInput.className).toContain('focus-visible:');
    });
  });

  describe('form interaction', () => {
    it('should allow typing in the name field', async () => {
      const user = userEvent.setup();
      render(<ProfileForm user={defaultUser} />);

      const nameInput = screen.getByLabelText(/nom/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Nouveau Nom');

      expect(nameInput).toHaveValue('Nouveau Nom');
    });

    it('should show loading state while pending', () => {
      mockIsPending = true;
      render(<ProfileForm user={defaultUser} />);

      const submitButton = screen.getByRole('button', { name: /enregistrement en cours/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable name input while pending', () => {
      mockIsPending = true;
      render(<ProfileForm user={defaultUser} />);

      const nameInput = screen.getByLabelText(/nom/i);
      expect(nameInput).toBeDisabled();
    });
  });

  describe('empty name handling', () => {
    it('should display empty input for user with no name', () => {
      render(<ProfileForm user={{ ...defaultUser, name: null }} />);

      const nameInput = screen.getByLabelText(/nom/i);
      expect(nameInput).toHaveValue('');
    });
  });

  describe('avatar section', () => {
    it('should render AvatarUpload component', () => {
      render(<ProfileForm user={defaultUser} />);

      expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
    });

    it('should pass current avatar to AvatarUpload', () => {
      render(<ProfileForm user={{ ...defaultUser, avatar: '/uploads/avatars/test.jpg' }} />);

      const avatarUpload = screen.getByTestId('avatar-upload');
      expect(avatarUpload).toHaveAttribute('data-avatar', '/uploads/avatars/test.jpg');
    });

    it('should pass user name to AvatarUpload', () => {
      render(<ProfileForm user={defaultUser} />);

      const avatarUpload = screen.getByTestId('avatar-upload');
      expect(avatarUpload).toHaveAttribute('data-name', 'Jean Dupont');
    });

    it('should prefer avatar over image', () => {
      render(<ProfileForm user={{ ...defaultUser, avatar: '/avatar.jpg', image: '/image.jpg' }} />);

      const avatarUpload = screen.getByTestId('avatar-upload');
      expect(avatarUpload).toHaveAttribute('data-avatar', '/avatar.jpg');
    });

    it('should fallback to image if no avatar', () => {
      render(<ProfileForm user={{ ...defaultUser, avatar: null, image: '/image.jpg' }} />);

      const avatarUpload = screen.getByTestId('avatar-upload');
      expect(avatarUpload).toHaveAttribute('data-avatar', '/image.jpg');
    });
  });

  describe('toast notifications (AC #1)', () => {
    it('should show success toast when profile is updated', () => {
      mockState = { success: true };
      render(<ProfileForm user={defaultUser} />);

      expect(mockToastSuccess).toHaveBeenCalledWith('Profil mis a jour avec succes.');
    });

    it('should show error toast when update fails', () => {
      mockState = { success: false, error: 'Une erreur est survenue.' };
      render(<ProfileForm user={defaultUser} />);

      expect(mockToastError).toHaveBeenCalledWith('Une erreur est survenue.');
    });
  });

  describe('field errors', () => {
    it('should show field error when name validation fails', () => {
      mockState = {
        success: false,
        error: 'Validation failed',
        fieldErrors: { name: ['Le nom ne peut pas depasser 100 caracteres'] },
      };
      render(<ProfileForm user={defaultUser} />);

      expect(screen.getByText('Le nom ne peut pas depasser 100 caracteres')).toBeInTheDocument();
    });

    it('should set aria-invalid on input with error', () => {
      mockState = {
        success: false,
        error: 'Validation failed',
        fieldErrors: { name: ['Erreur'] },
      };
      render(<ProfileForm user={defaultUser} />);

      const nameInput = screen.getByLabelText(/nom/i);
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    });
  });
});

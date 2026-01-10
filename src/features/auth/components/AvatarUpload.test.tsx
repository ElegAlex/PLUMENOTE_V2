/**
 * Unit tests for AvatarUpload component
 *
 * Tests file upload, deletion, validation, and accessibility.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #2: Upload avatar (JPG/PNG, max 2MB)
 * @see AC #4: Delete avatar to return to default
 * @see AC #5: Reject non JPG/PNG files
 * @see AC #6: Reject files > 2MB
 * @see AC #8: Accessible form with labels, focus visible, ARIA
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvatarUpload } from './AvatarUpload';

// Mock the upload and delete actions
const mockUploadAvatarAction = vi.fn();
const mockDeleteAvatarAction = vi.fn();

vi.mock('../actions/upload-avatar.action', () => ({
  uploadAvatarAction: (...args: unknown[]) => mockUploadAvatarAction(...args),
}));

vi.mock('../actions/delete-avatar.action', () => ({
  deleteAvatarAction: (...args: unknown[]) => mockDeleteAvatarAction(...args),
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

// Mock useActionState
const mockUploadFormAction = vi.fn();
const mockDeleteFormAction = vi.fn();
let mockUploadState = { success: false };
let mockDeleteState = { success: false };
let mockUploadIsPending = false;
let mockDeleteIsPending = false;

// Keep track of which call is which
let useActionStateCallCount = 0;

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useActionState: () => {
      useActionStateCallCount++;
      // First call is for upload, second for delete
      if (useActionStateCallCount % 2 === 1) {
        return [mockUploadState, mockUploadFormAction, mockUploadIsPending];
      }
      return [mockDeleteState, mockDeleteFormAction, mockDeleteIsPending];
    },
  };
});

describe('AvatarUpload', () => {
  const defaultProps = {
    currentAvatar: null as string | null,
    userName: 'Jean Dupont',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadState = { success: false };
    mockDeleteState = { success: false };
    mockUploadIsPending = false;
    mockDeleteIsPending = false;
    useActionStateCallCount = 0;
  });

  describe('rendering', () => {
    it('should render avatar placeholder when no avatar is set', () => {
      render(<AvatarUpload {...defaultProps} />);

      const avatar = screen.getByRole('img', { name: /avatar de jean dupont/i });
      expect(avatar).toBeInTheDocument();
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should render actual avatar when set', () => {
      render(<AvatarUpload {...defaultProps} currentAvatar="/uploads/avatars/test.jpg" />);

      const avatar = screen.getByRole('img', { name: /avatar de jean dupont/i });
      expect(avatar).toHaveAttribute('src');
    });

    it('should show question mark for user without name', () => {
      render(<AvatarUpload currentAvatar={null} userName={null} />);

      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('should render upload button', () => {
      render(<AvatarUpload {...defaultProps} />);

      expect(screen.getByRole('button', { name: /changer/i })).toBeInTheDocument();
    });

    it('should render delete button when avatar exists', () => {
      render(<AvatarUpload {...defaultProps} currentAvatar="/uploads/avatars/test.jpg" />);

      expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument();
    });

    it('should not render delete button when no avatar', () => {
      render(<AvatarUpload {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /supprimer/i })).not.toBeInTheDocument();
    });

    it('should display file format requirements', () => {
      render(<AvatarUpload {...defaultProps} />);

      expect(screen.getByText(/jpg, png/i)).toBeInTheDocument();
      expect(screen.getByText(/2mb/i)).toBeInTheDocument();
    });
  });

  describe('file input', () => {
    it('should have hidden file input', () => {
      render(<AvatarUpload {...defaultProps} />);

      const fileInput = screen.getByTestId('avatar-file-input');
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveClass('sr-only');
    });

    it('should accept only jpg and png files', () => {
      render(<AvatarUpload {...defaultProps} />);

      const fileInput = screen.getByTestId('avatar-file-input');
      expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png');
    });
  });

  describe('upload button interaction', () => {
    it('should trigger file input when upload button is clicked', async () => {
      const user = userEvent.setup();
      render(<AvatarUpload {...defaultProps} />);

      const uploadButton = screen.getByRole('button', { name: /changer/i });
      const fileInput = screen.getByTestId('avatar-file-input');

      // Spy on click
      const clickSpy = vi.spyOn(fileInput, 'click');

      await user.click(uploadButton);

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('should show loading state on upload button when uploading', () => {
      mockUploadIsPending = true;
      render(<AvatarUpload {...defaultProps} />);

      const uploadButton = screen.getByRole('button', { name: /upload/i });
      expect(uploadButton).toBeDisabled();
    });

    it('should show loading state on delete button when deleting', () => {
      mockDeleteIsPending = true;
      render(<AvatarUpload {...defaultProps} currentAvatar="/uploads/avatars/test.jpg" />);

      const deleteButton = screen.getByRole('button', { name: /suppression/i });
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('accessibility (AC #8)', () => {
    it('should have accessible file input with label', () => {
      render(<AvatarUpload {...defaultProps} />);

      const fileInput = screen.getByTestId('avatar-file-input');
      expect(fileInput).toHaveAttribute('id', 'avatar-upload');
      expect(screen.getByLabelText(/telecharger un avatar/i)).toBeInTheDocument();
    });

    it('should have accessible avatar image', () => {
      render(<AvatarUpload {...defaultProps} />);

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('aria-label');
    });
  });

  describe('toast notifications', () => {
    it('should show success toast after successful upload', () => {
      mockUploadState = { success: true, avatarUrl: '/uploads/avatars/new.jpg' };
      render(<AvatarUpload {...defaultProps} />);

      expect(mockToastSuccess).toHaveBeenCalledWith('Avatar mis a jour avec succes.');
    });

    it('should show error toast when upload fails', () => {
      mockUploadState = { success: false, error: 'Format non supporte' };
      render(<AvatarUpload {...defaultProps} />);

      expect(mockToastError).toHaveBeenCalledWith('Format non supporte');
    });

    it('should show success toast after successful deletion', () => {
      mockDeleteState = { success: true };
      render(<AvatarUpload {...defaultProps} currentAvatar="/uploads/avatars/test.jpg" />);

      expect(mockToastSuccess).toHaveBeenCalledWith('Avatar supprime.');
    });

    it('should show error toast when deletion fails', () => {
      mockDeleteState = { success: false, error: 'Erreur de suppression' };
      render(<AvatarUpload {...defaultProps} currentAvatar="/uploads/avatars/test.jpg" />);

      expect(mockToastError).toHaveBeenCalledWith('Erreur de suppression');
    });
  });
});

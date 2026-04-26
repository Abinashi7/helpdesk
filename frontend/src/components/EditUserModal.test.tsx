import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EditUserModal } from './EditUserModal';
import * as api from '@/lib/api';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api');

const MOCK_USER = {
  id: '2',
  name: 'Alice Admin',
  email: 'alice@example.com',
  role: 'admin' as const,
  createdAt: '2024-01-15T12:00:00Z',
};

const MOCK_UPDATED_USER = { ...MOCK_USER, name: 'Alice Updated' };

describe('EditUserModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders form pre-populated with user data and a blank password', () => {
    renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Alice Admin');
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('alice@example.com');
    expect(screen.getByLabelText(/new password/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  describe('onClose behaviour', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onClose when the backdrop is clicked', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
      await user.click(screen.getByTestId('modal-backdrop'));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onClose when Escape is pressed', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe('validation', () => {
    it('shows an error when name is too short', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
      await user.clear(screen.getByLabelText(/^name$/i));
      await user.type(screen.getByLabelText(/^name$/i), 'ab');
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() =>
        expect(screen.getByText(/name must be at least 3 characters/i)).toBeInTheDocument()
      );
      expect(api.apiPatch).not.toHaveBeenCalled();
    });

    it('shows an error when email is invalid', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
      await user.clear(screen.getByLabelText(/^email$/i));
      await user.type(screen.getByLabelText(/^email$/i), 'notanemail');
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() =>
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
      );
      expect(api.apiPatch).not.toHaveBeenCalled();
    });

    it('shows an error when password is filled but too short', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
      await user.type(screen.getByLabelText(/new password/i), 'short');
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() =>
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      );
      expect(api.apiPatch).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('calls apiPatch with correct endpoint and data when password is blank', async () => {
      vi.mocked(api.apiPatch).mockResolvedValue({ user: MOCK_UPDATED_USER });
      const user = userEvent.setup();
      renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() =>
        expect(api.apiPatch).toHaveBeenCalledWith(`/api/users/${MOCK_USER.id}`, {
          name: 'Alice Admin',
          email: 'alice@example.com',
          password: undefined,
        })
      );
    });

    it('calls apiPatch with password when a new password is provided', async () => {
      vi.mocked(api.apiPatch).mockResolvedValue({ user: MOCK_UPDATED_USER });
      const user = userEvent.setup();
      renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
      await user.type(screen.getByLabelText(/new password/i), 'newpassword1');
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() =>
        expect(api.apiPatch).toHaveBeenCalledWith(
          `/api/users/${MOCK_USER.id}`,
          expect.objectContaining({ password: 'newpassword1' })
        )
      );
    });

    it('disables buttons and shows loading text while the request is pending', async () => {
      vi.mocked(api.apiPatch).mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
      );
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('calls onClose after a successful submission', async () => {
      vi.mocked(api.apiPatch).mockResolvedValue({ user: MOCK_UPDATED_USER });
      const user = userEvent.setup();
      renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    });

    it('shows a server error and does not close on failure', async () => {
      vi.mocked(api.apiPatch).mockRejectedValue({
        response: { data: { error: 'Email already in use' } },
      });
      const user = userEvent.setup();
      renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() =>
        expect(screen.getByText(/email already in use/i)).toBeInTheDocument()
      );
      expect(onClose).not.toHaveBeenCalled();
    });

    it('shows a generic fallback error when the server sends no message', async () => {
      vi.mocked(api.apiPatch).mockRejectedValue({});
      const user = userEvent.setup();
      renderWithQuery(<EditUserModal user={MOCK_USER} onClose={onClose} />);
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() =>
        expect(screen.getByText(/failed to update user/i)).toBeInTheDocument()
      );
    });
  });
});

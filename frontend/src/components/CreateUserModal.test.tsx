import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CreateUserModal } from './CreateUserModal';
import * as api from '@/lib/api';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api');

const MOCK_CREATED_USER = {
  id: '3',
  name: 'Jane Smith',
  email: 'jane@example.com',
  role: 'agent' as const,
  createdAt: '2024-06-01T12:00:00Z',
};

describe('CreateUserModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders all form fields and action buttons', () => {
    renderWithQuery(<CreateUserModal onClose={onClose} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithQuery(<CreateUserModal onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  describe('validation', () => {
    it('shows an error when name is too short', async () => {
      const user = userEvent.setup();
      renderWithQuery(<CreateUserModal onClose={onClose} />);
      await user.type(screen.getByLabelText(/name/i), 'ab');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create user/i }));
      await waitFor(() =>
        expect(screen.getByText(/name must be at least 3 characters/i)).toBeInTheDocument()
      );
      expect(api.apiPost).not.toHaveBeenCalled();
    });

    it('shows an error when email is invalid', async () => {
      const user = userEvent.setup();
      renderWithQuery(<CreateUserModal onClose={onClose} />);
      await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
      await user.type(screen.getByLabelText(/email/i), 'notanemail');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create user/i }));
      await waitFor(() =>
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
      );
      expect(api.apiPost).not.toHaveBeenCalled();
    });

    it('shows an error when password is too short', async () => {
      const user = userEvent.setup();
      renderWithQuery(<CreateUserModal onClose={onClose} />);
      await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/password/i), 'short');
      await user.click(screen.getByRole('button', { name: /create user/i }));
      await waitFor(() =>
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      );
      expect(api.apiPost).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('calls apiPost with the correct endpoint and data', async () => {
      vi.mocked(api.apiPost).mockResolvedValue({ user: MOCK_CREATED_USER });
      const user = userEvent.setup();
      renderWithQuery(<CreateUserModal onClose={onClose} />);
      await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create user/i }));
      await waitFor(() =>
        expect(api.apiPost).toHaveBeenCalledWith('/api/users', {
          name: 'Jane Smith',
          email: 'jane@example.com',
          password: 'password123',
        })
      );
    });

    it('disables buttons and shows loading text while the request is pending', async () => {
      vi.mocked(api.apiPost).mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderWithQuery(<CreateUserModal onClose={onClose} />);
      await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create user/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
      );
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('calls onClose after a successful submission', async () => {
      vi.mocked(api.apiPost).mockResolvedValue({ user: MOCK_CREATED_USER });
      const user = userEvent.setup();
      renderWithQuery(<CreateUserModal onClose={onClose} />);
      await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create user/i }));
      await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    });

    it('shows a server error and does not close on failure', async () => {
      vi.mocked(api.apiPost).mockRejectedValue({
        response: { data: { error: 'Email already in use' } },
      });
      const user = userEvent.setup();
      renderWithQuery(<CreateUserModal onClose={onClose} />);
      await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create user/i }));
      await waitFor(() =>
        expect(screen.getByText(/email already in use/i)).toBeInTheDocument()
      );
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

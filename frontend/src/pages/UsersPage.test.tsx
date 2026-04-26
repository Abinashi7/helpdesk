import { screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UsersPage from './UsersPage';
import * as api from '@/lib/api';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api');

const MOCK_USERS = [
  {
    id: '1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    role: 'admin' as const,
    createdAt: '2024-01-15T12:00:00Z',
  },
  {
    id: '2',
    name: 'Bob Jones',
    email: 'bob@example.com',
    role: 'agent' as const,
    createdAt: '2024-03-20T12:00:00Z',
  },
];


describe('UsersPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the page heading', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ users: MOCK_USERS });
    renderWithQuery(<UsersPage />);
    expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument();
  });

  it('shows skeleton table while loading', () => {
    // never-resolving promise keeps the component in pending state
    vi.mocked(api.apiFetch).mockReturnValue(new Promise(() => {}));
    renderWithQuery(<UsersPage />);
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(16); // 4 rows × 4 columns
  });

  it('renders all users after a successful fetch', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ users: MOCK_USERS });
    renderWithQuery(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument());
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('shows the admin role badge', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ users: MOCK_USERS });
    renderWithQuery(<UsersPage />);
    await waitFor(() => expect(screen.getByText('admin')).toBeInTheDocument());
  });

  it('shows the agent role badge', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ users: MOCK_USERS });
    renderWithQuery(<UsersPage />);
    await waitFor(() => expect(screen.getByText('agent')).toBeInTheDocument());
  });

  it('formats the joined date correctly', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ users: MOCK_USERS });
    renderWithQuery(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument());
    expect(screen.getByText('Mar 20, 2024')).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    vi.mocked(api.apiFetch).mockRejectedValue(new Error('Network error'));
    renderWithQuery(<UsersPage />);
    await waitFor(() =>
      expect(screen.getByText(/failed to load users/i)).toBeInTheDocument()
    );
  });

  it('calls apiFetch with the correct endpoint', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ users: [] });
    renderWithQuery(<UsersPage />);
    await waitFor(() => expect(api.apiFetch).toHaveBeenCalledWith('/api/users'));
  });

  it('renders an empty table body when the user list is empty', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ users: [] });
    renderWithQuery(<UsersPage />);
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
    );
    expect(screen.queryByRole('row', { name: /alice/i })).not.toBeInTheDocument();
  });
});

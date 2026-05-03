import { screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TicketStatus, TicketCategory } from '@helpdesk/core';
import TicketsPage from './TicketsPage';
import * as api from '@/lib/api';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api');

const MOCK_TICKETS = [
  {
    id: 1,
    subject: 'Cannot log in to my account',
    fromName: 'Jane Doe',
    fromEmail: 'jane@example.com',
    category: TicketCategory.technical,
    status: TicketStatus.open,
    createdAt: '2024-06-01T12:00:00Z',
  },
  {
    id: 2,
    subject: 'Invoice question',
    fromName: 'Bob Smith',
    fromEmail: 'bob@example.com',
    category: TicketCategory.billing,
    status: TicketStatus.pending,
    createdAt: '2024-05-20T12:00:00Z',
  },
];

describe('TicketsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the page heading', () => {
    vi.mocked(api.apiFetch).mockReturnValue(new Promise(() => {}));
    renderWithQuery(<TicketsPage />);
    expect(screen.getByRole('heading', { name: /tickets/i })).toBeInTheDocument();
  });

  it('renders all five column headers', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS });
    renderWithQuery(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /subject/i })).toBeInTheDocument()
    );
    expect(screen.getByRole('columnheader', { name: /from/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /category/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /received/i })).toBeInTheDocument();
  });

  it('shows skeleton rows while loading', () => {
    vi.mocked(api.apiFetch).mockReturnValue(new Promise(() => {}));
    renderWithQuery(<TicketsPage />);
    expect(screen.queryByText('Cannot log in to my account')).not.toBeInTheDocument();
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(25); // 5 rows × 5 columns
  });

  it('renders ticket subject, sender name, and email', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS });
    renderWithQuery(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument()
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('renders the category badge', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS });
    renderWithQuery(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText('technical')).toBeInTheDocument()
    );
    expect(screen.getByText('billing')).toBeInTheDocument();
  });

  it('renders the status badge', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS });
    renderWithQuery(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText('open')).toBeInTheDocument()
    );
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('formats the received date correctly', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS });
    renderWithQuery(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText('Jun 1, 2024')).toBeInTheDocument()
    );
    expect(screen.getByText('May 20, 2024')).toBeInTheDocument();
  });

  it('shows "No tickets yet." when the list is empty', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: [] });
    renderWithQuery(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText(/no tickets yet/i)).toBeInTheDocument()
    );
  });

  it('shows an error message when the fetch fails', async () => {
    vi.mocked(api.apiFetch).mockRejectedValue(new Error('Network error'));
    renderWithQuery(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText(/failed to load tickets/i)).toBeInTheDocument()
    );
  });

  it('calls apiFetch with the correct endpoint', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: [] });
    renderWithQuery(<TicketsPage />);
    await waitFor(() => expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets'));
  });
});

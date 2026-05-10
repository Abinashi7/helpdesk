import { screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TicketStatus, TicketCategory, type Ticket } from '@helpdesk/core';
import ReplyThread from './ReplyThread';
import * as api from '@/lib/api';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api');

const MOCK_TICKET: Ticket = {
  id: 7,
  subject: 'Login issue',
  body: 'I cannot log in.',
  fromEmail: 'user@example.com',
  fromName: 'Jane Doe',
  category: TicketCategory.technical,
  status: TicketStatus.open,
  assignedTo: null,
  createdAt: '2024-06-01T12:00:00Z',
  updatedAt: '2024-06-01T12:00:00Z',
};

const MOCK_REPLIES = [
  {
    id: 1,
    body: 'Have you tried resetting your password?',
    senderType: 'agent' as const,
    createdAt: '2024-06-01T12:00:00Z',
    author: { id: 'agent-1', name: 'Alice Agent' },
  },
  {
    id: 2,
    body: 'Still having the same issue.',
    senderType: 'customer' as const,
    createdAt: '2024-06-02T12:00:00Z',
    author: { id: 'user-1', name: 'Jane Doe' },
  },
];

describe('ReplyThread', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the Replies heading', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ replies: [] });
    renderWithQuery(<ReplyThread ticket={MOCK_TICKET} />);
    expect(screen.getByText('Replies')).toBeInTheDocument();
  });

  it('fetches replies from the correct endpoint', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ replies: [] });
    renderWithQuery(<ReplyThread ticket={MOCK_TICKET} />);
    await waitFor(() =>
      expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets/7/replies')
    );
  });

  it('shows "No replies yet." when there are no replies', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ replies: [] });
    renderWithQuery(<ReplyThread ticket={MOCK_TICKET} />);
    await waitFor(() =>
      expect(screen.getByText(/no replies yet/i)).toBeInTheDocument()
    );
  });

  it('does not show "No replies yet." when replies exist', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ replies: MOCK_REPLIES });
    renderWithQuery(<ReplyThread ticket={MOCK_TICKET} />);
    await waitFor(() =>
      expect(screen.getByText('Have you tried resetting your password?')).toBeInTheDocument()
    );
    expect(screen.queryByText(/no replies yet/i)).not.toBeInTheDocument();
  });

  it('renders the body of each reply', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ replies: MOCK_REPLIES });
    renderWithQuery(<ReplyThread ticket={MOCK_TICKET} />);
    await waitFor(() =>
      expect(screen.getByText('Have you tried resetting your password?')).toBeInTheDocument()
    );
    expect(screen.getByText('Still having the same issue.')).toBeInTheDocument();
  });

  it('renders the author name of each reply', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ replies: MOCK_REPLIES });
    renderWithQuery(<ReplyThread ticket={MOCK_TICKET} />);
    await waitFor(() =>
      expect(screen.getByText('Alice Agent')).toBeInTheDocument()
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows an "agent" badge for agent replies', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ replies: [MOCK_REPLIES[0]] });
    renderWithQuery(<ReplyThread ticket={MOCK_TICKET} />);
    await waitFor(() =>
      expect(screen.getByText('agent')).toBeInTheDocument()
    );
  });

  it('shows a "customer" badge for customer replies', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ replies: [MOCK_REPLIES[1]] });
    renderWithQuery(<ReplyThread ticket={MOCK_TICKET} />);
    await waitFor(() =>
      expect(screen.getByText('customer')).toBeInTheDocument()
    );
  });

  it('renders both agent and customer badges when both reply types are present', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ replies: MOCK_REPLIES });
    renderWithQuery(<ReplyThread ticket={MOCK_TICKET} />);
    await waitFor(() =>
      expect(screen.getByText('Have you tried resetting your password?')).toBeInTheDocument()
    );
    const badges = screen.getAllByText(/^(agent|customer)$/);
    expect(badges.some((b) => b.textContent === 'agent')).toBe(true);
    expect(badges.some((b) => b.textContent === 'customer')).toBe(true);
  });

  it('renders the formatted date of each reply', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ replies: MOCK_REPLIES });
    renderWithQuery(<ReplyThread ticket={MOCK_TICKET} />);
    await waitFor(() =>
      expect(screen.getByText('Have you tried resetting your password?')).toBeInTheDocument()
    );
    expect(screen.getByText(/June 1, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/June 2, 2024/)).toBeInTheDocument();
  });
});

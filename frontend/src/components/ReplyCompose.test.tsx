import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { type Ticket } from '@helpdesk/core';
import ReplyCompose from './ReplyCompose';
import * as api from '@/lib/api';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api');

const MOCK_REPLY = {
  id: 1,
  body: 'Test reply',
  senderType: 'agent' as const,
  createdAt: '2024-06-01T12:00:00Z',
  author: { id: 'agent-1', name: 'Alice Agent' },
};

function mockTicket(id = 42): Ticket {
  return {
    id,
    subject: 'Test subject',
    body: 'Test body',
    fromEmail: 'user@example.com',
    fromName: 'Test User',
    category: null,
    status: 'open',
    assignedTo: null,
    createdAt: '2024-06-01T12:00:00Z',
    updatedAt: '2024-06-01T12:00:00Z',
  };
}

function renderCompose(id = 42) {
  return renderWithQuery(<ReplyCompose ticket={mockTicket(id)} />);
}

describe('ReplyCompose', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders a textarea and Send reply button', () => {
    renderCompose();
    expect(screen.getByRole('textbox', { name: /reply body/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument();
  });

  it('renders the textarea with the correct placeholder', () => {
    renderCompose();
    expect(screen.getByPlaceholderText('Write a reply…')).toBeInTheDocument();
  });

  it('disables the Send reply button when the textarea is empty', () => {
    renderCompose();
    expect(screen.getByRole('button', { name: /send reply/i })).toBeDisabled();
  });

  it('disables the Send reply button when the textarea contains only whitespace', async () => {
    const user = userEvent.setup();
    renderCompose();
    await user.type(screen.getByRole('textbox', { name: /reply body/i }), '   ');
    expect(screen.getByRole('button', { name: /send reply/i })).toBeDisabled();
  });

  it('enables the Send reply button when the textarea has content', async () => {
    const user = userEvent.setup();
    renderCompose();
    await user.type(screen.getByRole('textbox', { name: /reply body/i }), 'Hello');
    expect(screen.getByRole('button', { name: /send reply/i })).not.toBeDisabled();
  });

  it('calls apiPost with the correct endpoint, trimmed body, and senderType on submit', async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiPost).mockResolvedValue(MOCK_REPLY);
    renderCompose(99);

    await user.type(screen.getByRole('textbox', { name: /reply body/i }), '  Hello there  ');
    await user.click(screen.getByRole('button', { name: /send reply/i }));

    await waitFor(() =>
      expect(api.apiPost).toHaveBeenCalledWith('/api/tickets/99/replies', {
        body: 'Hello there',
        senderType: 'agent',
      })
    );
  });

  it('clears the textarea after a successful submission', async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiPost).mockResolvedValue(MOCK_REPLY);
    renderCompose();

    const textarea = screen.getByRole('textbox', { name: /reply body/i });
    await user.type(textarea, 'Test reply');
    await user.click(screen.getByRole('button', { name: /send reply/i }));

    await waitFor(() => expect(textarea).toHaveValue(''));
  });

  it('disables the textarea and button while the mutation is in flight', async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiPost).mockReturnValue(new Promise(() => {}));
    renderCompose();

    const textarea = screen.getByRole('textbox', { name: /reply body/i });
    await user.type(textarea, 'Test reply');
    await user.click(screen.getByRole('button', { name: /send reply/i }));

    expect(textarea).toBeDisabled();
    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
  });

  it('shows "Sending…" on the button while the mutation is in flight', async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiPost).mockReturnValue(new Promise(() => {}));
    renderCompose();

    await user.type(screen.getByRole('textbox', { name: /reply body/i }), 'Test reply');
    await user.click(screen.getByRole('button', { name: /send reply/i }));

    expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send reply/i })).not.toBeInTheDocument();
  });

  it('shows an error message when the POST fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiPost).mockRejectedValue(new Error('Server error'));
    renderCompose();

    await user.type(screen.getByRole('textbox', { name: /reply body/i }), 'Test reply');
    await user.click(screen.getByRole('button', { name: /send reply/i }));

    await waitFor(() =>
      expect(screen.getByText(/failed to send reply/i)).toBeInTheDocument()
    );
  });

  it('does not show the error message before any submission attempt', () => {
    renderCompose();
    expect(screen.queryByText(/failed to send reply/i)).not.toBeInTheDocument();
  });

  it('does not call apiPost when the button is clicked with an empty textarea', async () => {
    const user = userEvent.setup();
    renderCompose();
    await user.click(screen.getByRole('button', { name: /send reply/i }));
    expect(api.apiPost).not.toHaveBeenCalled();
  });
});

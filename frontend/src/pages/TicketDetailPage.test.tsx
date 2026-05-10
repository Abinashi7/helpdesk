import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TicketStatus, TicketCategory } from '@helpdesk/core';
import TicketDetailPage from './TicketDetailPage';
import * as api from '@/lib/api';
import { renderWithQuery } from '@/test/renderWithQuery';

interface MockReply {
  id: number;
  body: string;
  senderType: 'agent' | 'customer';
  createdAt: string;
  author: { id: string; name: string };
}

vi.mock('@/lib/api');

const MOCK_AGENTS = [
  { id: 'agent-1', name: 'Alice Agent' },
  { id: 'agent-2', name: 'Bob Agent' },
];

const MOCK_REPLIES: MockReply[] = [
  {
    id: 1,
    body: 'Have you tried resetting your password?',
    senderType: 'agent',
    createdAt: '2024-06-01T12:00:00Z',
    author: { id: 'agent-1', name: 'Alice Agent' },
  },
  {
    id: 2,
    body: 'Still having the same issue.',
    senderType: 'customer',
    createdAt: '2024-06-01T12:00:00Z',
    author: { id: 'agent-1', name: 'Alice Agent' },
  },
];

const MOCK_TICKET = {
  id: 1,
  subject: 'Login issue',
  body: 'I cannot log in to my account.',
  fromEmail: 'user@example.com',
  fromName: 'Jane Doe',
  category: TicketCategory.technical,
  status: TicketStatus.open,
  assignedTo: null,
  createdAt: '2024-06-01T12:00:00Z',
  updatedAt: '2024-06-01T12:00:00Z',
};

function renderPage() {
  return renderWithQuery(
    <MemoryRouter initialEntries={['/tickets/1']}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function mockBothFetches(ticketOverride = {}, replies: MockReply[] = []) {
  vi.mocked(api.apiFetch).mockImplementation((path: string) => {
    if (path === '/api/tickets/1') return Promise.resolve({ ...MOCK_TICKET, ...ticketOverride });
    if (path === '/api/users/agents') return Promise.resolve({ agents: MOCK_AGENTS });
    if (path === '/api/tickets/1/replies') return Promise.resolve({ replies });
    return Promise.reject(new Error(`Unexpected apiFetch: ${path}`));
  });
}

// The page renders three selects in order: Status, Category, Assign
function getStatusSelect() { return screen.getAllByRole('combobox')[0] as HTMLSelectElement; }
function getCategorySelect() { return screen.getAllByRole('combobox')[1] as HTMLSelectElement; }
function getAssignSelect() { return screen.getAllByRole('combobox')[2] as HTMLSelectElement; }

describe('TicketDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows skeleton while ticket is loading', () => {
    vi.mocked(api.apiFetch).mockImplementation((path: string) => {
      if (path === '/api/tickets/1') return new Promise(() => {});
      return Promise.resolve({ agents: MOCK_AGENTS });
    });
    renderPage();
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(6);
    expect(screen.queryByText('Login issue')).not.toBeInTheDocument();
  });

  it('shows error message when ticket fetch fails', async () => {
    vi.mocked(api.apiFetch).mockImplementation((path: string) => {
      if (path === '/api/tickets/1') return Promise.reject(new Error('Network error'));
      return Promise.resolve({ agents: MOCK_AGENTS });
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/failed to load ticket/i)).toBeInTheDocument()
    );
  });

  describe('ticket data', () => {
    beforeEach(() => {
      mockBothFetches();
    });

    it('renders the ticket subject', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
    });

    it('renders sender name and email', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      const fromRow = screen.getByText('From:').closest('div')!;
      expect(fromRow).toHaveTextContent('Jane Doe');
      expect(fromRow).toHaveTextContent('user@example.com');
    });

    it('renders the ticket body', async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByText('I cannot log in to my account.')).toBeInTheDocument()
      );
    });

    it('formats the received date', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      const receivedRow = screen.getByText('Received:').closest('div')!;
      expect(receivedRow).toHaveTextContent('June 1, 2024');
    });

    it('fetches ticket and agents from correct endpoints', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets/1');
      expect(api.apiFetch).toHaveBeenCalledWith('/api/users/agents');
    });
  });

  describe('status select', () => {
    it('shows the current ticket status as selected', async () => {
      mockBothFetches({ status: TicketStatus.pending });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      expect(getStatusSelect().value).toBe('pending');
    });

    it('calls apiPatch with the new status when changed', async () => {
      const user = userEvent.setup();
      mockBothFetches({ status: TicketStatus.open });
      vi.mocked(api.apiPatch).mockResolvedValue({ ...MOCK_TICKET, status: TicketStatus.pending });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      await user.selectOptions(getStatusSelect(), 'pending');
      await waitFor(() =>
        expect(api.apiPatch).toHaveBeenCalledWith('/api/tickets/1', { status: 'pending' })
      );
    });

    it('updates to the new status after a successful patch', async () => {
      const user = userEvent.setup();
      mockBothFetches({ status: TicketStatus.open });
      vi.mocked(api.apiPatch).mockResolvedValue({ ...MOCK_TICKET, status: TicketStatus.closed });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      await user.selectOptions(getStatusSelect(), 'closed');
      await waitFor(() => expect(getStatusSelect().value).toBe('closed'));
    });

    it('disables both status and category selects while the update mutation is in flight', async () => {
      const user = userEvent.setup();
      mockBothFetches();
      vi.mocked(api.apiPatch).mockReturnValue(new Promise(() => {}));
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      expect(getStatusSelect()).not.toBeDisabled();
      expect(getCategorySelect()).not.toBeDisabled();

      await user.selectOptions(getStatusSelect(), 'pending');
      expect(getStatusSelect()).toBeDisabled();
      expect(getCategorySelect()).toBeDisabled();
    });
  });

  describe('category select', () => {
    it('shows the current ticket category as selected', async () => {
      mockBothFetches({ category: TicketCategory.billing });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      expect(getCategorySelect().value).toBe('billing');
    });

    it('shows "— None —" selected when category is null', async () => {
      mockBothFetches({ category: null });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      expect(getCategorySelect().value).toBe('');
    });

    it('calls apiPatch with the new category when changed', async () => {
      const user = userEvent.setup();
      mockBothFetches({ category: TicketCategory.technical });
      vi.mocked(api.apiPatch).mockResolvedValue({ ...MOCK_TICKET, category: TicketCategory.billing });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      await user.selectOptions(getCategorySelect(), 'billing');
      await waitFor(() =>
        expect(api.apiPatch).toHaveBeenCalledWith('/api/tickets/1', { category: 'billing' })
      );
    });

    it('calls apiPatch with null when "— None —" is selected', async () => {
      const user = userEvent.setup();
      mockBothFetches({ category: TicketCategory.billing });
      vi.mocked(api.apiPatch).mockResolvedValue({ ...MOCK_TICKET, category: null });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      await user.selectOptions(getCategorySelect(), '');
      await waitFor(() =>
        expect(api.apiPatch).toHaveBeenCalledWith('/api/tickets/1', { category: null })
      );
    });

    it('updates to the new category after a successful patch', async () => {
      const user = userEvent.setup();
      mockBothFetches({ category: TicketCategory.technical });
      vi.mocked(api.apiPatch).mockResolvedValue({ ...MOCK_TICKET, category: TicketCategory.account });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      await user.selectOptions(getCategorySelect(), 'account');
      await waitFor(() => expect(getCategorySelect().value).toBe('account'));
    });
  });

  describe('assign dropdown', () => {
    it('renders agent names as options', async () => {
      mockBothFetches();
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      expect(screen.getByRole('option', { name: 'Alice Agent' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Bob Agent' })).toBeInTheDocument();
    });

    it('shows "— Unassigned —" selected when ticket has no assignee', async () => {
      mockBothFetches({ assignedTo: null });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      expect(getAssignSelect().value).toBe('');
    });

    it('shows the assigned agent as selected', async () => {
      mockBothFetches({ assignedTo: { id: 'agent-1', name: 'Alice Agent' } });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      expect(getAssignSelect().value).toBe('agent-1');
    });

    it('calls apiPatch with the correct agent id when an agent is selected', async () => {
      const user = userEvent.setup();
      mockBothFetches();
      vi.mocked(api.apiPatch).mockResolvedValue({ ...MOCK_TICKET, assignedTo: MOCK_AGENTS[0] });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      await user.selectOptions(getAssignSelect(), 'agent-1');
      await waitFor(() =>
        expect(api.apiPatch).toHaveBeenCalledWith('/api/tickets/1/assign', { assignedToId: 'agent-1' })
      );
    });

    it('calls apiPatch with null when the unassigned option is selected', async () => {
      const user = userEvent.setup();
      mockBothFetches({ assignedTo: { id: 'agent-1', name: 'Alice Agent' } });
      vi.mocked(api.apiPatch).mockResolvedValue({ ...MOCK_TICKET, assignedTo: null });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      await user.selectOptions(getAssignSelect(), '');
      await waitFor(() =>
        expect(api.apiPatch).toHaveBeenCalledWith('/api/tickets/1/assign', { assignedToId: null })
      );
    });

    it('disables only the assign dropdown while the assign mutation is in flight', async () => {
      const user = userEvent.setup();
      mockBothFetches();
      vi.mocked(api.apiPatch).mockReturnValue(new Promise(() => {}));
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      expect(getAssignSelect()).not.toBeDisabled();
      await user.selectOptions(getAssignSelect(), 'agent-1');
      expect(getAssignSelect()).toBeDisabled();
      // status and category are unaffected by the assign mutation
      expect(getStatusSelect()).not.toBeDisabled();
      expect(getCategorySelect()).not.toBeDisabled();
    });

    it('updates the dropdown to the new agent after a successful assignment', async () => {
      const user = userEvent.setup();
      mockBothFetches();
      vi.mocked(api.apiPatch).mockResolvedValue({
        ...MOCK_TICKET,
        assignedTo: { id: 'agent-2', name: 'Bob Agent' },
      });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      await user.selectOptions(getAssignSelect(), 'agent-2');
      await waitFor(() => expect(getAssignSelect().value).toBe('agent-2'));
    });
  });

  describe('reply thread', () => {
    it('shows "No replies yet." when the ticket has no replies', async () => {
      mockBothFetches();
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      expect(screen.getByText(/no replies yet/i)).toBeInTheDocument();
    });

    it('renders each reply body and author name', async () => {
      mockBothFetches({}, MOCK_REPLIES);
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      expect(screen.getByText('Have you tried resetting your password?')).toBeInTheDocument();
      expect(screen.getByText('Still having the same issue.')).toBeInTheDocument();
    });

    it('shows "agent" badge for agent replies and "customer" badge for customer replies', async () => {
      mockBothFetches({}, MOCK_REPLIES);
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      const badges = screen.getAllByText(/^(agent|customer)$/i);
      expect(badges.some((b) => b.textContent === 'agent')).toBe(true);
      expect(badges.some((b) => b.textContent === 'customer')).toBe(true);
    });

    it('fetches replies from the correct endpoint', async () => {
      mockBothFetches();
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets/1/replies');
    });
  });

  describe('reply form', () => {
    it('renders a textarea and Send reply button', async () => {
      mockBothFetches();
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      expect(screen.getByRole('textbox', { name: /reply body/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument();
    });

    it('disables Send reply button when textarea is empty', async () => {
      mockBothFetches();
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      expect(screen.getByRole('button', { name: /send reply/i })).toBeDisabled();
    });

    it('disables Send reply button when textarea contains only whitespace', async () => {
      const user = userEvent.setup();
      mockBothFetches();
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      await user.type(screen.getByRole('textbox', { name: /reply body/i }), '   ');
      expect(screen.getByRole('button', { name: /send reply/i })).toBeDisabled();
    });

    it('enables Send reply button when textarea has content', async () => {
      const user = userEvent.setup();
      mockBothFetches();
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      await user.type(screen.getByRole('textbox', { name: /reply body/i }), 'Hello');
      expect(screen.getByRole('button', { name: /send reply/i })).not.toBeDisabled();
    });

    it('calls apiPost with the correct endpoint and body on submit', async () => {
      const user = userEvent.setup();
      mockBothFetches();
      vi.mocked(api.apiPost).mockResolvedValue(MOCK_REPLIES[0]);
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      await user.type(screen.getByRole('textbox', { name: /reply body/i }), 'Test reply');
      await user.click(screen.getByRole('button', { name: /send reply/i }));
      await waitFor(() =>
        expect(api.apiPost).toHaveBeenCalledWith('/api/tickets/1/replies', {
          body: 'Test reply',
          senderType: 'agent',
        })
      );
    });

    it('clears the textarea after a successful submission', async () => {
      const user = userEvent.setup();
      mockBothFetches();
      vi.mocked(api.apiPost).mockResolvedValue(MOCK_REPLIES[0]);
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      const textarea = screen.getByRole('textbox', { name: /reply body/i });
      await user.type(textarea, 'Test reply');
      await user.click(screen.getByRole('button', { name: /send reply/i }));
      await waitFor(() => expect(textarea).toHaveValue(''));
    });

    it('disables textarea and button while mutation is in flight', async () => {
      const user = userEvent.setup();
      mockBothFetches();
      vi.mocked(api.apiPost).mockReturnValue(new Promise(() => {}));
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      const textarea = screen.getByRole('textbox', { name: /reply body/i });
      await user.type(textarea, 'Test reply');
      await user.click(screen.getByRole('button', { name: /send reply/i }));
      expect(textarea).toBeDisabled();
      expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    });

    it('shows an error message when the POST fails', async () => {
      const user = userEvent.setup();
      mockBothFetches();
      vi.mocked(api.apiPost).mockRejectedValue(new Error('Server error'));
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      await user.type(screen.getByRole('textbox', { name: /reply body/i }), 'Test reply');
      await user.click(screen.getByRole('button', { name: /send reply/i }));
      await waitFor(() =>
        expect(screen.getByText(/failed to send reply/i)).toBeInTheDocument()
      );
    });
  });
});

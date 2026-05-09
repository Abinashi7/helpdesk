import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TicketStatus, TicketCategory } from '@helpdesk/core';
import TicketDetailPage from './TicketDetailPage';
import * as api from '@/lib/api';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api');

const MOCK_AGENTS = [
  { id: 'agent-1', name: 'Alice Agent' },
  { id: 'agent-2', name: 'Bob Agent' },
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

function mockBothFetches(ticketOverride = {}) {
  vi.mocked(api.apiFetch).mockImplementation((path: string) => {
    if (path === '/api/tickets/1') return Promise.resolve({ ...MOCK_TICKET, ...ticketOverride });
    if (path === '/api/users/agents') return Promise.resolve({ agents: MOCK_AGENTS });
    return Promise.reject(new Error(`Unexpected apiFetch: ${path}`));
  });
}

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
    expect(skeletons.length).toBe(5);
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
      const select = screen.getByRole('combobox');
      expect((select as HTMLSelectElement).value).toBe('');
    });

    it('shows the assigned agent as selected', async () => {
      mockBothFetches({ assignedTo: { id: 'agent-1', name: 'Alice Agent' } });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());
      const select = screen.getByRole('combobox');
      expect((select as HTMLSelectElement).value).toBe('agent-1');
    });

    it('calls apiPatch with the correct agent id when an agent is selected', async () => {
      const user = userEvent.setup();
      mockBothFetches();
      vi.mocked(api.apiPatch).mockResolvedValue({ ...MOCK_TICKET, assignedTo: MOCK_AGENTS[0] });
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      await user.selectOptions(screen.getByRole('combobox'), 'agent-1');
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

      await user.selectOptions(screen.getByRole('combobox'), '');
      await waitFor(() =>
        expect(api.apiPatch).toHaveBeenCalledWith('/api/tickets/1/assign', { assignedToId: null })
      );
    });

    it('disables the dropdown while the mutation is in flight', async () => {
      const user = userEvent.setup();
      mockBothFetches();
      vi.mocked(api.apiPatch).mockReturnValue(new Promise(() => {}));
      renderPage();
      await waitFor(() => expect(screen.getByText('Login issue')).toBeInTheDocument());

      const select = screen.getByRole('combobox');
      expect(select).not.toBeDisabled();

      await user.selectOptions(select, 'agent-1');
      expect(select).toBeDisabled();
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

      await user.selectOptions(screen.getByRole('combobox'), 'agent-2');
      await waitFor(() =>
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('agent-2')
      );
    });
  });
});

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 2 });
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
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 2 });
    renderWithQuery(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument()
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('renders the category badge', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 2 });
    renderWithQuery(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText('technical')).toBeInTheDocument()
    );
    expect(screen.getByText('billing')).toBeInTheDocument();
  });

  it('renders the status badge', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 2 });
    renderWithQuery(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText('open')).toBeInTheDocument()
    );
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('formats the received date correctly', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 2 });
    renderWithQuery(<TicketsPage />);
    await waitFor(() =>
      expect(screen.getByText('Jun 1, 2024')).toBeInTheDocument()
    );
    expect(screen.getByText('May 20, 2024')).toBeInTheDocument();
  });

  it('shows "No tickets yet." when the list is empty', async () => {
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: [], total: 0 });
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
    vi.mocked(api.apiFetch).mockResolvedValue({ tickets: [], total: 0 });
    renderWithQuery(<TicketsPage />);
    await waitFor(() => expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets'));
  });

  describe('sorting', () => {
    beforeEach(() => {
      vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 2 });
    });

    it('first click on Subject header fetches with sortBy=subject sortDir=asc', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());

      await user.click(screen.getByRole('columnheader', { name: /subject/i }));
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets', { sortBy: 'subject', sortDir: 'asc' })
      );
    });

    it('second click on Subject header switches to sortDir=desc', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());

      await user.click(screen.getByRole('columnheader', { name: /subject/i }));
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets', { sortBy: 'subject', sortDir: 'asc' })
      );

      await user.click(screen.getByRole('columnheader', { name: /subject/i }));
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets', { sortBy: 'subject', sortDir: 'desc' })
      );
    });

    it('third click on Subject header clears sort back to default endpoint', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());

      await user.click(screen.getByRole('columnheader', { name: /subject/i }));
      await user.click(screen.getByRole('columnheader', { name: /subject/i }));
      await user.click(screen.getByRole('columnheader', { name: /subject/i }));
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenLastCalledWith('/api/tickets')
      );
    });

    it('clicking From header sends sortBy=fromName', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());

      await user.click(screen.getByRole('columnheader', { name: /from/i }));
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets', { sortBy: 'fromName', sortDir: 'asc' })
      );
    });

    it('clicking Received header sends sortBy=createdAt', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());

      await user.click(screen.getByRole('columnheader', { name: /received/i }));
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets', { sortBy: 'createdAt', sortDir: 'asc' })
      );
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 2 });
    });

    it('renders status and category filter dropdowns', async () => {
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());
      expect(screen.getAllByRole('combobox')).toHaveLength(2);
    });

    it('selecting a status filter fetches with status param', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());

      const [statusSelect] = screen.getAllByRole('combobox');
      await user.selectOptions(statusSelect, 'open');
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets', { status: 'open' })
      );
    });

    it('selecting a category filter fetches with category param', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());

      const [, categorySelect] = screen.getAllByRole('combobox');
      await user.selectOptions(categorySelect, 'billing');
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets', { category: 'billing' })
      );
    });

    it('combining status and category filters sends both params', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());

      const [statusSelect, categorySelect] = screen.getAllByRole('combobox');
      await user.selectOptions(statusSelect, 'pending');
      await user.selectOptions(categorySelect, 'technical');
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets', { status: 'pending', category: 'technical' })
      );
    });

    it('clear all button appears when a filter is active and resets on click', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());

      expect(screen.queryByText(/clear all/i)).not.toBeInTheDocument();

      const [statusSelect] = screen.getAllByRole('combobox');
      await user.selectOptions(statusSelect, 'closed');
      expect(screen.getByText(/clear all/i)).toBeInTheDocument();

      await user.click(screen.getByText(/clear all/i));
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenLastCalledWith('/api/tickets')
      );
      expect(screen.queryByText(/clear all/i)).not.toBeInTheDocument();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 2 });
    });

    it('renders the search input', async () => {
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());
      expect(screen.getByPlaceholderText(/search tickets/i)).toBeInTheDocument();
    });

    it('typing in the search bar fetches with search param after debounce', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());

      await user.type(screen.getByPlaceholderText(/search tickets/i), 'billing');
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets', { search: 'billing' }),
        { timeout: 1000 },
      );
    });

    it('clear all button also clears the search', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText('Cannot log in to my account')).toBeInTheDocument());

      await user.type(screen.getByPlaceholderText(/search tickets/i), 'foo');
      await waitFor(() => expect(screen.getByText(/clear all/i)).toBeInTheDocument());

      await user.click(screen.getByText(/clear all/i));
      expect(screen.getByPlaceholderText(/search tickets/i)).toHaveValue('');
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenLastCalledWith('/api/tickets'),
        { timeout: 1000 },
      );
    });
  });

  describe('pagination', () => {
    it('does not show pagination when there are no tickets', async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({ tickets: [], total: 0 });
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText(/no tickets yet/i)).toBeInTheDocument());
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    });

    it('shows result count and page info when tickets are loaded', async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 45 });
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByText(/showing 1–10 of 45 tickets/i)).toBeInTheDocument());
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
    });

    it('Previous button is disabled on page 1', async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 45 });
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled());
    });

    it('Next button is disabled on the last page', async () => {
      vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 2 });
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByRole('button', { name: /next/i })).toBeDisabled());
    });

    it('clicking Next fetches page 2', async () => {
      const user = userEvent.setup();
      vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 45 });
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByRole('button', { name: /next/i })).toBeEnabled());

      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenCalledWith('/api/tickets', { page: '2' })
      );
      expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
    });

    it('clicking Previous from page 2 goes back to page 1 without page param', async () => {
      const user = userEvent.setup();
      vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 45 });
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByRole('button', { name: /next/i })).toBeEnabled());

      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /previous/i }));
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenLastCalledWith('/api/tickets')
      );
    });

    it('changing a filter resets to page 1', async () => {
      const user = userEvent.setup();
      vi.mocked(api.apiFetch).mockResolvedValue({ tickets: MOCK_TICKETS, total: 45 });
      renderWithQuery(<TicketsPage />);
      await waitFor(() => expect(screen.getByRole('button', { name: /next/i })).toBeEnabled());

      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument());

      const [statusSelect] = screen.getAllByRole('combobox');
      await user.selectOptions(statusSelect, 'open');
      await waitFor(() =>
        expect(api.apiFetch).toHaveBeenLastCalledWith('/api/tickets', { status: 'open' })
      );
    });
  });
});

import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TicketStatus, TicketCategory, type Ticket } from '@helpdesk/core';
import TicketDetail from './TicketDetail';

const MOCK_TICKET: Ticket = {
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

describe('TicketDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the subject as a heading', () => {
    render(<TicketDetail ticket={MOCK_TICKET} />);
    expect(screen.getByRole('heading', { name: 'Login issue' })).toBeInTheDocument();
  });

  it('renders fromName and fromEmail in the From row', () => {
    render(<TicketDetail ticket={MOCK_TICKET} />);
    const fromRow = screen.getByText('From:').closest('div')!;
    expect(fromRow).toHaveTextContent('Jane Doe');
    expect(fromRow).toHaveTextContent('user@example.com');
  });

  it('renders the ticket body', () => {
    render(<TicketDetail ticket={MOCK_TICKET} />);
    expect(screen.getByText('I cannot log in to my account.')).toBeInTheDocument();
  });

  it('renders the received date in the Received row', () => {
    render(<TicketDetail ticket={MOCK_TICKET} />);
    const receivedRow = screen.getByText('Received:').closest('div')!;
    expect(receivedRow).toHaveTextContent('June 1, 2024');
  });

  it('renders different subjects for different tickets', () => {
    const ticket = { ...MOCK_TICKET, subject: 'Billing question' };
    render(<TicketDetail ticket={ticket} />);
    expect(screen.getByRole('heading', { name: 'Billing question' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Login issue' })).not.toBeInTheDocument();
  });

  it('renders the full body text', () => {
    const ticket = { ...MOCK_TICKET, body: 'Specific body text here' };
    render(<TicketDetail ticket={ticket} />);
    expect(screen.getByText('Specific body text here')).toBeInTheDocument();
  });
});

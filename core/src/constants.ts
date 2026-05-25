import { TicketStatus, TicketCategory } from './enums.js';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new:        'New',
  processing: 'Processing',
  open:       'Open',
  pending:    'Pending',
  resolved:   'Resolved',
  closed:     'Closed',
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  billing:   'Billing',
  technical: 'Technical',
  account:   'Account',
  general:   'General',
};

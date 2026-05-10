export const Role = {
  admin: 'admin',
  agent: 'agent',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const TicketStatus = {
  open:    'open',
  pending: 'pending',
  closed:  'closed',
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketCategory = {
  billing:   'billing',
  technical: 'technical',
  account:   'account',
  general:   'general',
} as const;

export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const ReplySenderType = {
  agent:    'agent',
  customer: 'customer',
} as const;

export type ReplySenderType = (typeof ReplySenderType)[keyof typeof ReplySenderType];

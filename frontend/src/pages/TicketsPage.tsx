import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type SortingState } from '@tanstack/react-table';
import { TicketStatus, TicketCategory } from '@helpdesk/core';
import { apiFetch } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { TicketsTable, type Ticket } from '@/components/TicketsTable';

const SORT_KEY_MAP: Record<string, string> = {
  subject: 'subject',
  from: 'fromName',
  category: 'category',
  status: 'status',
  createdAt: 'createdAt',
};

function fetchTickets(sorting: SortingState, status: string, category: string, search: string) {
  const params: Record<string, string> = {};
  if (sorting.length > 0) {
    params.sortBy = SORT_KEY_MAP[sorting[0].id] ?? 'createdAt';
    params.sortDir = sorting[0].desc ? 'desc' : 'asc';
  }
  if (status) params.status = status;
  if (category) params.category = category;
  if (search) params.search = search;
  if (Object.keys(params).length > 0) {
    return apiFetch<{ tickets: Ticket[] }>('/api/tickets', params).then((d) => d.tickets);
  }
  return apiFetch<{ tickets: Ticket[] }>('/api/tickets').then((d) => d.tickets);
}

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: tickets, isPending, isError } = useQuery({
    queryKey: ['tickets', sorting, statusFilter, categoryFilter, search],
    queryFn: () => fetchTickets(sorting, statusFilter, categoryFilter, search),
  });

  const hasFilters = searchInput !== '' || statusFilter !== '' || categoryFilter !== '';

  function clearAll() {
    setStatusFilter('');
    setCategoryFilter('');
    setSearchInput('');
    setSearch('');
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Tickets</h1>
      <div className="mt-4 flex items-center gap-3">
        <Input
          type="search"
          placeholder="Search tickets…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64 h-8 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All statuses</option>
          <option value={TicketStatus.open}>Open</option>
          <option value={TicketStatus.pending}>Pending</option>
          <option value={TicketStatus.closed}>Closed</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | '')}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All categories</option>
          <option value={TicketCategory.billing}>Billing</option>
          <option value={TicketCategory.technical}>Technical</option>
          <option value={TicketCategory.account}>Account</option>
          <option value={TicketCategory.general}>General</option>
        </select>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
      <TicketsTable
        tickets={tickets}
        isPending={isPending}
        isError={isError}
        sorting={sorting}
        onSortingChange={setSorting}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type SortingState, type OnChangeFn } from '@tanstack/react-table';
import { TicketStatus, TicketCategory, type Ticket } from '@helpdesk/core';
import { apiFetch } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TicketsTable } from '@/components/TicketsTable';

const PAGE_SIZE = 10;

const SORT_KEY_MAP: Record<string, string> = {
  subject: 'subject',
  from: 'fromName',
  category: 'category',
  status: 'status',
  createdAt: 'createdAt',
};

function fetchTickets(
  sorting: SortingState,
  status: string,
  category: string,
  search: string,
  page: number,
) {
  const params: Record<string, string> = {};
  if (sorting.length > 0) {
    params.sortBy = SORT_KEY_MAP[sorting[0].id] ?? 'createdAt';
    params.sortDir = sorting[0].desc ? 'desc' : 'asc';
  }
  if (status) params.status = status;
  if (category) params.category = category;
  if (search) params.search = search;
  if (page > 1) params.page = String(page);
  if (Object.keys(params).length > 0) {
    return apiFetch<{ tickets: Ticket[]; total: number }>('/api/tickets', params);
  }
  return apiFetch<{ tickets: Ticket[]; total: number }>('/api/tickets');
}

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(updater);
    setPage(1);
  };

  const { data, isPending, isError } = useQuery({
    queryKey: ['tickets', sorting, statusFilter, categoryFilter, search, page],
    queryFn: () => fetchTickets(sorting, statusFilter, categoryFilter, search, page),
  });

  const tickets = data?.tickets;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const hasFilters = searchInput !== '' || statusFilter !== '' || categoryFilter !== '';

  function clearAll() {
    setStatusFilter('');
    setCategoryFilter('');
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  const selectClass = "rounded-lg border bg-card px-3 py-1.5 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring hover:bg-muted/50";

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Tickets</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Input
          type="search"
          placeholder="Search tickets…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-64 h-8 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as TicketStatus | ''); setPage(1); }}
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value={TicketStatus.open}>Open</option>
          <option value={TicketStatus.pending}>Pending</option>
          <option value={TicketStatus.resolved}>Resolved</option>
          <option value={TicketStatus.closed}>Closed</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value as TicketCategory | ''); setPage(1); }}
          className={selectClass}
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
            className="text-sm text-muted-foreground link"
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
        onSortingChange={handleSortingChange}
      />
      {!isPending && !isError && total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {rangeStart}–{rangeEnd} of {total} tickets</span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              ← Previous
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

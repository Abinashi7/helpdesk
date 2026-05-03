import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type SortingState } from '@tanstack/react-table';
import { apiFetch } from '@/lib/api';
import { TicketsTable, type Ticket } from '@/components/TicketsTable';

const SORT_KEY_MAP: Record<string, string> = {
  subject: 'subject',
  from: 'fromName',
  category: 'category',
  status: 'status',
  createdAt: 'createdAt',
};

function fetchTickets(sorting: SortingState) {
  if (sorting.length === 0) {
    return apiFetch<{ tickets: Ticket[] }>('/api/tickets').then((d) => d.tickets);
  }
  const params = {
    sortBy: SORT_KEY_MAP[sorting[0].id] ?? 'createdAt',
    sortDir: sorting[0].desc ? 'desc' : 'asc',
  };
  return apiFetch<{ tickets: Ticket[] }>('/api/tickets', params).then((d) => d.tickets);
}

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: tickets, isPending, isError } = useQuery({
    queryKey: ['tickets', sorting],
    queryFn: () => fetchTickets(sorting),
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Tickets</h1>
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

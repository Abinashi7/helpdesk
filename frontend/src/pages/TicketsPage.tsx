import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { TicketsTable, type Ticket } from '@/components/TicketsTable';

function fetchTickets() {
  return apiFetch<{ tickets: Ticket[] }>('/api/tickets').then((d) => d.tickets);
}

export default function TicketsPage() {
  const { data: tickets, isPending, isError } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Tickets</h1>
      <TicketsTable tickets={tickets} isPending={isPending} isError={isError} />
    </div>
  );
}

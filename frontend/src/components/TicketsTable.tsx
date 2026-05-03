import { TicketStatus, TicketCategory } from '@helpdesk/core';
import { Skeleton } from '@/components/ui/skeleton';

export interface Ticket {
  id: number;
  subject: string;
  fromEmail: string;
  fromName: string;
  category: TicketCategory | null;
  status: TicketStatus;
  createdAt: string;
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    [TicketStatus.open]: 'bg-blue-100 text-blue-700',
    [TicketStatus.pending]: 'bg-amber-100 text-amber-700',
    [TicketStatus.closed]: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

function CategoryBadge({ category }: { category: TicketCategory | null }) {
  if (!category) return <span className="text-gray-400 text-xs">—</span>;
  const styles: Record<TicketCategory, string> = {
    [TicketCategory.billing]: 'bg-orange-100 text-orange-700',
    [TicketCategory.technical]: 'bg-sky-100 text-sky-700',
    [TicketCategory.account]: 'bg-violet-100 text-violet-700',
    [TicketCategory.general]: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[category]}`}>
      {category}
    </span>
  );
}

const columns = (
  <tr>
    <th className="px-4 py-3">Subject</th>
    <th className="px-4 py-3">From</th>
    <th className="px-4 py-3">Category</th>
    <th className="px-4 py-3">Status</th>
    <th className="px-4 py-3">Received</th>
  </tr>
);

interface TicketsTableProps {
  tickets: Ticket[] | undefined;
  isPending: boolean;
  isError: boolean;
}

export function TicketsTable({ tickets, isPending, isError }: TicketsTableProps) {
  if (isError) {
    return <p className="mt-6 text-sm text-destructive">Failed to load tickets.</p>;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
          {columns}
        </thead>
        <tbody className="divide-y">
          {isPending
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                </tr>
              ))
            : tickets?.length === 0
              ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    No tickets yet.
                  </td>
                </tr>
              )
              : tickets?.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{ticket.subject}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{ticket.fromName}</div>
                    <div className="text-xs text-gray-500">{ticket.fromEmail}</div>
                  </td>
                  <td className="px-4 py-3"><CategoryBadge category={ticket.category} /></td>
                  <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

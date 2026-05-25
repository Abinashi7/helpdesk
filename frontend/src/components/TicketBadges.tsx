import { TicketStatus, TicketCategory } from '@helpdesk/core';

export function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    [TicketStatus.new]:        'bg-purple-100 text-purple-700',
    [TicketStatus.processing]: 'bg-yellow-100 text-yellow-700',
    [TicketStatus.open]:       'bg-blue-100 text-blue-700',
    [TicketStatus.pending]:    'bg-amber-100 text-amber-700',
    [TicketStatus.resolved]:   'bg-green-100 text-green-700',
    [TicketStatus.closed]:     'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

export function CategoryBadge({ category }: { category: TicketCategory | null }) {
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

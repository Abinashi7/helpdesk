import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type OnChangeFn,
} from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { TicketStatus, TicketCategory, type Ticket } from '@helpdesk/core';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, CategoryBadge } from '@/components/TicketBadges';
import { ErrorMessage } from '@/components/ui/error-message';

export type { Ticket };

const columns: ColumnDef<Ticket>[] = [
  {
    id: 'subject',
    accessorKey: 'subject',
    header: 'Subject',
    enableSorting: true,
    cell: ({ getValue, row }) => (
      <Link
        to={`/tickets/${row.original.id}`}
        className="font-medium link"
        onClick={(e) => e.stopPropagation()}
      >
        {getValue<string>()}
      </Link>
    ),
  },
  {
    id: 'from',
    accessorFn: (row) => row.fromName,
    header: 'From',
    enableSorting: true,
    cell: ({ row }) => (
      <div>
        <div className="text-gray-900">{row.original.fromName}</div>
        <div className="text-xs text-gray-500">{row.original.fromEmail}</div>
      </div>
    ),
  },
  {
    id: 'category',
    accessorKey: 'category',
    header: 'Category',
    enableSorting: true,
    cell: ({ getValue }) => <CategoryBadge category={getValue<TicketCategory | null>()} />,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    enableSorting: true,
    cell: ({ getValue }) => <StatusBadge status={getValue<TicketStatus>()} />,
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Received',
    enableSorting: true,
    cell: ({ getValue }) =>
      new Date(getValue<string>()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
  },
];

interface TicketsTableProps {
  tickets: Ticket[] | undefined;
  isPending: boolean;
  isError: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}

export function TicketsTable({ tickets, isPending, isError, sorting, onSortingChange }: TicketsTableProps) {
  const table = useReactTable({
    data: tickets ?? [],
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });

  if (isError) {
    return <ErrorMessage className="mt-6">Failed to load tickets.</ErrorMessage>;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className="px-4 py-3 select-none"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        sorted === 'asc' ? (
                          <ChevronUp className="h-3 w-3" aria-hidden />
                        ) : sorted === 'desc' ? (
                          <ChevronDown className="h-3 w-3" aria-hidden />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 text-gray-400" aria-hidden />
                        )
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
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
            : table.getRowModel().rows.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-400">
                    No tickets yet.
                  </td>
                </tr>
              )
              : table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
  createdAt: string;
}

type Role = User['role'];

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    admin: 'bg-violet-100 text-violet-700',
    agent: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[role]}`}>
      {role}
    </span>
  );
}

const columns = (
  <tr>
    <th className="px-4 py-3">Name</th>
    <th className="px-4 py-3">Email</th>
    <th className="px-4 py-3">Role</th>
    <th className="px-4 py-3">Joined</th>
  </tr>
);

interface UsersTableProps {
  users: User[] | undefined;
  isPending: boolean;
  isError: boolean;
}

export function UsersTable({ users, isPending, isError }: UsersTableProps) {
  if (isError) {
    return <p className="mt-6 text-sm text-destructive">Failed to load users.</p>;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
          {columns}
        </thead>
        <tbody className="divide-y">
          {isPending
            ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                </tr>
              ))
            : users?.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
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

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

type Role = 'admin' | 'agent';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

function fetchUsers() {
  return apiFetch<{ users: User[] }>('/api/users').then((d) => d.users);
}

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

export default function UsersPage() {
  const { data: users, isPending, isError } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Users</h1>

      {isPending && (
        <div className="mt-6 overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isError && (
        <p className="mt-6 text-sm text-destructive">Failed to load users.</p>
      )}

      {users && (
        <div className="mt-6 overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
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
      )}
    </div>
  );
}

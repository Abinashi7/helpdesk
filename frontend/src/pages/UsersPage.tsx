import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { UsersTable, type User } from '@/components/UsersTable';
import { CreateUserModal } from '@/components/CreateUserModal';
import { EditUserModal } from '@/components/EditUserModal';

function fetchUsers() {
  return apiFetch<{ users: User[] }>('/api/users').then((d) => d.users);
}

export default function UsersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { data: users, isPending, isError } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Button onClick={() => setModalOpen(true)}>Create user</Button>
      </div>

      {modalOpen && <CreateUserModal onClose={() => setModalOpen(false)} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />}

      <UsersTable users={users} isPending={isPending} isError={isError} onEdit={setEditingUser} />
    </div>
  );
}

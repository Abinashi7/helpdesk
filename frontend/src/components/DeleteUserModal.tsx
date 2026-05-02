import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { type User } from '@/components/UsersTable';

interface DeleteUserModalProps {
  user: User;
  onClose: () => void;
}

export function DeleteUserModal({ user, onClose }: DeleteUserModalProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: () => apiDelete(`/api/users/${user.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err: unknown) => {
      console.error('Failed to delete user', err);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" data-testid="modal-backdrop" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-semibold">Delete user</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{user.name}</strong>? This cannot be undone.
        </p>
        {mutation.isError && (
          <p className="mb-4 text-sm text-destructive">
            {axios.isAxiosError(mutation.error)
              ? (mutation.error.response?.data as { error?: string })?.error ?? 'Failed to delete user'
              : 'Failed to delete user'}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Deleting…' : 'Delete user'}
          </Button>
        </div>
      </div>
    </div>
  );
}

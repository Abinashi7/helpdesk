import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateUserSchema, type UpdateUserInput } from '@helpdesk/core';
import { apiPatch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorMessage } from '@/components/ui/error-message';
import { type User } from '@/components/UsersTable';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
}

export function EditUserModal({ user, onClose }: EditUserModalProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: user.name, email: user.email, password: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: UpdateUserInput) =>
      apiPatch<{ user: User }>(`/api/users/${user.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Failed to update user';
      setError('root', { message: msg });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" data-testid="modal-backdrop" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
        <h2 className="mb-5 text-lg font-semibold">Edit user</h2>
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eu-name">Name</Label>
            <Input
              id="eu-name"
              placeholder="Jane Smith"
              autoComplete="off"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && <ErrorMessage className="text-xs">{errors.name.message}</ErrorMessage>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eu-email">Email</Label>
            <Input
              id="eu-email"
              type="email"
              placeholder="jane@example.com"
              autoComplete="off"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && <ErrorMessage className="text-xs">{errors.email.message}</ErrorMessage>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eu-password">New password</Label>
            <Input
              id="eu-password"
              type="password"
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <ErrorMessage className="text-xs">{errors.password.message}</ErrorMessage>
            )}
          </div>
          {errors.root && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

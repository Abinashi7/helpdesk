import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { simulateEmailSchema, type SimulateEmailInput } from '@helpdesk/core';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorMessage } from '@/components/ui/error-message';

/**
 * Three outcomes worth showing: one the knowledge base answers, one an escalation
 * rule blocks, and one the AI should not be confident enough to touch.
 */
const PRESETS: { label: string; hint: string; values: SimulateEmailInput }[] = [
  {
    label: 'Answerable from the KB',
    hint: 'The AI should resolve this automatically',
    values: {
      subject: 'How do I reset my password?',
      body: "I can't remember my password and the login page keeps rejecting me. How do I reset it?",
      fromName: 'Priya Raman',
      fromEmail: 'priya.raman@example.com',
    },
  },
  {
    label: 'Blocked by an escalation rule',
    hint: 'Legal threat — always routed to a human',
    values: {
      subject: 'Refund or I am contacting my lawyer',
      body: 'I was charged again after cancelling. I want a full refund today or I will be speaking to my lawyer about this.',
      fromName: 'Daniel Boyd',
      fromEmail: 'daniel.boyd@example.com',
    },
  },
  {
    label: 'Not covered by the KB',
    hint: 'Low confidence — escalated to a human',
    values: {
      subject: 'Does this integrate with our internal CRM?',
      body: 'We run a bespoke in-house CRM built on an old Oracle stack. Can your product sync tickets into it, and is there a migration path?',
      fromName: 'Aisha Bello',
      fromEmail: 'aisha.bello@example.com',
    },
  },
];

export default function SimulateEmailModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
    reset,
    setError,
    formState: { errors },
  } = useForm<SimulateEmailInput>({
    resolver: zodResolver(simulateEmailSchema),
    defaultValues: PRESETS[0].values,
  });

  const mutation = useMutation({
    mutationFn: (data: SimulateEmailInput) =>
      apiPost<{ ticketId: number }>('/api/tickets/simulate-email', data),
    onSuccess: ({ ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      onClose();
      navigate(`/tickets/${ticketId}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Failed to send the email';
      setError('root', { message: msg });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" data-testid="modal-backdrop" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Simulate an incoming email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Creates a ticket through the same pipeline the Mailgun webhook uses, then runs the
          classify and auto-resolve workers on it.
        </p>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label>Start from an example</Label>
          <div className="flex flex-col gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => reset(preset.values)}
                className="rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="font-medium">{preset.label}</span>
                <span className="block text-xs text-muted-foreground">{preset.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          noValidate
          className="mt-4 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="se-subject">Subject</Label>
            <Input id="se-subject" autoComplete="off" aria-invalid={!!errors.subject} {...register('subject')} />
            {errors.subject && <ErrorMessage className="text-xs">{errors.subject.message}</ErrorMessage>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="se-body">Message</Label>
            <textarea
              id="se-body"
              rows={5}
              aria-invalid={!!errors.body}
              className="rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              {...register('body')}
            />
            {errors.body && <ErrorMessage className="text-xs">{errors.body.message}</ErrorMessage>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="se-name">From name</Label>
              <Input id="se-name" autoComplete="off" aria-invalid={!!errors.fromName} {...register('fromName')} />
              {errors.fromName && <ErrorMessage className="text-xs">{errors.fromName.message}</ErrorMessage>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="se-email">From email</Label>
              <Input id="se-email" autoComplete="off" aria-invalid={!!errors.fromEmail} {...register('fromEmail')} />
              {errors.fromEmail && <ErrorMessage className="text-xs">{errors.fromEmail.message}</ErrorMessage>}
            </div>
          </div>

          {errors.root && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending…' : 'Send email'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

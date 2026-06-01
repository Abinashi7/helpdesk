import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorMessage } from '@/components/ui/error-message';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: LoginForm) {
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setError('root', { message: error.message ?? 'Invalid email or password' });
      return;
    }

    await authClient.$store.atoms.session.get().refetch();
    navigate('/');
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left branding panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 lg:flex lg:w-[420px]">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, oklch(1 0 0) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative flex items-center gap-2.5 text-primary-foreground">
          <div className="flex size-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Headphones className="size-4" />
          </div>
          <span className="font-display text-lg font-semibold">Helpdesk</span>
        </div>

        <div className="relative">
          <h1 className="font-display text-4xl font-bold leading-tight text-white">
            Support your team,<br />delight your customers.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-primary-foreground/70">
            AI-powered ticket management that resolves common questions automatically and routes complex ones to the right agent.
          </p>
        </div>

        <p className="relative text-xs text-primary-foreground/40">© 2025 Helpdesk</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Headphones className="size-4" />
            </div>
            <span className="font-display text-lg font-semibold">Helpdesk</span>
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-7 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <ErrorMessage className="text-xs">{errors.email.message}</ErrorMessage>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
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
            <Button type="submit" disabled={isSubmitting} className="mt-1 w-full" size="lg">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

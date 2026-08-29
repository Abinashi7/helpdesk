import { z } from 'zod';

const envSchema = z.object({
  // App
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Better Auth — session tokens are signed with this secret.
  // Generate with: openssl rand -base64 32
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters')
    .refine((s) => s !== 'change-me-to-a-random-32-char-secret', {
      message: 'BETTER_AUTH_SECRET must not be the default placeholder value',
    }),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3001'),

  // Seed
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),

  // Email (Mailgun)
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MAILGUN_FROM_EMAIL: z.string().email().optional(),
  // EU-region Mailgun accounts must use https://api.eu.mailgun.net — the US
  // default silently 401s against an EU domain.
  MAILGUN_API_URL: z.string().url().default('https://api.mailgun.net'),

  // Webhooks
  // Mailgun's HTTP webhook signing key (Dashboard → Sending → Webhooks).
  // This is NOT the API key. When set, inbound requests must carry a valid
  // Mailgun HMAC signature.
  MAILGUN_SIGNING_KEY: z.string().optional(),
  // Fallback shared secret for local/e2e requests that aren't signed by Mailgun.
  WEBHOOK_SECRET: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.enum(['production', 'development']).optional(),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),

  // Demo mode — for the public portfolio deployment. Suppresses outbound email,
  // rate-limits the AI endpoints, and blocks destructive user management, so
  // published demo credentials can't send real mail or burn API credits.
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient, Role } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

// disableSignUp is intentionally omitted here — better-auth enforces it even for
// direct API calls, which would break seeding. The security guarantee is that this
// instance is never mounted as a request handler; it is only called via execSync
// from the seed script.
const seedAuth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  secret: process.env.BETTER_AUTH_SECRET!,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const response = await seedAuth.api.signUpEmail({
    body: { email, password, name: 'Admin' },
  });

  await prisma.user.update({
    where: { id: response.user.id },
    data: { role: Role.admin, emailVerified: true },
  });

  console.log(`Admin user created: ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../generated/prisma/client.js';
import { AI_AGENT_EMAIL } from '../src/lib/constants.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

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

async function createUser(email: string, password: string, name: string, role: Role) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User already exists: ${email}`);
    return;
  }
  const response = await seedAuth.api.signUpEmail({ body: { email, password, name } });
  await prisma.user.update({
    where: { id: response.user.id },
    data: { role, emailVerified: true },
  });
  console.log(`User created: ${email} (${role})`);
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set');
  }

  await createUser(adminEmail, adminPassword, 'Admin', Role.admin);
  await createUser('agent@example.com', 'password123', 'Agent', Role.agent);
  await createUser(AI_AGENT_EMAIL, crypto.randomUUID(), 'AI', Role.agent);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

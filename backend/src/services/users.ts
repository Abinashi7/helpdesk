import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../lib/db.js';
import { Role } from '../lib/types.js';
import { env } from '../config/env.js';

// Separate instance without disableSignUp so admins can create users
const userCreationAuth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

export async function listUsers() {
  return prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: 'asc' },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(name: string, email: string, password: string) {
  await userCreationAuth.api.signUpEmail({ body: { name, email, password } });

  return prisma.user.update({
    where: { email },
    data: { role: Role.agent },
    select: userSelect,
  });
}

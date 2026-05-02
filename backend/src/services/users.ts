import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { hashPassword } from 'better-auth/crypto';
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
    where: { deletedAt: null },
    select: userSelect,
    orderBy: { createdAt: 'asc' },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email, deletedAt: null } });
}

export async function getUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export async function deleteUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function updateUser(
  id: string,
  data: { name: string; email: string; password?: string },
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { name: data.name, email: data.email },
      select: userSelect,
    });

    if (data.password) {
      const hashed = await hashPassword(data.password);
      await tx.account.updateMany({
        where: { userId: id, providerId: 'credential' },
        data: { password: hashed },
      });
    }

    return user;
  });
}

export async function createUser(name: string, email: string, password: string) {
  await userCreationAuth.api.signUpEmail({ body: { name, email, password } });

  return prisma.user.update({
    where: { email },
    data: { role: Role.agent },
    select: userSelect,
  });
}

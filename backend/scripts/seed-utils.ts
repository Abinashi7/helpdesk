import { prisma } from '../src/lib/db.js';
import { AI_AGENT_EMAIL } from '../src/lib/constants.js';

/**
 * Every ticket written by a seed script carries this messageId prefix, so a
 * reseed can clear its own rows without touching tickets that arrived through
 * the real Mailgun webhook.
 */
export const SEED_MESSAGE_PREFIX = 'seed-';

/**
 * Deterministic PRNG (mulberry32). The seed scripts are re-run on a schedule and
 * we want the *shape* of the demo data to be stable — same statuses, same reply
 * mix — while the dates move forward with each run.
 */
export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

/** Fisher-Yates, driven by the deterministic rng so runs are reproducible. */
export function shuffle<T>(random: () => number, items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function firstName(fullName: string): string {
  return fullName.split(' ')[0];
}

/**
 * The seed scripts author replies as the AI account and the demo agent, both of
 * which are created by `prisma/seed.ts`. Fail loudly rather than writing replies
 * with a dangling authorId.
 */
export async function seedAuthors() {
  const agentEmail = process.env.SEED_AGENT_EMAIL ?? 'agent@example.com';

  const [ai, agent] = await Promise.all([
    prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL }, select: { id: true, name: true } }),
    prisma.user.findUnique({ where: { email: agentEmail }, select: { id: true, name: true } }),
  ]);

  if (!ai || !agent) {
    const missing = [!ai && AI_AGENT_EMAIL, !agent && agentEmail].filter(Boolean).join(', ');
    throw new Error(`Missing seeded user(s): ${missing}. Run "bun run db:seed" first.`);
  }

  return { ai, agent };
}

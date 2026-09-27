import { type Response } from 'express';
import { z } from 'zod';

export function validate<T>(schema: z.ZodType<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid request' });
    return null;
  }
  return result.data;
}

import { Router, type Response } from 'express';
import { z } from 'zod';
import { createUserSchema, updateUserSchema } from '@helpdesk/core';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { listUsers, getUserByEmail, createUser, getUserById, updateUser } from '../services/users.js';

const router = Router();

function validate<T>(schema: z.ZodType<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return null;
  }
  return result.data;
}

router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  const users = await listUsers();
  res.json({ users });
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const data = validate(createUserSchema, req.body, res);
  if (!data) return;

  const { name, email, password } = data;

  const existing = await getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const user = await createUser(name, email, password);
  res.status(201).json({ user });
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const data = validate(updateUserSchema, req.body, res);
  if (!data) return;

  const { name, email, password } = data;
  const { id } = req.params as { id: string };

  const target = await getUserById(id);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const existing = await getUserByEmail(email);
  if (existing && existing.id !== id) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const user = await updateUser(id, { name, email, password });
  res.json({ user });
});

export default router;

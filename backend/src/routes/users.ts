import { Router } from 'express';
import { createUserSchema } from '@helpdesk/core';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { listUsers, getUserByEmail, createUser } from '../services/users.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  const users = await listUsers();
  res.json({ users });
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const user = await createUser(name, email, password);
  res.status(201).json({ user });
});

export default router;

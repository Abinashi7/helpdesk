import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().trim().min(8, 'Password must be at least 8 characters'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.trim().length >= 8, 'Password must be at least 8 characters')
    .transform((val) => (!val ? undefined : val.trim())),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

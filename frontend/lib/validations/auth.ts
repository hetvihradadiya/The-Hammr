import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),

    email: z.string().email('Enter a valid email address'),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password is too long')
      .regex(/[a-z]/, 'Password needs a lowercase letter')
      .regex(/[A-Z]/, 'Password needs an uppercase letter')
      .regex(/[0-9]/, 'Password needs a number'),

    passwordConfirm: z.string(),

    role: z.enum(['BUYER', 'SELLER']),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),

  password: z.string().min(1, 'Password is required'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;

import { z } from 'zod';

export const authCredentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128).regex(/[A-Za-z]/, 'La contraseña debe incluir letras.').regex(/\d/, 'La contraseña debe incluir números.'),
});

export const guestAccessSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
});

export const publicOrderSchema = z.object({
  order_number: z.string(),
  status: z.string(),
  payment_status: z.string(),
  total_amount: z.coerce.number().nonnegative(),
  currency: z.string().default('USD'),
  items: z.array(z.record(z.unknown())).default([]),
  created_at: z.string(),
  tracking_number: z.string().nullable().optional(),
  carrier: z.string().nullable().optional(),
}).strip();

export type PublicOrder = z.infer<typeof publicOrderSchema>;

import { z } from 'zod';
// Mirrors the app's types in src/lib/types.ts and src/lib/currency.ts. Keep these in sync.
export const CURRENCY_CODES = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD', 'AED'] as const;
export const BILLING_CYCLES = ['weekly', 'monthly', 'quarterly', 'yearly'] as const;
export const CATEGORIES = [
  'Entertainment', 'Music', 'Productivity', 'Cloud', 'Education', 'Fitness', 'News', 'Utilities', 'Other',
] as const;
export const REMINDER_DAYS = [0, 1, 3, 7] as const;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email();

export const passwordSchema = z.string().min(10, 'at least 10 characters').max(128);

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(80),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const resendSchema = z.object({ email: emailSchema });

export const subscriptionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z.number().finite().nonnegative().max(1_000_000_000),
  currency: z.enum(CURRENCY_CODES),
  cycle: z.enum(BILLING_CYCLES),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(d)), 'invalid date'),
  category: z.enum(CATEGORIES),
  reminderDaysBefore: z.union([z.null(), z.literal(0), z.literal(1), z.literal(3), z.literal(7)]),
  notes: z.string().max(500).optional(),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

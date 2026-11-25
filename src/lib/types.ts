import type { CountryCode } from './catalog';
import type { CurrencyCode } from './currency';

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export const CATEGORIES = [
  'Entertainment',
  'Music',
  'Productivity',
  'Cloud',
  'Education',
  'Fitness',
  'News',
  'Utilities',
  'Other',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Days before renewal to remind; null = no reminder. */
export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Off' },
  { value: 0, label: 'Same day' },
  { value: 1, label: '1 day' },
  { value: 3, label: '3 days' },
  { value: 7, label: '1 week' },
];

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  cycle: BillingCycle;
  /** First billing date, YYYY-MM-DD (local). Renewals are derived from this anchor. */
  startDate: string;
  category: Category;
  reminderDaysBefore: number | null;
  notes?: string;
  /** Labels the user makes up (e.g. "Work", "Family plan") for filtering. Missing in data saved before tags existed. */
  tags?: string[];
  createdAt: number;
}

export type SubscriptionInput = Omit<Subscription, 'id' | 'createdAt'>;

export interface Settings {
  baseCurrency: CurrencyCode;
  /** Units of each currency per 1 USD. */
  rates: Record<CurrencyCode, number>;
  /** Country whose popular services and prices the add form offers. Unset until the user picks one. */
  country?: CountryCode;
}

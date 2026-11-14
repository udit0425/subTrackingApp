import { convert, type CurrencyCode } from './currency';
import type { BillingCycle, Settings, Subscription } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse YYYY-MM-DD as a local-time date (not UTC). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISODate(parseISODate(s)) === s;
}

export function startOfDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole calendar days from `from` to `to` (DST-safe). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

/** Add months, clamping to the last day (Jan 31 + 1 month = Feb 28/29). */
function addMonthsClamped(date: Date, months: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), lastDay));
}

const MONTHS_PER_CYCLE: Record<Exclude<BillingCycle, 'weekly'>, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/** The n-th renewal after the anchor (n = 0 is the anchor itself). Always computed from the anchor, so month-end dates don't drift. */
export function addCycles(anchor: Date, cycle: BillingCycle, n: number): Date {
  if (cycle === 'weekly') {
    return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 7 * n);
  }
  return addMonthsClamped(anchor, MONTHS_PER_CYCLE[cycle] * n);
}

/** First renewal date on or after `from`. */
export function nextRenewal(sub: Pick<Subscription, 'startDate' | 'cycle'>, from: Date = new Date()): Date {
  return upcomingRenewals(sub, 1, from)[0];
}

/** The next `count` renewal dates on or after `from`. */
export function upcomingRenewals(
  sub: Pick<Subscription, 'startDate' | 'cycle'>,
  count: number,
  from: Date = new Date(),
): Date[] {
  const anchor = parseISODate(sub.startDate);
  const today = startOfDay(from);
  let n = 0;
  if (anchor < today) {
    // Jump close to today, then step forward.
    if (sub.cycle === 'weekly') {
      n = Math.max(0, Math.floor(daysBetween(anchor, today) / 7) - 1);
    } else {
      const months =
        (today.getFullYear() - anchor.getFullYear()) * 12 + (today.getMonth() - anchor.getMonth());
      n = Math.max(0, Math.floor(months / MONTHS_PER_CYCLE[sub.cycle]) - 1);
    }
    while (addCycles(anchor, sub.cycle, n) < today) n++;
  }
  const out: Date[] = [];
  for (let i = 0; i < count; i++) out.push(addCycles(anchor, sub.cycle, n + i));
  return out;
}

const MONTHLY_FACTOR: Record<BillingCycle, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

/** Average monthly cost in the subscription's own currency. */
export function monthlyCost(sub: Pick<Subscription, 'amount' | 'cycle'>): number {
  return sub.amount * MONTHLY_FACTOR[sub.cycle];
}

export function monthlyCostIn(sub: Subscription, to: CurrencyCode, settings: Settings): number {
  return convert(monthlyCost(sub), sub.currency, to, settings.rates);
}

export function renewalLabel(date: Date, from: Date = new Date()): string {
  const d = daysBetween(from, date);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d < 7) return `In ${d} days`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() !== from.getFullYear() ? 'numeric' : undefined });
}

export interface Totals {
  monthly: number;
  yearly: number;
  byCategory: { category: string; monthly: number; count: number }[];
}

export function computeTotals(subs: Subscription[], settings: Settings): Totals {
  const map = new Map<string, { monthly: number; count: number }>();
  let monthly = 0;
  for (const s of subs) {
    const m = monthlyCostIn(s, settings.baseCurrency, settings);
    monthly += m;
    const e = map.get(s.category) ?? { monthly: 0, count: 0 };
    e.monthly += m;
    e.count += 1;
    map.set(s.category, e);
  }
  const byCategory = [...map.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.monthly - a.monthly);
  return { monthly, yearly: monthly * 12, byCategory };
}

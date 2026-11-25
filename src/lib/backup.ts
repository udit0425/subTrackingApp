import { isValidISODate, monthlyCostIn, nextRenewal, toISODate } from './billing';
import { CURRENCIES, DEFAULT_RATES, type CurrencyCode } from './currency';
import { normalizeTags } from './tags';
import {
  BILLING_CYCLES,
  CATEGORIES,
  type BillingCycle,
  type Category,
  type Settings,
  type Subscription,
} from './types';

export const BACKUP_FORMAT = 'sub-tracker-backup';
export const BACKUP_VERSION = 1;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  subscriptions: Subscription[];
  settings: Settings;
}

export interface ParsedBackup {
  subscriptions: Subscription[];
  settings: Settings | null;
  /** Entries that were present but invalid and therefore skipped. */
  skipped: number;
}

export class BackupError extends Error {}

export function createBackup(subscriptions: Subscription[], settings: Settings, now = new Date()): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    subscriptions,
    settings,
  };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isCurrency = (v: unknown): v is CurrencyCode => typeof v === 'string' && v in CURRENCIES;
const CYCLES = BILLING_CYCLES.map((c) => c.value) as string[];

function parseSubscription(raw: unknown): Subscription | null {
  if (!isObject(raw)) return null;
  const { id, name, amount, currency, cycle, startDate, category, reminderDaysBefore, notes, tags, createdAt } = raw;
  if (typeof id !== 'string' || !id) return null;
  if (typeof name !== 'string' || !name.trim()) return null;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return null;
  if (!isCurrency(currency)) return null;
  if (typeof cycle !== 'string' || !CYCLES.includes(cycle)) return null;
  if (typeof startDate !== 'string' || !isValidISODate(startDate)) return null;

  const reminder =
    typeof reminderDaysBefore === 'number' &&
    Number.isInteger(reminderDaysBefore) &&
    reminderDaysBefore >= 0 &&
    reminderDaysBefore <= 30
      ? reminderDaysBefore
      : null;

  const cleanTags = Array.isArray(tags)
    ? normalizeTags(tags.filter((t): t is string => typeof t === 'string'))
    : [];

  return {
    id,
    name: name.trim(),
    amount,
    currency,
    cycle: cycle as BillingCycle,
    startDate,
    category: (CATEGORIES as readonly string[]).includes(category as string) ? (category as Category) : 'Other',
    reminderDaysBefore: reminder,
    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : undefined,
    ...(cleanTags.length > 0 && { tags: cleanTags }),
    createdAt: typeof createdAt === 'number' && Number.isFinite(createdAt) ? createdAt : Date.now(),
  };
}

function parseSettings(raw: unknown): Settings | null {
  if (!isObject(raw) || !isCurrency(raw.baseCurrency)) return null;
  const rates = { ...DEFAULT_RATES };
  if (isObject(raw.rates)) {
    for (const [code, value] of Object.entries(raw.rates)) {
      if (isCurrency(code) && typeof value === 'number' && Number.isFinite(value) && value > 0) {
        rates[code] = value;
      }
    }
  }
  rates.USD = 1;
  return { baseCurrency: raw.baseCurrency, rates };
}

/** Parse and validate backup file contents. Throws BackupError with a user-facing message. */
export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('This file is not a SubTracker backup (it is not valid JSON).');
  }
  if (!isObject(data) || data.format !== BACKUP_FORMAT || !Array.isArray(data.subscriptions)) {
    throw new BackupError('This file is not a SubTracker backup.');
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new BackupError('This backup was made by a newer version of SubTracker. Update the app and try again.');
  }

  const seen = new Set<string>();
  const subscriptions: Subscription[] = [];
  let skipped = 0;
  for (const raw of data.subscriptions) {
    const sub = parseSubscription(raw);
    if (!sub || seen.has(sub.id)) {
      skipped++;
      continue;
    }
    seen.add(sub.id);
    subscriptions.push(sub);
  }
  return { subscriptions, settings: parseSettings(data.settings), skipped };
}

/** Imported entries replace existing ones with the same id; others are added. */
export function mergeSubscriptions(existing: Subscription[], incoming: Subscription[]): Subscription[] {
  const byId = new Map(incoming.map((s) => [s.id, s]));
  const merged = existing.map((s) => byId.get(s.id) ?? s);
  const existingIds = new Set(existing.map((s) => s.id));
  return [...merged, ...incoming.filter((s) => !existingIds.has(s.id))];
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(subscriptions: Subscription[], settings: Settings, now = new Date()): string {
  const base = settings.baseCurrency;
  const header = [
    'Name',
    'Category',
    'Tags',
    'Amount',
    'Currency',
    'Billing cycle',
    'First billing date',
    'Next renewal',
    `Monthly cost (${base})`,
    'Reminder (days before)',
    'Notes',
  ];
  const rows = subscriptions.map((s) => [
    s.name,
    s.category,
    (s.tags ?? []).join('; '),
    s.amount,
    s.currency,
    s.cycle,
    s.startDate,
    toISODate(nextRenewal(s, now)),
    monthlyCostIn(s, base, settings).toFixed(2),
    s.reminderDaysBefore ?? '',
    s.notes ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
  AED: { symbol: 'AED', name: 'UAE Dirham' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

/**
 * Approximate units per 1 USD. The app is offline-first, so these are
 * starting values the user can edit in Settings.
 */
export const DEFAULT_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 84,
  EUR: 0.93,
  GBP: 0.79,
  JPY: 150,
  CAD: 1.38,
  AUD: 1.52,
  SGD: 1.34,
  AED: 3.67,
};

export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<CurrencyCode, number>,
): number {
  if (from === to) return amount;
  const fromRate = rates[from] || DEFAULT_RATES[from];
  const toRate = rates[to] || DEFAULT_RATES[to];
  return (amount / fromRate) * toRate;
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const digits = currency === 'JPY' ? 0 : 2;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${CURRENCIES[currency].symbol}${amount.toFixed(digits)}`;
  }
}

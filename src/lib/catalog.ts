import type { CurrencyCode } from './currency';
import type { BillingCycle, Category } from './types';

/**
 * Popular services and their plans per country, used to pre-fill the add form.
 *
 * Prices are list prices gathered from public price trackers in November 2026, not official
 * price pages. They change often and vary with offers and taxes, so the form keeps every
 * field editable. To update: edit the numbers below and CATALOG_CHECKED.
 */
export const CATALOG_CHECKED = 'November 2026';

export type CountryCode = 'IN' | 'US' | 'GB';

export const COUNTRIES: Record<CountryCode, { name: string; currency: CurrencyCode }> = {
  IN: { name: 'India', currency: 'INR' },
  US: { name: 'United States', currency: 'USD' },
  GB: { name: 'United Kingdom', currency: 'GBP' },
};
export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];

export const isCountryCode = (v: unknown): v is CountryCode => typeof v === 'string' && v in COUNTRIES;

/** Best guess before the user picks a country: match the display currency, else India. */
export function defaultCountry(baseCurrency: CurrencyCode): CountryCode {
  return COUNTRY_CODES.find((c) => COUNTRIES[c].currency === baseCurrency) ?? 'IN';
}

export interface CatalogPlan {
  name: string;
  amount: number;
  cycle: BillingCycle;
}

export interface CatalogService {
  name: string;
  category: Category;
  plans: CatalogPlan[];
}

const mo = (name: string, amount: number): CatalogPlan => ({ name, amount, cycle: 'monthly' });
const yr = (name: string, amount: number): CatalogPlan => ({ name, amount, cycle: 'yearly' });

export const CATALOG: Record<CountryCode, CatalogService[]> = {
  IN: [
    {
      name: 'Netflix',
      category: 'Entertainment',
      plans: [mo('Mobile', 149), mo('Basic', 199), mo('Standard', 499), mo('Premium', 649)],
    },
    {
      name: 'Amazon Prime',
      category: 'Entertainment',
      plans: [mo('Monthly', 299), yr('Yearly', 1499), yr('Prime Lite', 799)],
    },
    {
      name: 'JioHotstar',
      category: 'Entertainment',
      plans: [
        mo('Mobile', 79),
        mo('Super', 149),
        mo('Premium', 299),
        yr('Mobile', 499),
        yr('Super', 1099),
        yr('Premium', 2199),
      ],
    },
    { name: 'YouTube Premium', category: 'Entertainment', plans: [mo('Individual', 149), mo('Student', 89)] },
    {
      name: 'YouTube Music',
      category: 'Music',
      plans: [mo('Individual', 119), mo('Family', 179), mo('Student', 59)],
    },
    { name: 'Spotify', category: 'Music', plans: [mo('Premium Standard', 139), mo('Premium Student', 69)] },
    {
      name: 'Apple Music',
      category: 'Music',
      plans: [mo('Individual', 139), mo('Family', 229), mo('Student', 69)],
    },
    { name: 'iCloud+', category: 'Cloud', plans: [mo('50 GB', 75), mo('200 GB', 219), mo('2 TB', 749)] },
    { name: 'Google One', category: 'Cloud', plans: [mo('100 GB', 130), mo('Google AI Plus', 399)] },
    { name: 'ChatGPT', category: 'Productivity', plans: [mo('Go', 399), mo('Plus', 1999)] },
  ],
  US: [
    {
      name: 'Netflix',
      category: 'Entertainment',
      plans: [mo('Standard with ads', 8.99), mo('Standard', 19.99), mo('Premium', 26.99)],
    },
    { name: 'Amazon Prime', category: 'Entertainment', plans: [mo('Monthly', 14.99), yr('Yearly', 139)] },
    { name: 'Disney+', category: 'Entertainment', plans: [mo('With ads', 12.49), mo('Premium', 21.49)] },
    { name: 'Hulu', category: 'Entertainment', plans: [mo('With ads', 12.49), mo('No ads', 21.49)] },
    {
      name: 'HBO Max',
      category: 'Entertainment',
      plans: [mo('Basic with ads', 10.99), mo('Standard', 18.49), mo('Premium', 22.99)],
    },
    { name: 'Apple TV', category: 'Entertainment', plans: [mo('Monthly', 14.99)] },
    { name: 'YouTube Premium', category: 'Entertainment', plans: [mo('Individual', 15.99)] },
    { name: 'Spotify', category: 'Music', plans: [mo('Premium Individual', 12.99)] },
    { name: 'ChatGPT', category: 'Productivity', plans: [mo('Plus', 20)] },
  ],
  GB: [
    {
      name: 'Netflix',
      category: 'Entertainment',
      plans: [mo('Standard with ads', 7.99), mo('Standard', 13.99), mo('Premium', 20.99)],
    },
    { name: 'Amazon Prime', category: 'Entertainment', plans: [mo('Monthly', 8.99), yr('Yearly', 95)] },
    {
      name: 'Disney+',
      category: 'Entertainment',
      plans: [mo('Standard with ads', 6.99), mo('Standard', 11.99), mo('Premium', 15.99)],
    },
    { name: 'YouTube Premium', category: 'Entertainment', plans: [mo('Individual', 12.99)] },
    {
      name: 'Spotify',
      category: 'Music',
      plans: [mo('Individual', 12.99), mo('Duo', 17.99), mo('Family', 21.99), mo('Student', 5.99)],
    },
  ],
};

/** Name saved on the subscription, e.g. "Netflix · Premium". Editable afterwards. */
export const planLabel = (service: CatalogService, plan: CatalogPlan) =>
  service.plans.length === 1 ? service.name : `${service.name} · ${plan.name}`;

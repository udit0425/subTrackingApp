import type { Subscription } from './types';

export const MAX_TAG_LENGTH = 24;
export const MAX_TAGS_PER_SUBSCRIPTION = 10;

/** Trim, collapse spaces, drop a leading '#', cap length. Returns '' for an unusable tag. */
export function cleanTag(raw: string): string {
  return raw.replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH).trim();
}

const key = (tag: string) => tag.toLocaleLowerCase();

/** Clean, drop empties and case-insensitive duplicates (first spelling wins), cap the count. */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = cleanTag(raw);
    if (!tag || seen.has(key(tag))) continue;
    seen.add(key(tag));
    out.push(tag);
    if (out.length === MAX_TAGS_PER_SUBSCRIPTION) break;
  }
  return out;
}

export const sameTag = (a: string, b: string) => key(a) === key(b);

/** Every tag in use, alphabetical, one spelling per tag. */
export function allTags(subscriptions: readonly Subscription[]): string[] {
  return normalizeTags(subscriptions.flatMap((s) => s.tags ?? [])).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
}

export const hasTag = (sub: Subscription, tag: string) => (sub.tags ?? []).some((t) => sameTag(t, tag));

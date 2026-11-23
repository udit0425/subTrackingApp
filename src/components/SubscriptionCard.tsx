import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { daysBetween, nextRenewal, renewalLabel } from '@/lib/billing';
import { formatMoney } from '@/lib/currency';
import { CATEGORY_COLORS, useTheme } from '@/lib/theme';
import { BILLING_CYCLES, type Subscription } from '@/lib/types';

const CYCLE_SUFFIX: Record<Subscription['cycle'], string> = {
  weekly: '/wk',
  monthly: '/mo',
  quarterly: '/qtr',
  yearly: '/yr',
};

/** "Today" -> "today", "In 3 days" -> "in 3 days", "12 Dec" -> "on 12 Dec". */
const relative = (label: string) => (/^(Today|Tomorrow|In )/.test(label) ? label.toLowerCase() : `on ${label}`);

export function SubscriptionCard({ sub }: { sub: Subscription }) {
  const t = useTheme();
  const renewal = nextRenewal(sub);
  const soon = daysBetween(new Date(), renewal) <= 3;
  const color = CATEGORY_COLORS[sub.category] ?? CATEGORY_COLORS.Other;
  const cycleLabel = BILLING_CYCLES.find((c) => c.value === sub.cycle)?.label;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/subscription/[id]', params: { id: sub.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${sub.name}, ${formatMoney(sub.amount, sub.currency)} ${cycleLabel}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{sub.name.trim().charAt(0).toUpperCase() || '?'}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {sub.name}
        </Text>
        <Text style={{ color: soon ? t.warn : t.muted, fontSize: 13 }}>
          Renews {relative(renewalLabel(renewal))}
          {' · '}
          {sub.category}
        </Text>
      </View>
      <Text style={[styles.amount, { color: t.text }]}>
        {formatMoney(sub.amount, sub.currency)}
        <Text style={{ color: t.muted, fontSize: 12, fontWeight: '400' }}>{CYCLE_SUFFIX[sub.cycle]}</Text>
      </Text>
      </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  middle: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  amount: { fontSize: 16, fontWeight: '600' },
});

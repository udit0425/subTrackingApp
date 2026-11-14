import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { computeTotals, daysBetween, nextRenewal, renewalLabel } from '@/lib/billing';
import { convert, formatMoney } from '@/lib/currency';
import { CATEGORY_COLORS, useTheme } from '@/lib/theme';
import { useStore } from '@/store/useStore';

const UPCOMING_DAYS = 30;

export default function DashboardScreen() {
  const t = useTheme();
  const subscriptions = useStore((s) => s.subscriptions);
  const settings = useStore((s) => s.settings);
  const base = settings.baseCurrency;

  const totals = useMemo(() => computeTotals(subscriptions, settings), [subscriptions, settings]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return subscriptions
      .map((sub) => ({ sub, date: nextRenewal(sub, now) }))
      .filter(({ date }) => daysBetween(now, date) <= UPCOMING_DAYS)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [subscriptions]);

  const upcomingTotal = upcoming.reduce(
    (sum, { sub }) => sum + convert(sub.amount, sub.currency, base, settings.rates),
    0,
  );
  const maxCategory = totals.byCategory[0]?.monthly || 1;

  const card = [styles.card, { backgroundColor: t.card, borderColor: t.border }];

  if (subscriptions.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.muted, textAlign: 'center' }}>
          Your spending breakdown appears here once you add a subscription.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <View style={styles.statRow}>
        <View style={[card, styles.stat]}>
          <Text style={[styles.statLabel, { color: t.muted }]}>Per month</Text>
          <Text style={[styles.statValue, { color: t.text }]} adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(totals.monthly, base)}
          </Text>
        </View>
        <View style={[card, styles.stat]}>
          <Text style={[styles.statLabel, { color: t.muted }]}>Per year</Text>
          <Text style={[styles.statValue, { color: t.text }]} adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(totals.yearly, base)}
          </Text>
        </View>
      </View>

      <View style={card}>
        <Text style={[styles.cardTitle, { color: t.text }]}>By category (monthly)</Text>
        {totals.byCategory.map((c) => {
          const pct = totals.monthly > 0 ? Math.round((c.monthly / totals.monthly) * 100) : 0;
          return (
            <View key={c.category} style={styles.catRow}>
              <View style={styles.catHeader}>
                <Text style={{ color: t.text, fontWeight: '500' }}>
                  {c.category} <Text style={{ color: t.muted }}>· {c.count}</Text>
                </Text>
                <Text style={{ color: t.text }}>
                  {formatMoney(c.monthly, base)} <Text style={{ color: t.muted }}>({pct}%)</Text>
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: t.track }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${(c.monthly / maxCategory) * 100}%`,
                      backgroundColor: CATEGORY_COLORS[c.category] ?? CATEGORY_COLORS.Other,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={card}>
        <View style={styles.catHeader}>
          <Text style={[styles.cardTitle, { color: t.text }]}>Next {UPCOMING_DAYS} days</Text>
          <Text style={{ color: t.text, fontWeight: '600' }}>{formatMoney(upcomingTotal, base)}</Text>
        </View>
        {upcoming.length === 0 ? (
          <Text style={{ color: t.muted }}>Nothing renews in the next {UPCOMING_DAYS} days.</Text>
        ) : (
          upcoming.map(({ sub, date }) => (
            <View key={sub.id} style={[styles.upRow, { borderTopColor: t.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: '500' }}>{sub.name}</Text>
                <Text style={{ color: t.muted, fontSize: 13 }}>{renewalLabel(date)}</Text>
              </View>
              <Text style={{ color: t.text }}>{formatMoney(sub.amount, sub.currency)}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center' }}>
        Totals are converted to {base} using the rates in Settings.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: { borderRadius: 16, padding: 16, gap: 12, borderWidth: StyleSheet.hairlineWidth },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 4 },
  statLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: '800' },
  catRow: { gap: 6 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  upRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});

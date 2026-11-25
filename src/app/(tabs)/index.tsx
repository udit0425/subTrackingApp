import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { InstallAppBanner } from '@/components/InstallAppBanner';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { TagFilter } from '@/components/TagFilter';
import { computeTotals, nextRenewal } from '@/lib/billing';
import { formatMoney } from '@/lib/currency';
import { allTags, hasTag, sameTag } from '@/lib/tags';
import { CONTENT_WIDTH, useTheme } from '@/lib/theme';
import { useStore } from '@/store/useStore';

const openNew = () => router.push('/subscription/new');

export default function SubscriptionsScreen() {
  const t = useTheme();
  const subscriptions = useStore((s) => s.subscriptions);
  const settings = useStore((s) => s.settings);

  const tags = useMemo(() => allTags(subscriptions), [subscriptions]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  // Falls back to "All" if the selected tag was removed from every subscription.
  const activeTag = selectedTag ? (tags.find((tag) => sameTag(tag, selectedTag)) ?? null) : null;

  const visible = useMemo(
    () =>
      subscriptions
        .filter((s) => !activeTag || hasTag(s, activeTag))
        .map((s) => ({ s, next: nextRenewal(s).getTime() }))
        .sort((a, b) => a.next - b.next)
        .map(({ s }) => s),
    [subscriptions, activeTag],
  );
  const totals = useMemo(() => computeTotals(visible, settings), [visible, settings]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        data={visible}
        keyExtractor={(s) => s.id}
        contentContainerStyle={[styles.list, CONTENT_WIDTH]}
        ListHeaderComponent={
          <>
            <InstallAppBanner />
            {tags.length > 0 && <TagFilter tags={tags} selected={activeTag} onSelect={setSelectedTag} />}
            {subscriptions.length > 0 && (
              <View style={[styles.summary, { backgroundColor: t.primary }]}>
                <Text style={[styles.summaryLabel, { color: t.onPrimary }]}>
                  Monthly spend{activeTag ? ` · ${activeTag}` : ''}
                </Text>
                <Text style={[styles.summaryValue, { color: t.onPrimary }]}>
                  {formatMoney(totals.monthly, settings.baseCurrency)}
                </Text>
                <Text style={{ color: t.onPrimary, opacity: 0.85 }}>
                  {visible.length} {activeTag ? 'tagged' : 'active'} · {formatMoney(totals.yearly, settings.baseCurrency)} / year
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => <SubscriptionCard sub={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: t.text }]}>No subscriptions yet</Text>
            <Text style={{ color: t.muted, textAlign: 'center' }}>
              Add the services you pay for to see what you spend and get reminded before each renewal.
            </Text>
            <Pressable
              onPress={openNew}
              accessibilityRole="button"
              style={({ pressed }) => [styles.emptyButton, { backgroundColor: t.primary, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={[styles.fabText, { color: t.onPrimary }]}>Add your first subscription</Text>
            </Pressable>
          </View>
        }
      />
      {subscriptions.length > 0 && (
        <Pressable
          onPress={openNew}
          accessibilityRole="button"
          accessibilityLabel="Add subscription"
          style={({ pressed }) => [styles.fab, { backgroundColor: t.primary, opacity: pressed ? 0.85 : 1 }]}>
          <Text style={[styles.fabText, { color: t.onPrimary }]}>+ Add subscription</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 100 },
  summary: { borderRadius: 18, padding: 18, marginBottom: 16, gap: 4 },
  summaryLabel: { fontSize: 13, fontWeight: '600', opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 32, fontWeight: '800' },
  empty: { alignItems: 'center', gap: 8, paddingTop: 80, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyButton: { marginTop: 16, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 999 },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 24,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { fontSize: 16, fontWeight: '700' },
});

import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CATALOG,
  CATALOG_CHECKED,
  COUNTRIES,
  COUNTRY_CODES,
  type CatalogPlan,
  type CatalogService,
  type CountryCode,
} from '@/lib/catalog';
import { formatMoney } from '@/lib/currency';
import { CONTENT_WIDTH, useTheme } from '@/lib/theme';
import { BILLING_CYCLES } from '@/lib/types';

export interface PickedPlan {
  country: CountryCode;
  service: CatalogService;
  plan: CatalogPlan;
}

interface Props {
  country: CountryCode;
  onCountryChange: (country: CountryCode) => void;
  /** Service picked earlier in this form, shown in the field with its plans below it. */
  picked: PickedPlan | null;
  onPick: (picked: PickedPlan) => void;
}

const cycleSuffix = (plan: CatalogPlan) =>
  plan.cycle === 'monthly' ? '/mo' : plan.cycle === 'yearly' ? '/yr' : ` ${plan.cycle}`;
const cycleLabel = (plan: CatalogPlan) => BILLING_CYCLES.find((c) => c.value === plan.cycle)?.label ?? plan.cycle;

/** "Choose a popular service" field: a searchable list per country, then every plan of the chosen service. */
export function ServicePicker({ country, onCountryChange, picked, onPick }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [service, setService] = useState<CatalogService | null>(null);

  const currency = COUNTRIES[country].currency;
  const services = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return CATALOG[country].filter((s) => !q || s.name.toLocaleLowerCase().includes(q));
  }, [country, query]);

  const show = () => {
    setQuery('');
    // Reopening after a pick goes straight to that service's plans.
    setService(picked && picked.country === country ? picked.service : null);
    setOpen(true);
  };
  const choose = (plan: CatalogPlan, from: CatalogService) => {
    onPick({ country, service: from, plan });
    setOpen(false);
  };

  const planRow = (plan: CatalogPlan, from: CatalogService, compact = false) => {
    const selected = picked?.service === from && picked.plan === plan;
    return (
      <Pressable
        key={`${plan.name}-${plan.cycle}`}
        onPress={() => choose(plan, from)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${from.name} ${plan.name}, ${formatMoney(plan.amount, currency)} ${cycleLabel(plan)}`}
        style={({ pressed }) => [
          compact ? styles.planChip : styles.planRow,
          {
            borderColor: selected ? t.primary : t.border,
            backgroundColor: selected ? t.primarySoft : t.card,
            opacity: pressed ? 0.7 : 1,
          },
        ]}>
        <Text style={{ color: selected ? t.primary : t.text, fontWeight: '600', flexShrink: 1 }}>{plan.name}</Text>
        <Text style={{ color: selected ? t.primary : t.text }}>
          {formatMoney(plan.amount, currency)}
          <Text style={{ color: t.muted, fontSize: 12 }}>{cycleSuffix(plan)}</Text>
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={show}
        accessibilityRole="button"
        accessibilityLabel={picked ? `Service: ${picked.service.name}. Change` : 'Choose a popular service'}
        style={[styles.field, { borderColor: t.border, backgroundColor: t.card }]}>
        <Text style={{ color: picked ? t.text : t.muted, fontSize: 16, flex: 1 }} numberOfLines={1}>
          {picked ? picked.service.name : `Choose a popular service (${COUNTRIES[country].name})`}
        </Text>
        <Text style={{ color: t.muted, fontSize: 16 }}>▾</Text>
      </Pressable>

      {picked && picked.service.plans.length > 1 && (
        <View style={styles.planChips}>{picked.service.plans.map((p) => planRow(p, picked.service, true))}</View>
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View
            style={[
              styles.sheet,
              CONTENT_WIDTH,
              { backgroundColor: t.bg, paddingBottom: Math.max(insets.bottom, 16) },
            ]}>
            <View style={styles.sheetHeader}>
              {service ? (
                <Pressable onPress={() => setService(null)} accessibilityRole="button" hitSlop={8}>
                  <Text style={{ color: t.primary, fontWeight: '600', fontSize: 16 }}>‹ Services</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Text style={[styles.sheetTitle, { color: t.text }]} numberOfLines={1}>
                {service ? service.name : 'Popular services'}
              </Text>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" hitSlop={8}>
                <Text style={{ color: t.primary, fontWeight: '600', fontSize: 16 }}>Close</Text>
              </Pressable>
            </View>

            {service ? (
              <FlatList
                data={service.plans}
                keyExtractor={(p) => `${p.name}-${p.cycle}`}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                  <Text style={{ color: t.muted, marginBottom: 4 }}>Which plan do you have?</Text>
                }
                renderItem={({ item }) => planRow(item, service)}
                ListFooterComponent={<PriceNote />}
              />
            ) : (
              <>
                <View style={styles.countryRow}>
                  {COUNTRY_CODES.map((c) => {
                    const active = c === country;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => onCountryChange(c)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[
                          styles.countryChip,
                          {
                            borderColor: active ? t.primary : t.border,
                            backgroundColor: active ? t.primarySoft : t.card,
                          },
                        ]}>
                        <Text style={{ color: active ? t.primary : t.text, fontWeight: active ? '600' : '400' }}>
                          {COUNTRIES[c].name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search services"
                  placeholderTextColor={t.muted}
                  autoCorrect={false}
                  style={[styles.search, { borderColor: t.border, backgroundColor: t.card, color: t.text }]}
                />
                <FlatList
                  data={services}
                  keyExtractor={(s) => s.name}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.list}
                  renderItem={({ item }) => {
                    const cheapest = Math.min(...item.plans.map((p) => p.amount));
                    return (
                      <Pressable
                        onPress={() => setService(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.name}, ${item.plans.length} plans`}
                        style={({ pressed }) => [
                          styles.serviceRow,
                          { borderColor: t.border, backgroundColor: t.card, opacity: pressed ? 0.7 : 1 },
                        ]}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: t.text, fontWeight: '600', fontSize: 16 }}>{item.name}</Text>
                          <Text style={{ color: t.muted, fontSize: 13 }}>
                            {item.plans.length === 1 ? '1 plan' : `${item.plans.length} plans`} · from{' '}
                            {formatMoney(cheapest, currency)}
                          </Text>
                        </View>
                        <Text style={{ color: t.muted, fontSize: 18 }}>›</Text>
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={
                    <Text style={{ color: t.muted, textAlign: 'center', marginTop: 24 }}>
                      Not in the list. Close this and type the name and price yourself.
                    </Text>
                  }
                  ListFooterComponent={<PriceNote />}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PriceNote() {
  const t = useTheme();
  return (
    <Text style={{ color: t.muted, fontSize: 12, marginTop: 12 }}>
      Usual list prices as of {CATALOG_CHECKED}. Offers and taxes can change what you pay, so check your bill and edit
      the price if it differs.
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  planChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planChip: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'baseline',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  countryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  countryChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  list: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});

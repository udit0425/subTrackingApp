import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ChipGroup } from '@/components/ChipGroup';
import { CURRENCIES, CURRENCY_CODES, type CurrencyCode } from '@/lib/currency';
import { sendTestNotification } from '@/lib/reminders';
import { useTheme } from '@/lib/theme';
import { useStore } from '@/store/useStore';

const currencyOptions = CURRENCY_CODES.map((c) => ({ value: c, label: `${CURRENCIES[c].symbol} ${c}` }));

function RateInput({ code }: { code: CurrencyCode }) {
  const t = useTheme();
  const rate = useStore((s) => s.settings.rates[code]);
  const setRate = useStore((s) => s.setRate);
  const [text, setText] = useState(String(rate));
  const [lastRate, setLastRate] = useState(rate);
  if (rate !== lastRate) {
    // Rates were reset elsewhere.
    setLastRate(rate);
    setText(String(rate));
  }

  return (
    <View style={[styles.rateRow, { borderTopColor: t.border }]}>
      <Text style={{ color: t.text, flex: 1 }}>
        {code} <Text style={{ color: t.muted }}>{CURRENCIES[code].name}</Text>
      </Text>
      <TextInput
        value={text}
        editable={code !== 'USD'}
        keyboardType="decimal-pad"
        onChangeText={setText}
        onEndEditing={() => {
          const n = Number(text.replace(',', '.'));
          if (Number.isFinite(n) && n > 0) setRate(code, n);
          else setText(String(rate));
        }}
        style={[
          styles.rateInput,
          { color: code === 'USD' ? t.muted : t.text, borderColor: t.border, backgroundColor: t.bg },
        ]}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const t = useTheme();
  const baseCurrency = useStore((s) => s.settings.baseCurrency);
  const setBaseCurrency = useStore((s) => s.setBaseCurrency);
  const resetRates = useStore((s) => s.resetRates);

  const card = [styles.card, { backgroundColor: t.card, borderColor: t.border }];

  const testReminder = async () => {
    const ok = await sendTestNotification();
    if (!ok) {
      const msg =
        Platform.OS === 'web'
          ? 'Reminders are only available on iOS and Android.'
          : 'Notifications are turned off. Enable them for SubTracker in your device settings.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Reminders unavailable', msg);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <View style={card}>
        <Text style={[styles.title, { color: t.text }]}>Display currency</Text>
        <Text style={{ color: t.muted, fontSize: 13 }}>Totals and the dashboard are shown in this currency.</Text>
        <ChipGroup options={currencyOptions} value={baseCurrency} onChange={setBaseCurrency} />
      </View>

      <View style={card}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: t.text }]}>Exchange rates</Text>
          <Pressable onPress={resetRates} accessibilityRole="button">
            <Text style={{ color: t.primary, fontWeight: '600' }}>Reset</Text>
          </Pressable>
        </View>
        <Text style={{ color: t.muted, fontSize: 13 }}>
          Units per 1 USD. Defaults are approximate; edit them to match your bank&apos;s rate.
        </Text>
        {CURRENCY_CODES.map((code) => (
          <RateInput key={code} code={code} />
        ))}
      </View>

      <View style={card}>
        <Text style={[styles.title, { color: t.text }]}>Reminders</Text>
        <Text style={{ color: t.muted, fontSize: 13 }}>
          Reminders arrive at 9:00 AM on the day you choose for each subscription.
        </Text>
        <Pressable
          onPress={testReminder}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { borderColor: t.primary, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={{ color: t.primary, fontWeight: '600' }}>Send a test reminder</Text>
        </Pressable>
      </View>

      <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center' }}>
        All data is stored on this device only.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 16, gap: 10, borderWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 16, fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  rateInput: { width: 96, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, textAlign: 'right' },
  button: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});

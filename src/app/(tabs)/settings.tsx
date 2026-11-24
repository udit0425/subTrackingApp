import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ChipGroup } from '@/components/ChipGroup';
import { toISODate } from '@/lib/billing';
import { BackupError, createBackup, parseBackup, toCSV, type ParsedBackup } from '@/lib/backup';
import { accountsConfigured } from '@/lib/api';
import { CURRENCIES, CURRENCY_CODES, type CurrencyCode } from '@/lib/currency';
import { exportTextFile, pickTextFile } from '@/lib/fileTransfer';
import { sendTestNotification } from '@/lib/reminders';
import { CONTENT_WIDTH, useTheme } from '@/lib/theme';
import { useAuth } from '@/store/useAuth';
import { useStore } from '@/store/useStore';

const currencyOptions = CURRENCY_CODES.map((c) => ({ value: c, label: `${CURRENCIES[c].symbol} ${c}` }));

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

/** Ask how to apply an import. Web has no multi-button dialog, so it only offers merge. */
function chooseImportMode(parsed: ParsedBackup): Promise<'merge' | 'replace' | null> {
  const count = parsed.subscriptions.length;
  const summary =
    `Found ${count} subscription${count === 1 ? '' : 's'}` +
    (parsed.skipped ? ` (${parsed.skipped} invalid entr${parsed.skipped === 1 ? 'y' : 'ies'} skipped)` : '') +
    '.';
  if (Platform.OS === 'web') {
    return Promise.resolve(
      window.confirm(`${summary}\n\nMerge them into your current list? Matching subscriptions will be updated.`)
        ? 'merge'
        : null,
    );
  }
  return new Promise((resolve) =>
    Alert.alert(
      'Import backup',
      `${summary}\n\nMerge keeps your current list and updates matching subscriptions. Replace deletes your current data and restores the backup, including currency settings.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Merge', onPress: () => resolve('merge') },
        { text: 'Replace all', style: 'destructive', onPress: () => resolve('replace') },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    ),
  );
}

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
  const importData = useStore((s) => s.importData);
  const subscriptionCount = useStore((s) => s.subscriptions.length);
  const [busy, setBusy] = useState(false);
  const authStatus = useAuth((s) => s.status);
  const accountName = useAuth((s) => s.name);
  const signOut = useAuth((s) => s.signOut);

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } catch (e) {
      notify('Something went wrong', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const exportBackup = () =>
    run(async () => {
      const { subscriptions, settings } = useStore.getState();
      await exportTextFile({
        filename: `subtracker-backup-${toISODate(new Date())}.json`,
        content: JSON.stringify(createBackup(subscriptions, settings), null, 2),
        mimeType: 'application/json',
        uti: 'public.json',
      });
    });

  const exportCSV = () =>
    run(async () => {
      const { subscriptions, settings } = useStore.getState();
      await exportTextFile({
        filename: `subtracker-${toISODate(new Date())}.csv`,
        content: toCSV(subscriptions, settings),
        mimeType: 'text/csv',
        uti: 'public.comma-separated-values-text',
      });
    });

  const importBackup = () =>
    run(async () => {
      const text = await pickTextFile();
      if (text == null) return;
      let parsed: ParsedBackup;
      try {
        parsed = parseBackup(text);
      } catch (e) {
        if (e instanceof BackupError) return notify('Could not import', e.message);
        throw e;
      }
      if (parsed.subscriptions.length === 0) {
        return notify('Nothing to import', 'This backup does not contain any valid subscriptions.');
      }
      const mode = await chooseImportMode(parsed);
      if (!mode) return;
      importData(parsed.subscriptions, parsed.settings, mode);
      notify('Import complete', `${parsed.subscriptions.length} subscriptions ${mode === 'merge' ? 'merged' : 'restored'}.`);
    });

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
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[styles.content, CONTENT_WIDTH]}>
      {accountsConfigured && Platform.OS !== 'web' && (
        <View style={card}>
          <Text style={[styles.title, { color: t.text }]}>Account</Text>
          {authStatus === 'signedIn' ? (
            <>
              <Text style={{ color: t.muted, fontSize: 13 }}>
                Signed in{accountName ? ` as ${accountName}` : ''}. Your subscriptions are not synced yet, so they still
                live on this phone.
              </Text>
              <Pressable
                onPress={() => run(signOut)}
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, { borderColor: t.danger, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={{ color: t.danger, fontWeight: '600' }}>Sign out</Text>
              </Pressable>
            </>
          ) : authStatus === 'signedOut' ? (
            <>
              <Text style={{ color: t.muted, fontSize: 13 }}>
                Create an account or sign in with your email. Syncing is not available yet, so your data stays on
                this phone.
              </Text>
              <Pressable
                onPress={() => router.push('/auth/login')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, { borderColor: t.primary, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={{ color: t.primary, fontWeight: '600' }}>Sign in</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/auth/signup')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, { borderColor: t.primary, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={{ color: t.primary, fontWeight: '600' }}>Create account</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      )}

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

      {Platform.OS !== 'web' && (
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
      )}

      <View style={card}>
        <Text style={[styles.title, { color: t.text }]}>Your data</Text>
        <Text style={{ color: t.muted, fontSize: 13 }}>
          Everything is stored on this device only. Export a backup regularly and keep it in Files, iCloud
          Drive or Google Drive so you can restore it on a new phone.
        </Text>
        <Pressable
          onPress={exportBackup}
          disabled={busy || subscriptionCount === 0}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { borderColor: t.primary, opacity: busy || subscriptionCount === 0 ? 0.4 : pressed ? 0.7 : 1 },
          ]}>
          <Text style={{ color: t.primary, fontWeight: '600' }}>Export backup (.json)</Text>
        </Pressable>
        <Pressable
          onPress={importBackup}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { borderColor: t.primary, opacity: busy ? 0.4 : pressed ? 0.7 : 1 }]}>
          <Text style={{ color: t.primary, fontWeight: '600' }}>Import backup</Text>
        </Pressable>
        <Pressable
          onPress={exportCSV}
          disabled={busy || subscriptionCount === 0}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { borderColor: t.border, opacity: busy || subscriptionCount === 0 ? 0.4 : pressed ? 0.7 : 1 },
          ]}>
          <Text style={{ color: t.text, fontWeight: '600' }}>Export spreadsheet (.csv)</Text>
        </Pressable>
      </View>

      <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center' }}>SubTracker v{Constants.expoConfig?.version ?? '?'}</Text>
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

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { nextRenewal, toISODate } from '@/lib/billing';
import { CURRENCY_CODES, CURRENCIES, type CurrencyCode } from '@/lib/currency';
import { ensurePermission } from '@/lib/reminders';
import { normalizeTags } from '@/lib/tags';
import { CONTENT_WIDTH, useTheme } from '@/lib/theme';
import {
  BILLING_CYCLES,
  CATEGORIES,
  REMINDER_OPTIONS,
  type BillingCycle,
  type Category,
  type SubscriptionInput,
} from '@/lib/types';

import { ChipGroup } from './ChipGroup';
import { DateField } from './DateField';
import { TagPicker, addTypedTag } from './TagPicker';

interface Props {
  initial?: SubscriptionInput;
  defaultCurrency: CurrencyCode;
  /** Tags used on any subscription, offered as suggestions. */
  knownTags: string[];
  submitLabel: string;
  onSubmit: (input: SubscriptionInput) => void;
  onDelete?: () => void;
}

const currencyOptions = CURRENCY_CODES.map((c) => ({ value: c, label: `${CURRENCIES[c].symbol} ${c}` }));
const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: c }));

export function SubscriptionForm({ initial, defaultCurrency, knownTags, submitLabel, onSubmit, onDelete }: Props) {
  const t = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? defaultCurrency);
  const [cycle, setCycle] = useState<BillingCycle>(initial?.cycle ?? 'monthly');
  const [startDate, setStartDate] = useState(initial?.startDate ?? toISODate(new Date()));
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Entertainment');
  const [reminder, setReminder] = useState<number | null>(initial ? initial.reminderDaysBefore : 1);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number(amount.replace(',', '.'));

  const submit = async () => {
    if (!name.trim()) return setError('Enter a name.');
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return setError('Enter a price greater than 0.');
    }
    setError(null);
    // Include a tag that was typed but not added with the Add button.
    const finalTags = normalizeTags(addTypedTag(tags, tagDraft, knownTags));
    if (reminder != null) await ensurePermission();
    onSubmit({
      name: name.trim(),
      amount: Math.round(parsedAmount * 100) / 100,
      currency,
      cycle,
      startDate,
      category,
      reminderDaysBefore: reminder,
      notes: notes.trim() || undefined,
      tags: finalTags.length > 0 ? finalTags : undefined,
    });
  };

  const inputStyle = [styles.input, { borderColor: t.border, backgroundColor: t.card, color: t.text }];
  const label = (s: string) => <Text style={[styles.label, { color: t.muted }]}>{s}</Text>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: t.bg }}
        contentContainerStyle={[styles.content, CONTENT_WIDTH]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          {label('Name')}
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Netflix, Spotify, iCloud…"
            placeholderTextColor={t.muted}
            style={inputStyle}
            autoFocus={!initial}
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          {label('Price')}
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={t.muted}
            keyboardType="decimal-pad"
            style={inputStyle}
          />
          <ChipGroup options={currencyOptions} value={currency} onChange={setCurrency} />
        </View>

        <View style={styles.field}>
          {label('Billing cycle')}
          <ChipGroup options={BILLING_CYCLES} value={cycle} onChange={setCycle} />
        </View>

        <View style={styles.field}>
          {label('First billing date')}
          <DateField value={startDate} onChange={setStartDate} />
          <Text style={{ color: t.muted, fontSize: 13 }}>
            Next renewal: {nextRenewal({ startDate, cycle }).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </Text>
        </View>

        <View style={styles.field}>
          {label('Category')}
          <ChipGroup options={categoryOptions} value={category} onChange={setCategory} />
        </View>

        <View style={styles.field}>
          {label('Tags (optional)')}
          <TagPicker
            value={tags}
            onChange={setTags}
            suggestions={knownTags}
            draft={tagDraft}
            onDraftChange={setTagDraft}
          />
        </View>

        {Platform.OS !== 'web' && (
          <View style={styles.field}>
            {label('Remind me before renewal')}
            <ChipGroup options={REMINDER_OPTIONS} value={reminder} onChange={setReminder} />
          </View>
        )}

        <View style={styles.field}>
          {label('Notes (optional)')}
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Shared plan, card used, cancel link…"
            placeholderTextColor={t.muted}
            multiline
            style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]}
          />
        </View>

        {error && <Text style={{ color: t.danger }}>{error}</Text>}

        <Pressable
          onPress={submit}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: t.primary, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[styles.buttonText, { color: t.onPrimary }]}>{submitLabel}</Text>
        </Pressable>

        {onDelete && (
          <Pressable onPress={onDelete} accessibilityRole="button" style={styles.deleteButton}>
            <Text style={{ color: t.danger, fontWeight: '600', fontSize: 16 }}>Delete subscription</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20, paddingBottom: 48 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  button: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  deleteButton: { alignItems: 'center', paddingVertical: 12 },
});

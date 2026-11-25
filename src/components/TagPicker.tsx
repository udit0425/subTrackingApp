import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MAX_TAG_LENGTH, MAX_TAGS_PER_SUBSCRIPTION, cleanTag, sameTag } from '@/lib/tags';
import { useTheme } from '@/lib/theme';

interface Props {
  /** Tags on this subscription. */
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags already used on any subscription, offered for one-tap reuse. */
  suggestions: string[];
  /** Text typed but not added yet. Owned by the form so Save can include it. */
  draft: string;
  onDraftChange: (text: string) => void;
}

/** Adds a typed tag to a list, reusing an existing spelling ("work" -> "Work"). */
export function addTypedTag(value: string[], typed: string, suggestions: string[]): string[] {
  const tag = cleanTag(typed);
  if (!tag || value.length >= MAX_TAGS_PER_SUBSCRIPTION) return value;
  const existing = suggestions.find((s) => sameTag(s, tag)) ?? tag;
  return value.some((v) => sameTag(v, existing)) ? value : [...value, existing];
}

export function TagPicker({ value, onChange, suggestions, draft, onDraftChange }: Props) {
  const t = useTheme();

  const isSelected = (tag: string) => value.some((v) => sameTag(v, tag));
  const full = value.length >= MAX_TAGS_PER_SUBSCRIPTION;

  const toggle = (tag: string) => {
    if (isSelected(tag)) onChange(value.filter((v) => !sameTag(v, tag)));
    else if (!full) onChange([...value, tag]);
  };

  const addDraft = () => {
    onChange(addTypedTag(value, draft, suggestions));
    onDraftChange('');
  };

  // Selected tags first (including new ones not saved anywhere yet), then the rest.
  const chips = [...value, ...suggestions.filter((s) => !isSelected(s))];

  return (
    <View style={styles.wrap}>
      {chips.length > 0 && (
        <View style={styles.chips}>
          {chips.map((tag) => {
            const selected = isSelected(tag);
            return (
              <Pressable
                key={tag.toLocaleLowerCase()}
                onPress={() => toggle(tag)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Tag ${tag}`}
                accessibilityHint={selected ? 'Removes this tag' : 'Adds this tag'}
                style={[
                  styles.chip,
                  {
                    borderColor: selected ? t.primary : t.border,
                    backgroundColor: selected ? t.primarySoft : t.card,
                  },
                ]}>
                <Text style={{ color: selected ? t.primary : t.text, fontWeight: selected ? '600' : '400' }}>
                  {selected ? '✓ ' : '+ '}
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          onSubmitEditing={addDraft}
          placeholder={full ? `Up to ${MAX_TAGS_PER_SUBSCRIPTION} tags` : 'New tag, e.g. Work or Family plan'}
          placeholderTextColor={t.muted}
          editable={!full}
          maxLength={MAX_TAG_LENGTH + 1}
          returnKeyType="done"
          submitBehavior="submit"
          autoCapitalize="words"
          style={[styles.input, { borderColor: t.border, backgroundColor: t.card, color: t.text }]}
        />
        <Pressable
          onPress={addDraft}
          disabled={!cleanTag(draft) || full}
          accessibilityRole="button"
          accessibilityLabel="Add tag"
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: t.primary, opacity: !cleanTag(draft) || full ? 0.4 : pressed ? 0.8 : 1 },
          ]}>
          <Text style={{ color: t.onPrimary, fontWeight: '700' }}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  addRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  addButton: { paddingHorizontal: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

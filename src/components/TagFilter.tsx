import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme';

interface Props {
  tags: string[];
  /** null = show all. */
  selected: string | null;
  onSelect: (tag: string | null) => void;
}

/** One-tap filter row above the subscriptions list. */
export function TagFilter({ tags, selected, onSelect }: Props) {
  const t = useTheme();
  const options: { tag: string | null; label: string }[] = [
    { tag: null, label: 'All' },
    ...tags.map((tag) => ({ tag, label: tag })),
  ];

  const chips = options.map(({ tag, label }) => {
    const active = tag === selected;
    return (
      <Pressable
        key={tag ?? '__all'}
        onPress={() => onSelect(active && tag ? null : tag)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={tag ? `Show only ${tag}` : 'Show all subscriptions'}
        style={[
          styles.chip,
          { borderColor: active ? t.primary : t.border, backgroundColor: active ? t.primary : t.card },
        ]}>
        <Text style={{ color: active ? t.onPrimary : t.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
      </Pressable>
    );
  });

  // Mouse users can't swipe a hidden-scrollbar row, so wrap on web.
  if (Platform.OS === 'web') return <View style={[styles.row, styles.wrap, styles.container]}>{chips}</View>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.row}>
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  row: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
});

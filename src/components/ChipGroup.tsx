import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme';

interface Props<T> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function ChipGroup<T extends string | number | null>({ options, value, onChange }: Props<T>) {
  const t = useTheme();
  const chips = options.map((o) => {
    const selected = o.value === value;
    return (
      <Pressable
        key={String(o.value)}
        onPress={() => onChange(o.value)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[
          styles.chip,
          { borderColor: selected ? t.primary : t.border, backgroundColor: selected ? t.primarySoft : t.card },
        ]}>
        <Text style={{ color: selected ? t.primary : t.text, fontWeight: selected ? '600' : '400' }}>
          {o.label}
        </Text>
      </Pressable>
    );
  });

  // Mouse users can't swipe a hidden-scrollbar row, so wrap on web.
  if (Platform.OS === 'web') return <View style={[styles.row, styles.wrap]}>{chips}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
});

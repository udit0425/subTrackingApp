import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { isValidISODate, parseISODate, toISODate } from '@/lib/billing';
import { useTheme } from '@/lib/theme';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}

export function DateField({ value, onChange }: Props) {
  const t = useTheme();

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.iosRow}>
        <DateTimePicker
          value={parseISODate(value)}
          mode="date"
          display="compact"
          onValueChange={(_, date) => onChange(toISODate(date))}
        />
      </View>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          DateTimePickerAndroid.open({
            value: parseISODate(value),
            mode: 'date',
            onValueChange: (_, date) => onChange(toISODate(date)),
          })
        }
        style={[styles.box, { borderColor: t.border, backgroundColor: t.card }]}>
        <Text style={{ color: t.text, fontSize: 16 }}>
          {parseISODate(value).toLocaleDateString(undefined, { dateStyle: 'medium' })}
        </Text>
      </Pressable>
    );
  }

  // Web: the browser's own date picker.
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => {
        if (isValidISODate(e.target.value)) onChange(e.target.value);
      }}
      style={{
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        padding: '11px 12px',
        fontSize: 16,
        fontFamily: 'inherit',
        backgroundColor: t.card,
        color: t.text,
        colorScheme: t.isDark ? 'dark' : 'light',
      }}
    />
  );
}

const styles = StyleSheet.create({
  iosRow: { alignItems: 'flex-start' },
  box: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
});

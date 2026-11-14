import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { isValidISODate, parseISODate, toISODate } from '@/lib/billing';
import { useTheme } from '@/lib/theme';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}

export function DateField({ value, onChange }: Props) {
  const t = useTheme();
  const [text, setText] = useState(value);

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

  // Web fallback: plain text input.
  return (
    <TextInput
      value={text}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={t.muted}
      onChangeText={(s) => {
        setText(s);
        if (isValidISODate(s)) onChange(s);
      }}
      style={[styles.box, { borderColor: t.border, backgroundColor: t.card, color: t.text, fontSize: 16 }]}
    />
  );
}

const styles = StyleSheet.create({
  iosRow: { alignItems: 'flex-start' },
  box: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
});

import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ANDROID_APK_URL } from '@/lib/links';
import { useTheme } from '@/lib/theme';

/** Web only: offers the Android app, which keeps data on the phone and sends renewal reminders. */
export function AndroidDownloadBanner() {
  const t = useTheme();
  if (Platform.OS !== 'web') return null;

  return (
    <View style={[styles.banner, { backgroundColor: t.primarySoft, borderColor: t.border }]}>
      <View style={styles.text}>
        <Text style={[styles.title, { color: t.text }]}>Get the Android app</Text>
        <Text style={{ color: t.muted, fontSize: 13 }}>
          Your data stays on your phone, and you get reminders before each renewal.
        </Text>
      </View>
      <Pressable
        onPress={() => Linking.openURL(ANDROID_APK_URL)}
        accessibilityRole="link"
        accessibilityLabel="Download the Android app (APK)"
        style={({ pressed }) => [styles.button, { backgroundColor: t.primary, opacity: pressed ? 0.85 : 1 }]}>
        <Text style={[styles.buttonText, { color: t.onPrimary }]}>Download APK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  text: { flexGrow: 1, flexBasis: 220, gap: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  buttonText: { fontSize: 14, fontWeight: '700' },
});

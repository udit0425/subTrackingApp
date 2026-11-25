import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ANDROID_APK_URL } from '@/lib/links';
import { useTheme } from '@/lib/theme';

type Device = 'ios' | 'other';

/** Web only. null = already running as an installed Home Screen app, so there is nothing to offer. */
function detectDevice(): Device | null {
  if (typeof window === 'undefined') return 'other';
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return null;
  const ua = window.navigator.userAgent;
  // iPadOS reports itself as a Mac, so also check for touch.
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1);
  return isIOS ? 'ios' : 'other';
}

/**
 * Web only. iPhone/iPad: explains Add to Home Screen. Everyone else: offers the Android APK,
 * which keeps data on the phone and sends renewal reminders.
 */
export function InstallAppBanner() {
  const t = useTheme();
  if (Platform.OS !== 'web') return null;
  const device = detectDevice();
  if (!device) return null;

  return (
    <View style={[styles.banner, { backgroundColor: t.primarySoft, borderColor: t.border }]}>
      {device === 'ios' ? (
        <View style={styles.text}>
          <Text style={[styles.title, { color: t.text }]}>Add SubTracker to your Home Screen</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>
            In Safari, tap the Share button, then “Add to Home Screen”. It opens like an app, and your data stays on
            this iPhone.
          </Text>
        </View>
      ) : (
        <>
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
        </>
      )}
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

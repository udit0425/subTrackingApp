import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { setupNotifications, syncReminders } from '@/lib/reminders';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/store/useAuth';
import { useStore } from '@/store/useStore';

function CancelButton({ color }: { color: string }) {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityRole="button"
      hitSlop={12}
      style={{ paddingHorizontal: 4 }}>
      <Text style={{ color, fontSize: 17 }}>Cancel</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  const t = useTheme();
  const hydrated = useStore((s) => s.hydrated);
  const subscriptions = useStore((s) => s.subscriptions);

  useEffect(() => {
    useAuth.getState().hydrate().catch((e) => console.warn('Session check failed', e));
  }, []);

  useEffect(() => {
    setupNotifications().catch((e) => console.warn('Notification setup failed', e));
  }, []);

  // Keep scheduled reminders in step with the data (also rolls them forward on each launch).
  useEffect(() => {
    if (hydrated) syncReminders(subscriptions);
  }, [hydrated, subscriptions]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.card },
          headerTintColor: t.primary,
          headerTitleStyle: { color: t.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="subscription/new"
          options={{
            presentation: 'modal',
            title: 'New subscription',
            headerLeft: () => <CancelButton color={t.primary} />,
          }}
        />
        <Stack.Screen
          name="subscription/[id]"
          options={{
            presentation: 'modal',
            title: 'Edit subscription',
            headerLeft: () => <CancelButton color={t.primary} />,
          }}
        />
        <Stack.Screen
          name="auth/login"
          options={{
            presentation: 'modal',
            title: 'Sign in',
            headerLeft: () => <CancelButton color={t.primary} />,
          }}
        />
        <Stack.Screen
          name="auth/signup"
          options={{
            presentation: 'modal',
            title: 'Create account',
            headerLeft: () => <CancelButton color={t.primary} />,
          }}
        />
      </Stack>
    </>
  );
}

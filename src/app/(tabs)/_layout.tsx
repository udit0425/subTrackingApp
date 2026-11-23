import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, Text, type ColorValue } from 'react-native';

import { useTheme } from '@/lib/theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        headerStyle: { backgroundColor: t.card },
        headerTitleStyle: { color: t.text },
        sceneStyle: { backgroundColor: t.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Subscriptions',
          tabBarIcon: icon('☰'),
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/subscription/new')}
              accessibilityRole="button"
              accessibilityLabel="Add subscription"
              hitSlop={12}
              style={{ paddingHorizontal: 16 }}>
              <Text style={{ color: t.primary, fontSize: 17, fontWeight: '600' }}>+ Add</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: icon('◔') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙︎') }} />
    </Tabs>
  );
}

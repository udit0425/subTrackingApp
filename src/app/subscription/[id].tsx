import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, Text, View } from 'react-native';

import { SubscriptionForm } from '@/components/SubscriptionForm';
import { useTheme } from '@/lib/theme';
import { useStore } from '@/store/useStore';

function confirmDelete(name: string, onConfirm: () => void) {
  const message = `Delete ${name}? Its reminders will be cancelled.`;
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Delete subscription', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function EditSubscriptionScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sub = useStore((s) => s.subscriptions.find((x) => x.id === id));
  const baseCurrency = useStore((s) => s.settings.baseCurrency);
  const updateSubscription = useStore((s) => s.updateSubscription);
  const removeSubscription = useStore((s) => s.removeSubscription);

  if (!sub) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <Text style={{ color: t.muted }}>This subscription no longer exists.</Text>
      </View>
    );
  }

  const { id: _id, createdAt: _createdAt, ...initial } = sub;

  return (
    <SubscriptionForm
      initial={initial}
      defaultCurrency={baseCurrency}
      submitLabel="Save changes"
      onSubmit={(input) => {
        updateSubscription(sub.id, input);
        router.back();
      }}
      onDelete={() =>
        confirmDelete(sub.name, () => {
          router.back();
          removeSubscription(sub.id);
        })
      }
    />
  );
}

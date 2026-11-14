import { router } from 'expo-router';

import { SubscriptionForm } from '@/components/SubscriptionForm';
import { useStore } from '@/store/useStore';

export default function NewSubscriptionScreen() {
  const addSubscription = useStore((s) => s.addSubscription);
  const baseCurrency = useStore((s) => s.settings.baseCurrency);

  return (
    <SubscriptionForm
      defaultCurrency={baseCurrency}
      submitLabel="Add subscription"
      onSubmit={(input) => {
        addSubscription(input);
        router.back();
      }}
    />
  );
}

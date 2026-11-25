import { router } from 'expo-router';
import { useMemo } from 'react';

import { SubscriptionForm } from '@/components/SubscriptionForm';
import { allTags } from '@/lib/tags';
import { useStore } from '@/store/useStore';

export default function NewSubscriptionScreen() {
  const addSubscription = useStore((s) => s.addSubscription);
  const baseCurrency = useStore((s) => s.settings.baseCurrency);
  const subscriptions = useStore((s) => s.subscriptions);
  const knownTags = useMemo(() => allTags(subscriptions), [subscriptions]);

  return (
    <SubscriptionForm
      defaultCurrency={baseCurrency}
      knownTags={knownTags}
      submitLabel="Add subscription"
      onSubmit={(input) => {
        addSubscription(input);
        router.back();
      }}
    />
  );
}

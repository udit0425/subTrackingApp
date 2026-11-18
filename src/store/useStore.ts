import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mergeSubscriptions } from '@/lib/backup';
import { DEFAULT_RATES, type CurrencyCode } from '@/lib/currency';
import type { Settings, Subscription, SubscriptionInput } from '@/lib/types';

interface State {
  subscriptions: Subscription[];
  settings: Settings;
  hydrated: boolean;
  addSubscription: (input: SubscriptionInput) => string;
  updateSubscription: (id: string, input: SubscriptionInput) => void;
  removeSubscription: (id: string) => void;
  setBaseCurrency: (code: CurrencyCode) => void;
  setRate: (code: CurrencyCode, rate: number) => void;
  resetRates: () => void;
  /** merge: imported entries update/extend existing ones, settings untouched. replace: swap everything. */
  importData: (subscriptions: Subscription[], settings: Settings | null, mode: 'merge' | 'replace') => void;
}

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const useStore = create<State>()(
  persist(
    (set) => ({
      subscriptions: [],
      settings: { baseCurrency: 'INR', rates: { ...DEFAULT_RATES } },
      hydrated: false,

      addSubscription: (input) => {
        const id = newId();
        set((s) => ({
          subscriptions: [...s.subscriptions, { ...input, id, createdAt: Date.now() }],
        }));
        return id;
      },
      updateSubscription: (id, input) =>
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) => (sub.id === id ? { ...sub, ...input } : sub)),
        })),
      removeSubscription: (id) =>
        set((s) => ({ subscriptions: s.subscriptions.filter((sub) => sub.id !== id) })),

      setBaseCurrency: (code) => set((s) => ({ settings: { ...s.settings, baseCurrency: code } })),
      setRate: (code, rate) =>
        set((s) => ({ settings: { ...s.settings, rates: { ...s.settings.rates, [code]: rate } } })),
      resetRates: () => set((s) => ({ settings: { ...s.settings, rates: { ...DEFAULT_RATES } } })),

      importData: (subscriptions, settings, mode) =>
        set((s) =>
          mode === 'replace'
            ? { subscriptions, settings: settings ?? s.settings }
            : { subscriptions: mergeSubscriptions(s.subscriptions, subscriptions) },
        ),
    }),
    {
      name: 'sub-tracker',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ subscriptions: s.subscriptions, settings: s.settings }),
      // Fill in any currencies added after the user's data was saved.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          settings: {
            ...current.settings,
            ...p.settings,
            rates: { ...DEFAULT_RATES, ...p.settings?.rates },
          },
        };
      },
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

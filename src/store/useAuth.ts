import { Platform } from 'react-native';
import { create } from 'zustand';

import { api, ApiError, accountsConfigured } from '@/lib/api';
import { clearToken, getToken, saveToken } from '@/lib/session';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  name: string | null;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>()((set) => ({
  status: 'loading',
  name: null,

  hydrate: async () => {
    // Accounts are mobile-only for now: web has no secure storage for the session token.
    if (!accountsConfigured || Platform.OS === 'web') return set({ status: 'signedOut' });
    const token = await getToken();
    if (!token) return set({ status: 'signedOut' });
    try {
      const me = await api.me(token);
      set({ status: 'signedIn', name: me.name });
    } catch (e) {
      // Session rejected or expired: forget it. Network trouble: keep the session and try later.
      if (e instanceof ApiError && e.status === 401) {
        await clearToken();
        set({ status: 'signedOut', name: null });
      } else {
        set({ status: 'signedIn', name: null });
      }
    }
  },

  signIn: async (email, password) => {
    const { token } = await api.login({ email, password });
    await saveToken(token);
    const me = await api.me(token);
    set({ status: 'signedIn', name: me.name });
  },

  signOut: async () => {
    const token = await getToken();
    if (token) await api.logout(token).catch(() => undefined); // still sign out locally if offline
    await clearToken();
    set({ status: 'signedOut', name: null });
  },
}));

import * as SecureStore from 'expo-secure-store';

// The session token lives in the iOS Keychain / Android Keystore-backed store, never in AsyncStorage.
const KEY = 'subtracker.session';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

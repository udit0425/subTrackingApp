import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { api, ApiError } from '@/lib/api';
import { CONTENT_WIDTH, useTheme } from '@/lib/theme';
import { useAuth } from '@/store/useAuth';

export default function LoginScreen() {
  const t = useTheme();
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNeedsVerification(false);
    try {
      await signIn(email, password);
      router.dismissAll();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'email_not_verified') setNeedsVerification(true);
      setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setResent(false);
    try {
      await api.resend(email);
      setResent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the link.');
    }
  };

  const input = [styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.card }];

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[styles.content, CONTENT_WIDTH]} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: t.text }]}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        style={input}
      />
      <Text style={[styles.label, { color: t.text }]}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        style={input}
      />

      {error ? <Text style={{ color: t.danger }}>{error}</Text> : null}

      {needsVerification && (
        <Pressable onPress={resend} accessibilityRole="button">
          <Text style={{ color: t.primary, fontWeight: '600' }}>
            {resent ? 'Sent. Check your inbox.' : 'Send me a new verification link'}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={submit}
        disabled={busy || !email || !password}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: t.primary, opacity: busy || !email || !password ? 0.5 : pressed ? 0.8 : 1 },
        ]}>
        {busy ? <ActivityIndicator color={t.onPrimary} /> : <Text style={{ color: t.onPrimary, fontWeight: '700' }}>Sign in</Text>}
      </Pressable>

      <Pressable onPress={() => router.replace('/auth/signup')} accessibilityRole="button" style={{ alignSelf: 'center' }}>
        <Text style={{ color: t.primary, fontWeight: '600' }}>New here? Create an account</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10 },
  label: { fontWeight: '600', marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
});

import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { api } from '@/lib/api';
import { CONTENT_WIDTH, useTheme } from '@/lib/theme';

const MIN_PASSWORD = 10;

export default function SignupScreen() {
  const t = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const valid = name.trim().length > 0 && email.includes('@') && password.length >= MIN_PASSWORD;

  const submit = async () => {
    if (busy || !valid) return;
    setBusy(true);
    setError(null);
    try {
      await api.signup({ name: name.trim(), email: email.trim(), password });
      setSentTo(email.trim().toLowerCase());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!sentTo) return;
    await api.resend(sentTo).catch(() => undefined);
    setResent(true);
  };

  const input = [styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.card }];

  if (sentTo) {
    return (
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[styles.content, CONTENT_WIDTH]}>
        <Text style={[styles.heading, { color: t.text }]}>Check your email</Text>
        <Text style={{ color: t.muted, fontSize: 15, lineHeight: 22 }}>
          We sent a verification link to {sentTo}. Open it on this phone or computer, then come back and sign in.
          The link expires in 24 hours.
        </Text>
        <Pressable onPress={resend} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingVertical: 8 }}>
          <Text style={{ color: t.primary, fontWeight: '600' }}>{resent ? 'Sent again.' : 'Resend the link'}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/auth/login')}
          accessibilityRole="button"
          style={[styles.button, { backgroundColor: t.primary }]}>
          <Text style={{ color: t.onPrimary, fontWeight: '700' }}>Go to sign in</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[styles.content, CONTENT_WIDTH]} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: t.text }]}>Name</Text>
      <TextInput value={name} onChangeText={setName} autoComplete="name" textContentType="name" style={input} />
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
        autoComplete="new-password"
        textContentType="newPassword"
        style={input}
      />
      <Text style={{ color: t.muted, fontSize: 13 }}>At least {MIN_PASSWORD} characters.</Text>

      {error ? <Text style={{ color: t.danger }}>{error}</Text> : null}

      <Pressable
        onPress={submit}
        disabled={busy || !valid}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: t.primary, opacity: busy || !valid ? 0.5 : pressed ? 0.8 : 1 },
        ]}>
        {busy ? <ActivityIndicator color={t.onPrimary} /> : <Text style={{ color: t.onPrimary, fontWeight: '700' }}>Create account</Text>}
      </Pressable>

      <Pressable onPress={() => router.replace('/auth/login')} accessibilityRole="button" style={{ alignSelf: 'center' }}>
        <Text style={{ color: t.primary, fontWeight: '600' }}>Already have an account? Sign in</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10 },
  heading: { fontSize: 22, fontWeight: '700' },
  label: { fontWeight: '600', marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
});

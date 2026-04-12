import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useTheme } from '../../theme';

export default function RegisterScreen({ navigation }: any) {
  const t = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!name || !email || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(user, { displayName: name.trim() });
    } catch (e: any) {
      console.error('Register error:', e.code, e.message);
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[styles.title, { color: t.accent }]}>Create Account</Text>
      <Text style={[styles.subtitle, { color: t.textSecondary }]}>Join the PHEV PH community</Text>

      {error && <Text style={[styles.error, { color: t.destructive }]}>{error}</Text>}

      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]}
        placeholder="Full Name"
        placeholderTextColor={t.placeholder}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]}
        placeholder="Email"
        placeholderTextColor={t.placeholder}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]}
        placeholder="Password (min. 6 characters)"
        placeholderTextColor={t.placeholder}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={[styles.button, { backgroundColor: t.accent }]} onPress={handleRegister} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Create Account</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={[styles.link, { color: t.textSecondary }]}>
          Already have an account? <Text style={[styles.linkBold, { color: t.accent }]}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

function friendlyError(code: string) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/weak-password':
      return 'Password is too weak.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 32 },
  input: {
    width: '100%', borderWidth: 1, borderRadius: 10,
    padding: 14, fontSize: 15, marginBottom: 12,
  },
  button: { width: '100%', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { marginBottom: 12, fontSize: 14 },
  link: { marginTop: 20, fontSize: 14 },
  linkBold: { fontWeight: '700' },
});

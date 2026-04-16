import { API_URL } from '../lib/config';
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';



export default function EditProfileScreen({ navigation }: any) {
  const t = useTheme();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/api/v1/users/profile?firebaseUid=${user.uid}`)
      .then(r => r.json())
      .then(json => { if (json.data?.phoneNumber) setPhoneNumber(json.data.phoneNumber); })
      .catch(() => {});
  }, []);

  async function handleSave() {
    if (!displayName.trim()) { Alert.alert('Name required', 'Please enter your name.'); return; }
    setLoading(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      }
      await fetch(`${API_URL}/api/v1/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user?.uid, displayName: displayName.trim(), phoneNumber: phoneNumber.trim() || undefined }),
      });
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not update profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: t.background }]} contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: t.textSecondary }]}>Full Name</Text>
        <TextInput
          style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={t.placeholder}
        />

        <Text style={[styles.label, { color: t.textSecondary }]}>Phone Number</Text>
        <TextInput
          style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="09XX XXX XXXX"
          placeholderTextColor={t.placeholder}
          keyboardType="phone-pad"
        />

        <Text style={[styles.note, { color: t.textTertiary }]}>Email cannot be changed here.</Text>

        <TouchableOpacity style={[styles.button, { backgroundColor: t.green }]} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15 },
  note: { fontSize: 12, marginTop: 12 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

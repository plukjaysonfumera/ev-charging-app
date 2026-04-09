import { API_URL } from '../lib/config';
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../lib/firebase';
import { useTheme } from '../theme';



export default function WriteReviewScreen({ route, navigation }: any) {
  const t = useTheme();
  const { stationId, stationName } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (rating === 0) { Alert.alert('Rating required', 'Please select a star rating.'); return; }
    const user = auth.currentUser;
    if (!user) { Alert.alert('Not signed in', 'Please sign in to write a review.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: user.uid, displayName: user.displayName ?? 'Anonymous',
          email: user.email, stationId, rating, comment: comment.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      Alert.alert('Review submitted!', 'Thank you for your feedback.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not submit review.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[styles.stationName, { color: t.green }]}>{stationName}</Text>
      <Text style={[styles.label, { color: t.textSecondary }]}>Your rating</Text>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(i => (
          <TouchableOpacity key={i} onPress={() => setRating(i)} style={styles.starButton}>
            <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={40} color={t.star} />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text style={[styles.ratingLabel, { color: t.star }]}>
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
        </Text>
      )}

      <Text style={[styles.label, { color: t.textSecondary }]}>Comment (optional)</Text>
      <TextInput
        style={[styles.textArea, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]}
        placeholder="Share your experience — charger speed, availability, location..."
        placeholderTextColor={t.placeholder}
        multiline
        numberOfLines={5}
        value={comment}
        onChangeText={setComment}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: rating === 0 ? t.textTertiary : t.green }]}
        onPress={handleSubmit}
        disabled={loading || rating === 0}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Submit Review</Text>
        }
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  stationName: { fontSize: 18, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  starsRow: { flexDirection: 'row', marginBottom: 8 },
  starButton: { marginRight: 8 },
  ratingLabel: { fontSize: 14, fontWeight: '600', marginBottom: 24 },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, minHeight: 120, marginBottom: 24 },
  button: { padding: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

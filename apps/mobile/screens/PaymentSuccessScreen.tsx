import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function PaymentSuccessScreen({ route, navigation }: any) {
  const t = useTheme();
  const { amount } = route.params;

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark-circle" size={80} color={t.green} />
      </View>

      <Text style={[styles.title, { color: t.green }]}>Payment Successful!</Text>
      <Text style={[styles.amount, { color: t.text }]}>₱{amount}</Text>
      <Text style={[styles.subtitle, { color: t.textSecondary }]}>Thank you for charging with PHEV PH.</Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: t.green }]}
        onPress={() => navigation.navigate('Tabs', { screen: 'History' })}
      >
        <Text style={styles.primaryButtonText}>View Receipt in History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, { borderColor: t.border }]}
        onPress={() => navigation.navigate('Tabs', { screen: 'Map' })}
      >
        <Text style={[styles.secondaryButtonText, { color: t.textSecondary }]}>Back to Map</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconCircle: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  amount: { fontSize: 40, fontWeight: '900', marginBottom: 12 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 40 },
  primaryButton: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { width: '100%', borderWidth: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { fontSize: 16 },
});

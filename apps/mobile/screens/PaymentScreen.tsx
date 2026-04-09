import { API_URL } from '../lib/config';
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../theme';



const PAYMENT_METHODS = [
  { id: 'gcash',   label: 'GCash',              icon: '💚', description: 'Pay via GCash e-wallet' },
  { id: 'paymaya', label: 'Maya',               icon: '💙', description: 'Pay via Maya e-wallet' },
  { id: 'card',    label: 'Credit / Debit Card', icon: '💳', description: 'Visa, Mastercard accepted' },
];

export default function PaymentScreen({ route, navigation }: any) {
  const t = useTheme();
  const { session } = route.params;
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const totalAmount = Number(session.totalAmount).toFixed(2);

  async function handlePay() {
    if (!selected) { Alert.alert('Select a payment method', 'Please choose GCash, Maya, or Card.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id, paymentType: selected,
          successUrl: `${API_URL}/payment/return?status=success`,
          failedUrl:  `${API_URL}/payment/return?status=failed`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const { redirectUrl, paymentIntentId, status } = json.data;
      if (status === 'succeeded') { handlePaymentSuccess(session.id); return; }

      if (redirectUrl) {
        setLoading(false);
        await WebBrowser.openBrowserAsync(redirectUrl);
        await checkPaymentStatus(paymentIntentId, session.id);
      }
    } catch (e: any) {
      Alert.alert('Payment Error', e.message ?? 'Something went wrong.');
      setLoading(false);
    }
  }

  async function checkPaymentStatus(paymentIntentId: string, sessionId: string) {
    setChecking(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/payments/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId, sessionId }),
      });
      const json = await res.json();
      const status = json.data?.status;
      if (status === 'succeeded') {
        handlePaymentSuccess(sessionId);
      } else if (status === 'awaiting_payment_method') {
        Alert.alert('Payment Cancelled', 'Your payment was not completed.');
      } else {
        Alert.alert('Payment Pending', `Status: ${status}. Please check your History tab.`);
      }
    } catch {
      Alert.alert('Error', 'Could not verify payment status.');
    } finally {
      setChecking(false);
    }
  }

  function handlePaymentSuccess(sessionId: string) {
    navigation.replace('PaymentSuccess', { amount: totalAmount, sessionId });
  }

  if (checking) {
    return (
      <View style={[styles.centered, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.green} />
        <Text style={[styles.checkingText, { color: t.textSecondary }]}>Verifying payment...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.amountCard, { backgroundColor: t.greenTint }]}>
        <Text style={[styles.amountLabel, { color: t.textSecondary }]}>Total Amount Due</Text>
        <Text style={[styles.amount, { color: t.green }]}>₱{totalAmount}</Text>
        <Text style={[styles.amountSub, { color: t.textSecondary }]}>{session.station?.name}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: t.text }]}>Choose Payment Method</Text>

      {PAYMENT_METHODS.map(method => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.methodCard,
            { borderColor: t.border },
            selected === method.id && { borderColor: t.green, backgroundColor: t.greenTint },
          ]}
          onPress={() => setSelected(method.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.methodIcon}>{method.icon}</Text>
          <View style={styles.methodInfo}>
            <Text style={[styles.methodLabel, { color: t.text }]}>{method.label}</Text>
            <Text style={[styles.methodDesc, { color: t.textSecondary }]}>{method.description}</Text>
          </View>
          <View style={[styles.radio, { borderColor: selected === method.id ? t.green : t.border }]}>
            {selected === method.id && <View style={[styles.radioDot, { backgroundColor: t.green }]} />}
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.payButton, { backgroundColor: selected ? t.green : t.textTertiary }]}
        onPress={handlePay}
        disabled={loading || !selected}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <><Ionicons name="lock-closed" size={16} color="#fff" /><Text style={styles.payButtonText}>Pay ₱{totalAmount}</Text></>
        }
      </TouchableOpacity>

      <Text style={[styles.secureNote, { color: t.textTertiary }]}>
        🔒 Secured by PayMongo · PCI-DSS Compliant
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  checkingText: { fontSize: 16 },
  amountCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 28 },
  amountLabel: { fontSize: 13, marginBottom: 4 },
  amount: { fontSize: 40, fontWeight: '900', marginBottom: 4 },
  amountSub: { fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  methodCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: 16, marginBottom: 10 },
  methodIcon: { fontSize: 28, marginRight: 14 },
  methodInfo: { flex: 1 },
  methodLabel: { fontSize: 15, fontWeight: '700' },
  methodDesc: { fontSize: 13, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18, borderRadius: 14, marginTop: 20 },
  payButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  secureNote: { textAlign: 'center', fontSize: 12, marginTop: 16 },
});

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

const SPEED_LABELS: Record<string, string> = {
  LEVEL1: 'Level 1', LEVEL2: 'Level 2', DCFC: 'DC Fast Charge',
};

export default function SessionSummaryScreen({ route, navigation }: any) {
  const t = useTheme();
  const { session } = route.params;

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} contentContainerStyle={styles.content}>
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark-circle" size={64} color={t.green} />
      </View>
      <Text style={[styles.title, { color: t.green }]}>Session Complete</Text>
      <Text style={[styles.subtitle, { color: t.textSecondary }]}>Great charge! Here's your summary.</Text>

      <View style={[styles.card, { backgroundColor: t.surface }]}>
        <Text style={[styles.cardLabel, { color: t.textTertiary }]}>Station</Text>
        <Text style={[styles.cardValue, { color: t.text }]}>{session.station.name}</Text>
        <Text style={[styles.cardSub, { color: t.textSecondary }]}>{session.station.city}</Text>
      </View>

      <View style={styles.statsGrid}>
        {[
          { icon: 'flash' as const, value: `${Number(session.energyKwh).toFixed(2)}`, label: 'kWh Added' },
          { icon: 'time' as const, value: formatDuration(session.durationMinutes), label: 'Duration' },
          { icon: 'card' as const, value: `₱${Number(session.totalAmount).toFixed(2)}`, label: 'Total Cost' },
          { icon: 'speedometer' as const, value: `${session.port.maxKw} kW`, label: 'Charger Speed' },
        ].map((item, i) => (
          <View key={i} style={[styles.statBox, { backgroundColor: t.greenTint }]}>
            <Ionicons name={item.icon} size={20} color={t.green} />
            <Text style={[styles.statValue, { color: t.green }]}>{item.value}</Text>
            <Text style={[styles.statLabel, { color: t.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.detailsCard, { borderColor: t.separator }]}>
        <Row label="Connector" value={session.port.connectorType} t={t} />
        <Row label="Charging Type" value={SPEED_LABELS[session.port.chargingSpeed] ?? session.port.chargingSpeed} t={t} />
        <Row label="Rate" value={`₱${Number(session.port.pricePerKwh).toFixed(2)} / kWh`} t={t} />
        <Row label="Started" value={formatDateTime(session.startedAt)} t={t} />
        <Row label="Ended" value={formatDateTime(session.endedAt)} t={t} />
        <Row label="Payment" value={session.paymentStatus} t={t} last />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: t.green }]}
        onPress={() => navigation.navigate('Payment', { session })}
      >
        <Ionicons name="card" size={18} color="#fff" />
        <Text style={styles.primaryButtonText}>Pay ₱{Number(session.totalAmount).toFixed(2)}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, { borderColor: t.border }]}
        onPress={() => navigation.navigate('Tabs', { screen: 'History' })}
      >
        <Text style={[styles.secondaryButtonText, { color: t.textSecondary }]}>Pay Later · View History</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value, last = false, t }: { label: string; value: string; last?: boolean; t: any }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: t.separator }]}>
      <Text style={[styles.rowLabel, { color: t.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, alignItems: 'center' },
  iconCircle: { marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 28 },
  card: { width: '100%', borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  cardLabel: { fontSize: 12, marginBottom: 4 },
  cardValue: { fontSize: 17, fontWeight: '700' },
  cardSub: { fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%', marginBottom: 16 },
  statBox: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 12 },
  detailsCard: { width: '100%', borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '600' },
  primaryButton: { width: '100%', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { width: '100%', borderWidth: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },
});

import { API_URL } from '../lib/config';
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Vibration, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';



interface SessionData {
  id: string;
  startedAt: string;
  station: { name: string; city: string };
  port: { connectorType: string; chargingSpeed: string; maxKw: number; pricePerKwh: string };
}

export default function ChargingSessionScreen({ route, navigation }: any) {
  const t = useTheme();
  const { session } = route.params as { session: SessionData };
  const [elapsed, setElapsed] = useState(0);
  const [stopping, setStopping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pricePerKwh = Number(session.port.pricePerKwh);
  const maxKw = Number(session.port.maxKw);
  const estimatedKwh = parseFloat(((maxKw * 0.8 * elapsed) / 3600).toFixed(3));
  const estimatedCost = parseFloat((estimatedKwh * pricePerKwh).toFixed(2));

  useEffect(() => {
    const start = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function formatElapsed(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function confirmStop() {
    Alert.alert('Stop Charging?', 'This will end your charging session.', [
      { text: 'Continue Charging', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: stopSession },
    ]);
  }

  async function stopSession() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStopping(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/sessions/${session.id}/stop`, { method: 'PATCH' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      Vibration.vibrate(400);
      navigation.replace('SessionSummary', { session: json.data });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not stop session.');
      setStopping(false);
    }
  }

  const SPEED_LABELS: Record<string, string> = {
    LEVEL1: 'Level 1', LEVEL2: 'Level 2', DCFC: 'DC Fast Charge',
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <View style={[styles.pulseRing, { backgroundColor: t.green + '20' }]}>
        <View style={[styles.pulseInner, { backgroundColor: t.green }]}>
          <Ionicons name="flash" size={48} color="#fff" />
        </View>
      </View>

      <Text style={[styles.chargingLabel, { color: t.textSecondary }]}>Charging</Text>
      <Text style={[styles.timer, { color: t.green }]}>{formatElapsed(elapsed)}</Text>

      <View style={[styles.infoCard, { backgroundColor: t.surface }]}>
        <Text style={[styles.stationName, { color: t.text }]}>{session.station.name}</Text>
        <Text style={[styles.stationCity, { color: t.textSecondary }]}>{session.station.city}</Text>
        <Text style={[styles.portInfo, { color: t.textTertiary }]}>
          {SPEED_LABELS[session.port.chargingSpeed] ?? session.port.chargingSpeed} · {maxKw} kW · {session.port.connectorType}
        </Text>
      </View>

      <View style={[styles.statsRow, { backgroundColor: t.greenTint }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: t.green }]}>{estimatedKwh.toFixed(2)}</Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>kWh</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.greenTintBorder }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: t.green }]}>₱{estimatedCost.toFixed(2)}</Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>Est. Cost</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.greenTintBorder }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: t.green }]}>₱{pricePerKwh.toFixed(2)}</Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>/ kWh</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.stopButton, { backgroundColor: t.destructive }]}
        onPress={confirmStop}
        disabled={stopping}
      >
        {stopping
          ? <ActivityIndicator color="#fff" />
          : <><Ionicons name="stop-circle" size={22} color="#fff" /><Text style={styles.stopText}>Stop Charging</Text></>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  pulseRing: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  pulseInner: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  chargingLabel: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  timer: { fontSize: 52, fontWeight: '800', fontVariant: ['tabular-nums'], marginBottom: 32 },
  infoCard: { width: '100%', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 24 },
  stationName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  stationCity: { fontSize: 13, marginBottom: 6 },
  portInfo: { fontSize: 13 },
  statsRow: { flexDirection: 'row', width: '100%', borderRadius: 12, padding: 16, marginBottom: 40 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, marginHorizontal: 8 },
  stopButton: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 14 },
  stopText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

import { API_URL } from '../lib/config';
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Vibration, ActivityIndicator, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../theme';

interface SessionData {
  id: string;
  startedAt: string;
  targetKwh?: number;
  station: { name: string; city: string };
  port: { connectorType: string; chargingSpeed: string; maxKw: number; pricePerKwh: string };
}

const SPEED_LABELS: Record<string, string> = {
  LEVEL1: 'Level 1', LEVEL2: 'Level 2', DCFC: 'DC Fast Charge',
};

const BATTERY_HEIGHT = 160;

export default function ChargingSessionScreen({ route, navigation }: any) {
  const t = useTheme();
  const { session } = route.params as { session: SessionData };
  const [elapsed, setElapsed] = useState(0);
  const [stopping, setStopping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notified90Ref = useRef(false);
  const notified100Ref = useRef(false);

  const pricePerKwh = Number(session.port.pricePerKwh);
  const maxKw = Number(session.port.maxKw);
  const targetKwh = session.targetKwh ?? null;

  // Derived live values
  const estimatedKwh = parseFloat(((maxKw * 0.8 * elapsed) / 3600).toFixed(3));
  const estimatedCost = parseFloat((estimatedKwh * pricePerKwh).toFixed(2));

  // Battery fill percent: if targetKwh is set use that, otherwise assume full = 2h session
  const fillPercent = targetKwh != null
    ? Math.min(estimatedKwh / targetKwh, 1)
    : Math.min(elapsed / (2 * 3600), 1); // cap at 2hr for visual

  // Animated values
  const fillAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const boltAnim = useRef(new Animated.Value(1)).current;

  // Pulsing glow ring
  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    const boltLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(boltAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(boltAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    glowLoop.start();
    boltLoop.start();
    return () => { glowLoop.stop(); boltLoop.stop(); };
  }, []);

  // Smooth battery fill animation
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: fillPercent,
      duration: 1000,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [fillPercent]);

  // Elapsed timer
  useEffect(() => {
    const start = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Smart charging reminders — fire local notification at 90% and 100%
  useEffect(() => {
    if (!targetKwh) return;
    if (fillPercent >= 0.9 && fillPercent < 1 && !notified90Ref.current) {
      notified90Ref.current = true;
      Notifications.scheduleNotificationAsync({
        content: {
          title: '⚡ Almost fully charged!',
          body: `${session.station.name} — You're at ${Math.round(fillPercent * 100)}% of your target. Your EV is nearly done!`,
          sound: true,
        },
        trigger: null,
      }).catch(() => {});
    }
    if (fillPercent >= 1 && !notified100Ref.current) {
      notified100Ref.current = true;
      Vibration.vibrate([0, 200, 100, 200]);
      Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Charging complete!',
          body: `${session.station.name} — Your EV has reached your target of ${targetKwh} kWh. Time to unplug!`,
          sound: true,
        },
        trigger: null,
      }).catch(() => {});
    }
  }, [fillPercent]);

  function formatElapsed(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Battery fill color: interpolate from amber → accent as it fills
  const fillColor = fillAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: ['#F59E0B', '#F97316', t.accent],
  });

  // Glow color opacity behind battery
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0.15, 0.45],
  });

  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BATTERY_HEIGHT],
  });

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

  const fillPercDisplay = Math.round(fillPercent * 100);

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>

      {/* ── Station Info ── */}
      <View style={[styles.stationBanner, { backgroundColor: t.surface }]}>
        <View style={[styles.stationIconBox, { backgroundColor: t.badge }]}>
          <Ionicons name="flash" size={18} color={t.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stationName, { color: t.text }]} numberOfLines={1}>{session.station.name}</Text>
          <Text style={[styles.stationCity, { color: t.textSecondary }]}>
            {session.station.city} · {SPEED_LABELS[session.port.chargingSpeed] ?? session.port.chargingSpeed} · {maxKw} kW
          </Text>
        </View>
        <View style={[styles.livePill, { backgroundColor: t.badge }]}>
          <View style={[styles.liveDot, { backgroundColor: t.accent }]} />
          <Text style={[styles.liveText, { color: t.accent }]}>LIVE</Text>
        </View>
      </View>

      {/* ── Battery Visual ── */}
      <View style={styles.batterySection}>
        {/* Ambient glow behind battery */}
        <Animated.View style={[styles.batteryGlow, { backgroundColor: t.accent, opacity: glowOpacity }]} />

        {/* Battery body */}
        <View style={[styles.batteryOuter, { borderColor: t.border }]}>
          {/* Battery tip */}
          <View style={[styles.batteryTip, { backgroundColor: t.border }]} />

          {/* Fill */}
          <Animated.View
            style={[
              styles.batteryFill,
              { height: fillHeight, backgroundColor: fillColor },
            ]}
          />

          {/* Percent text inside battery */}
          <View style={styles.batteryContent}>
            <Animated.View style={{ transform: [{ scale: boltAnim }] }}>
              <Ionicons name="flash" size={32} color="#fff" />
            </Animated.View>
            <Text style={styles.batteryPercent}>{fillPercDisplay}%</Text>
          </View>
        </View>

        {/* Timer */}
        <Text style={[styles.timer, { color: t.text }]}>{formatElapsed(elapsed)}</Text>
        <Text style={[styles.timerLabel, { color: t.textSecondary }]}>elapsed</Text>
      </View>

      {/* ── Live Metrics ── */}
      <View style={[styles.metricsRow, { backgroundColor: t.surface }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: t.accent }]}>{estimatedKwh.toFixed(2)}</Text>
          <Text style={[styles.metricLabel, { color: t.textSecondary }]}>kWh Added</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: t.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: t.accent }]}>
            {pricePerKwh > 0 ? `₱${estimatedCost.toFixed(2)}` : '—'}
          </Text>
          <Text style={[styles.metricLabel, { color: t.textSecondary }]}>Est. Cost</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: t.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: t.accent }]}>
            {pricePerKwh > 0 ? `₱${pricePerKwh.toFixed(2)}` : '—'}
          </Text>
          <Text style={[styles.metricLabel, { color: t.textSecondary }]}>/kWh</Text>
        </View>
      </View>

      {/* ── Target kWh ── */}
      {targetKwh != null && (
        <View style={[styles.targetRow, { backgroundColor: t.surface }]}>
          <Ionicons name="flag-outline" size={16} color={t.textSecondary} />
          <Text style={[styles.targetText, { color: t.textSecondary }]}>
            Target: {targetKwh} kWh · {estimatedKwh.toFixed(2)} / {targetKwh} kWh charged
          </Text>
        </View>
      )}

      {/* ── Stop Button ── */}
      <TouchableOpacity
        style={[styles.stopButton, { backgroundColor: t.destructive }]}
        onPress={confirmStop}
        disabled={stopping}
        activeOpacity={0.85}
      >
        {stopping ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="stop-circle" size={22} color="#fff" />
            <Text style={styles.stopText}>Stop Charging</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={[styles.connector, { color: t.textTertiary }]}>
        {session.port.connectorType} connector
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 32,
  },

  stationBanner: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    gap: 12, borderRadius: 14, padding: 14, marginTop: 16,
  },
  stationIconBox: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  stationName: { fontSize: 14, fontWeight: '700' },
  stationCity: { fontSize: 12, marginTop: 2 },
  livePill: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5 },
  liveText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // Battery
  batterySection: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    marginVertical: 8,
  },
  batteryGlow: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
  },
  batteryOuter: {
    width: 100,
    height: BATTERY_HEIGHT,
    borderRadius: 16,
    borderWidth: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  batteryTip: {
    position: 'absolute',
    top: -12, alignSelf: 'center',
    width: 28, height: 12, borderRadius: 4,
  },
  batteryFill: {
    width: '100%',
    borderRadius: 13,
  },
  batteryContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  batteryPercent: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  timer: {
    fontSize: 48, fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 20,
  },
  timerLabel: { fontSize: 14, fontWeight: '500', marginTop: 2 },

  // Metrics
  metricsRow: {
    width: '100%', flexDirection: 'row',
    borderRadius: 14, padding: 16, marginBottom: 12,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '800' },
  metricLabel: { fontSize: 11, marginTop: 3 },
  metricDivider: { width: 1, marginVertical: 4 },

  targetRow: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    gap: 8, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 12,
  },
  targetText: { fontSize: 13, flex: 1 },

  stopButton: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 14, marginBottom: 12,
  },
  stopText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  connector: { fontSize: 13 },
});

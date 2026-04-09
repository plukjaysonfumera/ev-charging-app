import { API_URL } from '../lib/config';
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../lib/firebase';
import { useTheme } from '../theme';



const STATUS_CONFIG: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  COMPLETED:  { color: '#2d9e5f', icon: 'checkmark-circle',  label: 'Completed'  },
  CHARGING:   { color: '#3b82f6', icon: 'flash',              label: 'Charging'   },
  INITIATED:  { color: '#f5a623', icon: 'time',               label: 'Initiated'  },
  CANCELLED:  { color: '#aaa',    icon: 'close-circle',       label: 'Cancelled'  },
  FAILED:     { color: '#e03939', icon: 'alert-circle',       label: 'Failed'     },
};

const SPEED_LABELS: Record<string, string> = {
  LEVEL1: 'L1', LEVEL2: 'L2', DCFC: 'DC Fast',
};

interface Session {
  id: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
  energyKwh?: number;
  durationMinutes?: number;
  totalAmount?: number;
  currency: string;
  paymentStatus: string;
  createdAt: string;
  station: { name: string; city: string; address: string };
  port: { connectorType: string; chargingSpeed: string; maxKw: number };
  vehicle?: { make: string; model: string; year: number };
}

export default function HistoryScreen() {
  const t = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/api/v1/sessions?firebaseUid=${user.uid}`);
      const json = await res.json();
      setSessions(json.data ?? []);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatDuration(minutes?: number) {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTime(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  }

  function renderItem({ item }: { item: Session }) {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.FAILED;
    return (
      <View style={[styles.card, { backgroundColor: t.surfaceElevated }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleBlock}>
            <Text style={[styles.stationName, { color: t.text }]} numberOfLines={1}>{item.station.name}</Text>
            <Text style={[styles.stationCity, { color: t.textTertiary }]}>{item.station.city}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon} size={13} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <Text style={[styles.dateText, { color: t.textTertiary }]}>
          {formatDate(item.createdAt)} · {formatTime(item.startedAt)}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="flash-outline" size={14} color={t.textSecondary} />
            <Text style={[styles.statValue, { color: t.text }]}>
              {item.energyKwh != null ? `${item.energyKwh.toFixed(2)} kWh` : '—'}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: t.separator }]} />
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={14} color={t.textSecondary} />
            <Text style={[styles.statValue, { color: t.text }]}>{formatDuration(item.durationMinutes)}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: t.separator }]} />
          <View style={styles.stat}>
            <Ionicons name="card-outline" size={14} color={t.textSecondary} />
            <Text style={[styles.statValue, { color: t.text }]}>
              {item.totalAmount != null ? `₱${Number(item.totalAmount).toFixed(2)}` : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.portRow}>
          <Text style={[styles.portInfo, { color: t.textTertiary }]}>
            {SPEED_LABELS[item.port.chargingSpeed] ?? item.port.chargingSpeed} · {item.port.maxKw} kW · {item.port.connectorType}
          </Text>
          {item.vehicle && (
            <Text style={[styles.vehicleInfo, { color: t.textTertiary }]}>
              {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: t.surface }]}>
        <ActivityIndicator size="large" color={t.green} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.surface }]}>
      <FlatList
        data={sessions}
        keyExtractor={s => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadSessions(true)} tintColor={t.green} />
        }
        ListHeaderComponent={
          sessions.length > 0 ? (
            <Text style={[styles.headerText, { color: t.textTertiary }]}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="battery-charging-outline" size={64} color={t.border} />
            <Text style={[styles.emptyTitle, { color: t.textTertiary }]}>No sessions yet</Text>
            <Text style={[styles.emptySubtitle, { color: t.textTertiary }]}>
              Your charging history will appear here after your first session.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, flexGrow: 1 },
  headerText: { fontSize: 12, marginBottom: 8 },
  card: {
    borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  cardTitleBlock: { flex: 1, marginRight: 8 },
  stationName: { fontSize: 15, fontWeight: '700' },
  stationCity: { fontSize: 12, marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  dateText: { fontSize: 12, marginBottom: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 13, fontWeight: '600' },
  statDivider: { width: 1, height: 16, marginHorizontal: 4 },
  portRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portInfo: { fontSize: 12 },
  vehicleInfo: { fontSize: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
});

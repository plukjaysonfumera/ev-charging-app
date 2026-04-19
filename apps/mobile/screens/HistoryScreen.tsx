import { API_URL } from '../lib/config';
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, Dimensions, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { auth } from '../lib/firebase';
import { useTheme } from '../theme';
import { co2SavedKg, formatCo2 } from '../lib/eco';

const SCREEN_WIDTH = Dimensions.get('window').width;

const STATUS_CONFIG: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  COMPLETED: { color: '#2d9e5f', icon: 'checkmark-circle', label: 'Completed' },
  CHARGING:  { color: '#3b82f6', icon: 'flash',            label: 'Charging'  },
  INITIATED: { color: '#f5a623', icon: 'time',             label: 'Initiated' },
  CANCELLED: { color: '#aaa',    icon: 'close-circle',     label: 'Cancelled' },
  FAILED:    { color: '#e03939', icon: 'alert-circle',     label: 'Failed'    },
};

const SPEED_LABELS: Record<string, string> = { LEVEL1: 'L1', LEVEL2: 'L2', DCFC: 'DC Fast' };

interface Session {
  id: string; status: string; startedAt?: string; endedAt?: string;
  energyKwh?: number; durationMinutes?: number; totalAmount?: number;
  currency: string; paymentStatus: string; createdAt: string;
  station: { name: string; city: string; address: string };
  port: { connectorType: string; chargingSpeed: string; maxKw: number };
  vehicle?: { make: string; model: string; year: number };
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildMonthlyData(sessions: Session[], field: 'kWh' | 'spent') {
  const now   = new Date();
  const data: { value: number; label: string; frontColor: string }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();

    const monthSessions = sessions.filter(s => {
      const sd = new Date(s.createdAt);
      return sd.getMonth() === m && sd.getFullYear() === y && s.status === 'COMPLETED';
    });

    const value = field === 'kWh'
      ? parseFloat(monthSessions.reduce((sum, s) => sum + (s.energyKwh ?? 0), 0).toFixed(1))
      : parseFloat(monthSessions.reduce((sum, s) => sum + Number(s.totalAmount ?? 0), 0).toFixed(0));

    data.push({ value, label: MONTH_SHORT[m], frontColor: i === 0 ? '#22C55E' : '#4ADE80' });
  }
  return data;
}

export default function HistoryScreen() {
  const t = useTheme();
  const [sessions,   setSessions]   = useState<Session[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartTab,   setChartTab]   = useState<'kWh' | 'spent'>('kWh');

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }
    try {
      const res  = await fetch(`${API_URL}/api/v1/sessions?firebaseUid=${user.uid}`);
      const json = await res.json();
      setSessions(json.data ?? []);
    } catch { /* silent */ } finally {
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

  const completed    = sessions.filter(s => s.status === 'COMPLETED');
  const totalKwh     = completed.reduce((sum, s) => sum + (s.energyKwh ?? 0), 0);
  const totalSpent   = completed.reduce((sum, s) => sum + Number(s.totalAmount ?? 0), 0);
  const totalMinutes = completed.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const totalCo2     = co2SavedKg(totalKwh);

  const chartData = buildMonthlyData(sessions, chartTab);
  const chartMax  = Math.max(...chartData.map(d => d.value), 1);

  function renderHeader() {
    if (sessions.length === 0) return null;
    return (
      <>
        {/* ── Summary card ── */}
        <View style={[styles.summaryCard, { backgroundColor: t.accent }]}>
          <Text style={styles.summaryTitle}>YOUR CHARGING SUMMARY</Text>
          <View style={styles.summaryRow}>
            {[
              { value: String(completed.length),        label: 'Sessions'   },
              { value: `${totalKwh.toFixed(1)}`,        label: 'kWh Total'  },
              { value: `₱${totalSpent.toFixed(0)}`,     label: 'Spent'      },
              { value: formatDuration(totalMinutes),    label: 'Time'       },
            ].map((s, i, arr) => (
              <View key={s.label} style={{ flexDirection: 'row', flex: 1 }}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryValue}>{s.value}</Text>
                  <Text style={styles.summaryLabel}>{s.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.summaryDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* ── CO₂ impact strip ── */}
        <View style={[styles.co2Strip, { backgroundColor: '#166534' }]}>
          <Text style={styles.co2Emoji}>🌱</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.co2Title}>You've saved {formatCo2(totalCo2)} of CO₂</Text>
            <Text style={styles.co2Sub}>vs driving an equivalent petrol car</Text>
          </View>
          <View style={[styles.co2Badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.co2BadgeText}>{totalKwh.toFixed(1)} kWh</Text>
          </View>
        </View>

        {/* ── Analytics chart ── */}
        <View style={[styles.chartCard, { backgroundColor: t.surfaceElevated }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: t.text }]}>Monthly Analytics</Text>
            <View style={styles.chartTabs}>
              {(['kWh', 'spent'] as const).map(tab => (
                <View
                  key={tab}
                  style={[styles.chartTab, chartTab === tab && { backgroundColor: t.accent }]}
                >
                  <Text
                    style={[styles.chartTabText, { color: chartTab === tab ? '#fff' : t.textSecondary }]}
                    onPress={() => setChartTab(tab)}
                  >
                    {tab === 'kWh' ? 'Energy' : 'Spending'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {chartMax > 0 ? (
            <BarChart
              data={chartData}
              barWidth={28}
              spacing={18}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: t.textTertiary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: t.textTertiary, fontSize: 10 }}
              noOfSections={4}
              maxValue={chartMax * 1.2}
              width={SCREEN_WIDTH - 80}
              height={140}
              barBorderRadius={6}
              isAnimated
              animationDuration={600}
              labelWidth={32}
              renderTooltip={(item: any) => (
                <View style={[styles.tooltip, { backgroundColor: t.accent }]}>
                  <Text style={styles.tooltipText}>
                    {chartTab === 'kWh' ? `${item.value} kWh` : `₱${item.value}`}
                  </Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.chartEmpty}>
              <Text style={[styles.chartEmptyText, { color: t.textTertiary }]}>No data yet</Text>
            </View>
          )}
        </View>
      </>
    );
  }

  function renderItem({ item }: { item: Session }) {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.FAILED;
    const co2 = item.energyKwh ? co2SavedKg(item.energyKwh) : 0;
    return (
      <View style={[styles.card, { backgroundColor: t.surfaceElevated }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: t.accent + '15' }]}>
            <Ionicons name="flash" size={18} color={t.accent} />
          </View>
          <View style={styles.cardTitleBlock}>
            <Text style={[styles.stationName, { color: t.text }]} numberOfLines={1}>{item.station.name}</Text>
            <Text style={[styles.stationCity, { color: t.textTertiary }]}>{item.station.city} · {formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon} size={13} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: t.separator }]} />

        <View style={styles.statsRow}>
          {[
            { icon: 'flash-outline',  value: item.energyKwh != null ? `${item.energyKwh.toFixed(2)} kWh` : '—' },
            { icon: 'time-outline',   value: formatDuration(item.durationMinutes) },
            { icon: 'card-outline',   value: item.totalAmount != null ? `₱${Number(item.totalAmount).toFixed(2)}` : '—' },
            { icon: 'leaf-outline',   value: co2 > 0 ? `-${co2}kg` : '—', color: '#22C55E' },
          ].map((s, i, arr) => (
            <View key={i} style={{ flexDirection: 'row', flex: 1 }}>
              <View style={styles.stat}>
                <Ionicons name={s.icon as any} size={14} color={s.color ?? t.accent} />
                <Text style={[styles.statValue, { color: s.color ?? t.text }]}>{s.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: t.separator }]} />}
            </View>
          ))}
        </View>

        <View style={styles.portRow}>
          <Text style={[styles.portInfo, { color: t.textTertiary }]}>
            {SPEED_LABELS[item.port.chargingSpeed] ?? item.port.chargingSpeed} · {item.port.maxKw} kW · {item.port.connectorType}
          </Text>
          {item.vehicle && (
            <Text style={[styles.vehicleInfo, { color: t.textTertiary }]}>
              🚗 {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: t.surface }]}>
        <ActivityIndicator size="large" color={t.accent} />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSessions(true)} tintColor={t.accent} />}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: t.surface }]}>
              <Ionicons name="battery-charging-outline" size={48} color={t.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: t.text }]}>No sessions yet</Text>
            <Text style={[styles.emptySubtitle, { color: t.textSecondary }]}>
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
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: 16, paddingBottom: 32, flexGrow: 1 },

  summaryCard:    { borderRadius: 16, padding: 20, marginBottom: 12 },
  summaryTitle:   { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 14 },
  summaryRow:     { flexDirection: 'row', alignItems: 'center' },
  summaryStat:    { flex: 1, alignItems: 'center' },
  summaryValue:   { color: '#fff', fontSize: 18, fontWeight: '800' },
  summaryLabel:   { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

  co2Strip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  co2Emoji:     { fontSize: 24 },
  co2Title:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  co2Sub:       { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  co2Badge:     { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  co2BadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  chartCard: {
    borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  chartHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle:     { fontSize: 15, fontWeight: '700' },
  chartTabs:      { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 3 },
  chartTab:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  chartTabText:   { fontSize: 12, fontWeight: '600' },
  chartEmpty:     { height: 140, alignItems: 'center', justifyContent: 'center' },
  chartEmptyText: { fontSize: 13 },
  tooltip:        { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  tooltipText:    { color: '#fff', fontSize: 10, fontWeight: '700' },

  card: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardTitleBlock: { flex: 1, marginRight: 8 },
  stationName:   { fontSize: 14, fontWeight: '700' },
  stationCity:   { fontSize: 12, marginTop: 1 },
  statusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText:    { fontSize: 11, fontWeight: '600' },
  divider:       { height: 1, marginBottom: 10 },
  statsRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stat:          { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue:     { fontSize: 12, fontWeight: '600' },
  statDivider:   { width: 1, height: 14, marginHorizontal: 2 },
  portRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portInfo:      { fontSize: 11 },
  vehicleInfo:   { fontSize: 11 },

  emptyState:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyIcon:     { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle:    { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
});

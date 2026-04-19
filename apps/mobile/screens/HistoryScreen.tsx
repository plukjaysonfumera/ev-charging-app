import { API_URL } from '../lib/config';
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, Dimensions, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { auth } from '../lib/firebase';
import { useTheme, F, Shadow, Spacing, Radius } from '../theme';
import { co2SavedKg, formatCo2 } from '../lib/eco';

const SCREEN_WIDTH = Dimensions.get('window').width;

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  COMPLETED: { color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle', label: 'Completed' },
  CHARGING:  { color: '#2563EB', bg: '#DBEAFE', icon: 'flash',            label: 'Charging'  },
  INITIATED: { color: '#D97706', bg: '#FEF3C7', icon: 'time',             label: 'Initiated' },
  CANCELLED: { color: '#9CA3AF', bg: '#F3F4F6', icon: 'close-circle',     label: 'Cancelled' },
  FAILED:    { color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle',     label: 'Failed'    },
};

const SPEED_LABELS: Record<string, string> = { LEVEL1: 'Level 1', LEVEL2: 'Level 2', DCFC: 'DC Fast' };
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Session {
  id: string; status: string; startedAt?: string; endedAt?: string;
  energyKwh?: number; durationMinutes?: number; totalAmount?: number;
  currency: string; paymentStatus: string; createdAt: string;
  station: { name: string; city: string; address: string };
  port: { connectorType: string; chargingSpeed: string; maxKw: number };
  vehicle?: { make: string; model: string; year: number };
}

function buildMonthlyData(sessions: Session[], field: 'kWh' | 'spent', accentColor: string) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const m = d.getMonth(), y = d.getFullYear();
    const ms = sessions.filter(s => {
      const sd = new Date(s.createdAt);
      return sd.getMonth() === m && sd.getFullYear() === y && s.status === 'COMPLETED';
    });
    const value = field === 'kWh'
      ? parseFloat(ms.reduce((sum, s) => sum + (s.energyKwh ?? 0), 0).toFixed(1))
      : parseFloat(ms.reduce((sum, s) => sum + Number(s.totalAmount ?? 0), 0).toFixed(0));
    return { value, label: MONTH_SHORT[m], frontColor: i === 5 ? accentColor : accentColor + '60' };
  });
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

  function fmtDuration(minutes?: number) {
    if (!minutes) return '—';
    return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const completed    = sessions.filter(s => s.status === 'COMPLETED');
  const totalKwh     = completed.reduce((sum, s) => sum + (s.energyKwh ?? 0), 0);
  const totalSpent   = completed.reduce((sum, s) => sum + Number(s.totalAmount ?? 0), 0);
  const totalMinutes = completed.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const totalCo2     = co2SavedKg(totalKwh);

  const chartData = buildMonthlyData(sessions, chartTab, t.accent);
  const chartMax  = Math.max(...chartData.map(d => d.value), 1);

  function renderHeader() {
    if (!sessions.length) return null;
    return (
      <View style={s.headerBlock}>
        {/* Summary card */}
        <View style={[s.summaryCard, { backgroundColor: t.headerBg }]}>
          <Text style={s.summaryEyebrow}>CHARGING SUMMARY</Text>
          <View style={s.summaryStats}>
            {[
              { value: String(completed.length),       label: 'Sessions'  },
              { value: `${totalKwh.toFixed(1)} kWh`,  label: 'Energy'    },
              { value: `₱${totalSpent.toFixed(0)}`,   label: 'Spent'     },
              { value: fmtDuration(totalMinutes),      label: 'Time'      },
            ].map((item, i, arr) => (
              <View key={item.label} style={{ flexDirection: 'row', flex: 1 }}>
                <View style={s.summaryStat}>
                  <Text style={s.summaryValue}>{item.value}</Text>
                  <Text style={s.summaryLabel}>{item.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={s.summaryDiv} />}
              </View>
            ))}
          </View>
        </View>

        {/* CO₂ strip */}
        <View style={[s.co2Strip, { backgroundColor: '#166534' }]}>
          <Text style={{ fontSize: 22 }}>🌱</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.co2Title}>Saved {formatCo2(totalCo2)} CO₂</Text>
            <Text style={s.co2Sub}>vs. driving an equivalent petrol car</Text>
          </View>
          <View style={s.co2Badge}>
            <Text style={s.co2BadgeText}>{totalKwh.toFixed(1)} kWh</Text>
          </View>
        </View>

        {/* Chart card */}
        <View style={[s.chartCard, { backgroundColor: t.surface }, Shadow.sm]}>
          <View style={s.chartHeader}>
            <Text style={[s.chartTitle, { color: t.text }]}>Monthly Analytics</Text>
            <View style={[s.chartTabRow, { backgroundColor: t.surfaceMuted }]}>
              {(['kWh', 'spent'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[s.chartTab, chartTab === tab && { backgroundColor: t.accent }]}
                  onPress={() => setChartTab(tab)}
                >
                  <Text style={[s.chartTabText, { color: chartTab === tab ? '#fff' : t.textSecondary }]}>
                    {tab === 'kWh' ? 'Energy' : 'Spending'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {chartMax > 0 ? (
            <BarChart
              data={chartData}
              barWidth={26}
              spacing={16}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: t.textTertiary, fontSize: 10, fontFamily: F.medium }}
              xAxisLabelTextStyle={{ color: t.textTertiary, fontSize: 10, fontFamily: F.medium }}
              noOfSections={4}
              maxValue={chartMax * 1.25}
              width={SCREEN_WIDTH - 80}
              height={130}
              barBorderRadius={6}
              isAnimated
              animationDuration={700}
              labelWidth={30}
              renderTooltip={(item: any) => (
                <View style={[s.tooltip, { backgroundColor: t.accent }]}>
                  <Text style={s.tooltipText}>
                    {chartTab === 'kWh' ? `${item.value} kWh` : `₱${item.value}`}
                  </Text>
                </View>
              )}
            />
          ) : (
            <View style={s.chartEmpty}>
              <Text style={[{ color: t.textTertiary, fontFamily: F.regular, fontSize: 13 }]}>No data yet</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  function renderItem({ item }: { item: Session }) {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.FAILED;
    const co2 = item.energyKwh ? co2SavedKg(item.energyKwh) : 0;
    return (
      <View style={[s.card, { backgroundColor: t.surface }, Shadow.sm]}>
        {/* Card header */}
        <View style={s.cardHeader}>
          <View style={[s.cardIcon, { backgroundColor: t.accentSoft }]}>
            <Ionicons name="flash" size={17} color={t.accent} />
          </View>
          <View style={s.cardTitleBlock}>
            <Text style={[s.stationName, { color: t.text }]} numberOfLines={1}>{item.station.name}</Text>
            <Text style={[s.stationCity, { color: t.textTertiary }]}>{item.station.city} · {fmtDate(item.createdAt)}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={[s.divider, { backgroundColor: t.separator }]} />

        {/* Metrics row */}
        <View style={s.metricsRow}>
          {[
            { icon: 'flash-outline',  value: item.energyKwh != null ? `${item.energyKwh.toFixed(2)} kWh` : '—', color: t.text  },
            { icon: 'time-outline',   value: fmtDuration(item.durationMinutes),                                   color: t.text  },
            { icon: 'card-outline',   value: item.totalAmount != null ? `₱${Number(item.totalAmount).toFixed(2)}` : '—', color: t.text },
            { icon: 'leaf-outline',   value: co2 > 0 ? `-${co2} kg` : '—',                                       color: '#16A34A' },
          ].map((m, i, arr) => (
            <View key={i} style={{ flexDirection: 'row', flex: 1 }}>
              <View style={s.metric}>
                <Ionicons name={m.icon as any} size={13} color={m.color === t.text ? t.textTertiary : m.color} />
                <Text style={[s.metricValue, { color: m.color }]}>{m.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={[s.metricDiv, { backgroundColor: t.separator }]} />}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={s.cardFooter}>
          <Text style={[s.portInfo, { color: t.textTertiary }]}>
            {SPEED_LABELS[item.port.chargingSpeed] ?? item.port.chargingSpeed} · {item.port.maxKw} kW · {item.port.connectorType}
          </Text>
          {item.vehicle && (
            <Text style={[s.vehicleInfo, { color: t.textTertiary }]}>
              {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: t.background }]}>
      <FlatList
        data={sessions}
        keyExtractor={s => s.id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSessions(true)} tintColor={t.accent} />}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <View style={[s.emptyIcon, { backgroundColor: t.surfaceMuted }]}>
              <Ionicons name="battery-charging-outline" size={44} color={t.textTertiary} />
            </View>
            <Text style={[s.emptyTitle, { color: t.text }]}>No sessions yet</Text>
            <Text style={[s.emptySubtitle, { color: t.textSecondary }]}>
              Your charging history will appear here after your first session.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: Spacing.lg, paddingBottom: 40, flexGrow: 1 },

  headerBlock: { marginBottom: Spacing.md },

  // Summary
  summaryCard:  { borderRadius: Radius.lg, padding: Spacing.xl, marginBottom: Spacing.sm },
  summaryEyebrow: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontFamily: F.extraBold, letterSpacing: 1.2, marginBottom: Spacing.lg },
  summaryStats: { flexDirection: 'row', alignItems: 'center' },
  summaryStat:  { flex: 1, alignItems: 'center' },
  summaryValue: { color: '#fff', fontSize: 16, fontFamily: F.extraBold, letterSpacing: -0.3 },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: F.medium, marginTop: 3 },
  summaryDiv:   { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },

  // CO₂ strip
  co2Strip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm,
  },
  co2Title:    { color: '#fff', fontSize: 13, fontFamily: F.bold },
  co2Sub:      { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontFamily: F.regular, marginTop: 2 },
  co2Badge:    { borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  co2BadgeText:{ color: '#fff', fontSize: 12, fontFamily: F.semiBold },

  // Chart
  chartCard:    { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  chartHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  chartTitle:   { fontSize: 15, fontFamily: F.bold, letterSpacing: -0.2 },
  chartTabRow:  { flexDirection: 'row', borderRadius: Radius.md, padding: 3 },
  chartTab:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.sm - 2 },
  chartTabText: { fontSize: 12, fontFamily: F.semiBold },
  chartEmpty:   { height: 130, alignItems: 'center', justifyContent: 'center' },
  tooltip:      { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  tooltipText:  { color: '#fff', fontSize: 10, fontFamily: F.bold },

  // Session card
  card: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  cardIcon:      { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  cardTitleBlock:{ flex: 1, marginRight: Spacing.sm },
  stationName:   { fontSize: 14, fontFamily: F.semiBold, letterSpacing: -0.1 },
  stationCity:   { fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  statusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  statusText:    { fontSize: 11, fontFamily: F.semiBold },
  divider:       { height: 1, marginBottom: Spacing.md },

  metricsRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  metric:        { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricValue:   { fontSize: 12, fontFamily: F.semiBold },
  metricDiv:     { width: 1, height: 14, marginHorizontal: 2 },

  cardFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portInfo:      { fontSize: 11, fontFamily: F.regular },
  vehicleInfo:   { fontSize: 11, fontFamily: F.regular },

  // Empty
  emptyState:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIcon:     { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  emptyTitle:    { fontSize: 18, fontFamily: F.bold },
  emptySubtitle: { fontSize: 14, fontFamily: F.regular, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
});

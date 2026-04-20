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

const W = Dimensions.get('window').width;

const STATUS: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  COMPLETED: { color: '#027A48', bg: '#ECFDF3', icon: 'checkmark-circle', label: 'Completed' },
  CHARGING:  { color: '#1570EF', bg: '#EFF8FF', icon: 'flash',            label: 'Charging'  },
  INITIATED: { color: '#B54708', bg: '#FFFAEB', icon: 'time',             label: 'Initiated' },
  CANCELLED: { color: '#667085', bg: '#F2F4F7', icon: 'close-circle',     label: 'Cancelled' },
  FAILED:    { color: '#B42318', bg: '#FEF3F2', icon: 'alert-circle',     label: 'Failed'    },
};
const SPEED: Record<string, string> = { LEVEL1: 'Level 1', LEVEL2: 'Level 2', DCFC: 'DC Fast' };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Session {
  id: string; status: string; startedAt?: string; endedAt?: string;
  energyKwh?: number; durationMinutes?: number; totalAmount?: number;
  currency: string; paymentStatus: string; createdAt: string;
  station: { name: string; city: string; address: string };
  port: { connectorType: string; chargingSpeed: string; maxKw: number };
  vehicle?: { make: string; model: string; year: number };
}

function buildChart(sessions: Session[], field: 'kWh' | 'spent', accent: string) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const m = d.getMonth(), y = d.getFullYear();
    const ms = sessions.filter(s => {
      const sd = new Date(s.createdAt);
      return sd.getMonth() === m && sd.getFullYear() === y && s.status === 'COMPLETED';
    });
    const value = field === 'kWh'
      ? parseFloat(ms.reduce((a, s) => a + (s.energyKwh ?? 0), 0).toFixed(1))
      : parseFloat(ms.reduce((a, s) => a + Number(s.totalAmount ?? 0), 0).toFixed(0));
    return { value, label: MONTHS[m], frontColor: i === 5 ? accent : accent + '55' };
  });
}

function fmtDur(mins?: number) {
  if (!mins) return '—';
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
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
      setLoading(false); setRefreshing(false);
    }
  }

  const completed  = sessions.filter(s => s.status === 'COMPLETED');
  const totalKwh   = completed.reduce((a, s) => a + (s.energyKwh ?? 0), 0);
  const totalSpent = completed.reduce((a, s) => a + Number(s.totalAmount ?? 0), 0);
  const totalMins  = completed.reduce((a, s) => a + (s.durationMinutes ?? 0), 0);
  const totalCo2   = co2SavedKg(totalKwh);

  const chartData = buildChart(sessions, chartTab, t.accent);
  const chartMax  = Math.max(...chartData.map(d => d.value), 1);

  function Header() {
    if (!sessions.length) return null;
    return (
      <View style={hd.wrap}>
        {/* Summary */}
        <View style={[hd.summary, { backgroundColor: t.headerBg }]}>
          <Text style={hd.eyebrow}>CHARGING SUMMARY</Text>
          <View style={hd.row}>
            {[
              { v: String(completed.length),       l: 'Sessions' },
              { v: `${totalKwh.toFixed(1)}`,       l: 'kWh'      },
              { v: `₱${totalSpent.toFixed(0)}`,   l: 'Spent'    },
              { v: fmtDur(totalMins),              l: 'Time'     },
            ].map((item, i, arr) => (
              <View key={item.l} style={{ flexDirection: 'row', flex: 1 }}>
                <View style={hd.stat}>
                  <Text style={hd.statV}>{item.v}</Text>
                  <Text style={hd.statL}>{item.l}</Text>
                </View>
                {i < arr.length - 1 && <View style={hd.div} />}
              </View>
            ))}
          </View>
        </View>

        {/* CO₂ strip */}
        <View style={[hd.co2, { backgroundColor: '#022C22', borderColor: '#065F46' }]}>
          <Text style={{ fontSize: 20 }}>🌱</Text>
          <View style={{ flex: 1 }}>
            <Text style={hd.co2Title}>Saved {formatCo2(totalCo2)} of CO₂</Text>
            <Text style={hd.co2Sub}>vs. driving an equivalent petrol car</Text>
          </View>
          <View style={hd.co2Badge}>
            <Text style={hd.co2BadgeText}>{totalKwh.toFixed(1)} kWh</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={[hd.chart, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={hd.chartTop}>
            <Text style={[hd.chartTitle, { color: t.text }]}>Monthly Analytics</Text>
            <View style={[hd.tabs, { backgroundColor: t.surfaceMuted }]}>
              {(['kWh', 'spent'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[hd.tab, chartTab === tab && { backgroundColor: t.accent }]}
                  onPress={() => setChartTab(tab)}
                >
                  <Text style={[hd.tabText, { color: chartTab === tab ? '#fff' : t.textSecondary }]}>
                    {tab === 'kWh' ? 'Energy' : 'Spending'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {chartMax > 0 ? (
            <BarChart
              data={chartData}
              barWidth={24}
              spacing={14}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: t.textTertiary, fontSize: 10, fontFamily: F.regular }}
              xAxisLabelTextStyle={{ color: t.textTertiary, fontSize: 10, fontFamily: F.regular }}
              noOfSections={4}
              maxValue={chartMax * 1.25}
              width={W - 80}
              height={120}
              barBorderRadius={4}
              isAnimated
              animationDuration={600}
              labelWidth={28}
              renderTooltip={(item: any) => (
                <View style={[hd.tip, { backgroundColor: t.text }]}>
                  <Text style={[hd.tipText, { color: t.surface }]}>
                    {chartTab === 'kWh' ? `${item.value} kWh` : `₱${item.value}`}
                  </Text>
                </View>
              )}
            />
          ) : (
            <View style={hd.chartEmpty}>
              <Text style={[{ color: t.textTertiary, fontFamily: F.regular, fontSize: 13 }]}>No data yet</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  function renderItem({ item }: { item: Session }) {
    const cfg = STATUS[item.status] ?? STATUS.FAILED;
    const co2 = item.energyKwh ? co2SavedKg(item.energyKwh) : 0;
    return (
      <View style={[cd.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        {/* Header */}
        <View style={cd.top}>
          <View style={[cd.icon, { backgroundColor: t.accentSoft }]}>
            <Ionicons name="flash" size={16} color={t.accent} />
          </View>
          <View style={cd.titleBlock}>
            <Text style={[cd.name, { color: t.text }]} numberOfLines={1}>{item.station.name}</Text>
            <Text style={[cd.city, { color: t.textTertiary }]}>{item.station.city} · {fmtDate(item.createdAt)}</Text>
          </View>
          <View style={[cd.badge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={11} color={cfg.color} />
            <Text style={[cd.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={[cd.sep, { backgroundColor: t.separator }]} />

        {/* Metrics */}
        <View style={cd.metrics}>
          {[
            { icon: 'flash-outline' as const,  v: item.energyKwh != null ? `${item.energyKwh.toFixed(2)} kWh` : '—', c: t.text     },
            { icon: 'time-outline'  as const,  v: fmtDur(item.durationMinutes),                                       c: t.text     },
            { icon: 'card-outline'  as const,  v: item.totalAmount != null ? `₱${Number(item.totalAmount).toFixed(2)}` : '—', c: t.text },
            { icon: 'leaf-outline'  as const,  v: co2 > 0 ? `−${co2} kg` : '—',                                      c: '#027A48'  },
          ].map((m, i, arr) => (
            <View key={i} style={{ flexDirection: 'row', flex: 1 }}>
              <View style={cd.metric}>
                <Ionicons name={m.icon} size={12} color={m.c === t.text ? t.textTertiary : m.c} />
                <Text style={[cd.metricV, { color: m.c }]}>{m.v}</Text>
              </View>
              {i < arr.length - 1 && <View style={[cd.metricSep, { backgroundColor: t.separator }]} />}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={cd.footer}>
          <Text style={[cd.portInfo, { color: t.textTertiary }]}>
            {SPEED[item.port.chargingSpeed] ?? item.port.chargingSpeed} · {item.port.maxKw} kW · {item.port.connectorType}
          </Text>
          {item.vehicle && (
            <Text style={[cd.portInfo, { color: t.textTertiary }]}>
              {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[g.center, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  return (
    <View style={[g.flex, { backgroundColor: t.background }]}>
      <FlatList
        data={sessions}
        keyExtractor={s => s.id}
        renderItem={renderItem}
        contentContainerStyle={g.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSessions(true)} tintColor={t.accent} />}
        ListHeaderComponent={<Header />}
        ListEmptyComponent={
          <View style={g.empty}>
            <View style={[g.emptyIcon, { backgroundColor: t.surfaceMuted }]}>
              <Ionicons name="battery-charging-outline" size={40} color={t.textTertiary} />
            </View>
            <Text style={[g.emptyTitle, { color: t.text }]}>No sessions yet</Text>
            <Text style={[g.emptySub, { color: t.textSecondary }]}>
              Your charging history will appear here after your first session.
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ── Global ─────────────────────────────────────────────────────────────────────
const g = StyleSheet.create({
  flex:      { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.sm, flexGrow: 1 },
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 72, gap: Spacing.sm },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  emptyTitle:{ fontSize: 17, fontFamily: F.semiBold },
  emptySub:  { fontSize: 14, fontFamily: F.regular, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
});

// ── Header styles ──────────────────────────────────────────────────────────────
const hd = StyleSheet.create({
  wrap:  { gap: Spacing.sm, marginBottom: Spacing.sm },

  summary:  { borderRadius: Radius.md, padding: Spacing.xl },
  eyebrow:  { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: F.extraBold, letterSpacing: 1.2, marginBottom: Spacing.lg },
  row:      { flexDirection: 'row' },
  stat:     { flex: 1, alignItems: 'center' },
  statV:    { color: '#fff', fontSize: 15, fontFamily: F.bold, letterSpacing: -0.2 },
  statL:    { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: F.regular, marginTop: 3 },
  div:      { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.12)' },

  co2:      { borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  co2Title: { color: '#fff', fontSize: 13, fontFamily: F.semiBold },
  co2Sub:   { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: F.regular, marginTop: 2 },
  co2Badge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.xs, paddingHorizontal: 8, paddingVertical: 4 },
  co2BadgeText: { color: '#fff', fontSize: 11, fontFamily: F.semiBold },

  chart:      { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.lg },
  chartTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  chartTitle: { fontSize: 14, fontFamily: F.semiBold },
  tabs:       { flexDirection: 'row', borderRadius: Radius.sm, padding: 3 },
  tab:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.xs },
  tabText:    { fontSize: 12, fontFamily: F.semiBold },
  chartEmpty: { height: 120, alignItems: 'center', justifyContent: 'center' },
  tip:        { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, marginBottom: 4 },
  tipText:    { fontSize: 10, fontFamily: F.semiBold },
});

// ── Card styles ────────────────────────────────────────────────────────────────
const cd = StyleSheet.create({
  card:      { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  top:       { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  icon:      { width: 36, height: 36, borderRadius: Radius.xs, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  titleBlock:{ flex: 1, marginRight: Spacing.sm },
  name:      { fontSize: 14, fontFamily: F.semiBold },
  city:      { fontSize: 11, fontFamily: F.regular, marginTop: 2 },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: Radius.xs },
  badgeText: { fontSize: 11, fontFamily: F.semiBold },
  sep:       { height: 1, marginBottom: Spacing.md },
  metrics:   { flexDirection: 'row', marginBottom: Spacing.md },
  metric:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricV:   { fontSize: 12, fontFamily: F.semiBold },
  metricSep: { width: 1, height: 12, marginHorizontal: 2 },
  footer:    { flexDirection: 'row', justifyContent: 'space-between' },
  portInfo:  { fontSize: 11, fontFamily: F.regular },
});

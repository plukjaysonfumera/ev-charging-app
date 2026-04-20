import { API_URL } from '../lib/config';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Share,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { useTheme, F, Shadow, Spacing, Radius } from '../theme';
import { co2SavedKg, treesEquivalent, litersGasSaved, formatCo2, formatEta } from '../lib/eco';
import { NearbyCardSkeleton } from '../components/Skeleton';

interface ActiveSession {
  id: string; startedAt: string; status: string;
  station: { name: string; city: string; address: string };
  port: { connectorType: string; chargingSpeed: string; maxKw: number; pricePerKwh: string };
}
interface NearbyStation {
  id: string; name: string; address: string; city: string;
  has_available: boolean; port_count: number; average_rating: number;
  distance_meters: number; connector_types: string[];
  latitude: number; longitude: number;
}
interface Stats { sessions: number; totalKwh: number; totalSpent: number; }
interface RecentSession {
  id: string; startedAt: string; energyKwh: number;
  totalAmount: number; durationMinutes: number;
  station: { name: string; city: string };
  port: { chargingSpeed: string };
}

const SPEED_LABELS: Record<string, string> = { LEVEL1: 'L1', LEVEL2: 'L2', DCFC: 'DC Fast' };
function fmtDist(m: number) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`; }
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function fmtElapsed(secs: number) {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function HomeScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const nav = useNavigation<any>();

  const [activeSession,  setActiveSession]  = useState<ActiveSession | null>(null);
  const [nearbyStation,  setNearbyStation]  = useState<NearbyStation | null>(null);
  const [stats,          setStats]          = useState<Stats | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loadingNearby,  setLoadingNearby]  = useState(true);
  const [elapsed,        setElapsed]        = useState(0);
  const [hasLocation,    setHasLocation]    = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (activeSession) {
      const start = new Date(activeSession.startedAt).getTime();
      const tick  = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSession?.id]);

  useFocusEffect(useCallback(() => { load(); }, [user?.uid]));

  async function load() {
    if (!user) return;
    try {
      const res  = await fetch(`${API_URL}/api/v1/sessions?firebaseUid=${user.uid}`);
      const json = await res.json();
      const all: any[] = json.data ?? [];
      const active    = all.find(s => s.status === 'CHARGING' || s.status === 'INITIATED');
      const completed = all.filter(s => s.status === 'COMPLETED');
      setActiveSession(active ?? null);
      setStats({
        sessions:   completed.length,
        totalKwh:   parseFloat(completed.reduce((a: number, s: any) => a + (s.energyKwh ?? 0), 0).toFixed(2)),
        totalSpent: parseFloat(completed.reduce((a: number, s: any) => a + Number(s.totalAmount ?? 0), 0).toFixed(2)),
      });
      setRecentSessions(completed.slice(0, 3));
    } catch { /* silent */ }
    loadNearby();
  }

  async function loadNearby() {
    setLoadingNearby(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setHasLocation(true);
        const res  = await fetch(`${API_URL}/api/v1/stations?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}&radius=20`);
        const json = await res.json();
        const list: NearbyStation[] = json.data ?? [];
        setNearbyStation(list.find(s => s.has_available) ?? list[0] ?? null);
      } else {
        const res  = await fetch(`${API_URL}/api/v1/stations`);
        const json = await res.json();
        setNearbyStation((json.data ?? [])[0] ?? null);
      }
    } catch { /* silent */ } finally { setLoadingNearby(false); }
  }

  async function shareStation(station: NearbyStation) {
    try {
      await Share.share({
        message: `⚡ ${station.name}\n📍 ${station.address}, ${station.city}\n\nFound on PHEV PH.`,
      });
    } catch { /* silent */ }
  }

  const firstName  = (user?.displayName ?? 'Driver').split(' ')[0];
  const initials   = (user?.displayName ?? 'EV').split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase();
  const activeKwh  = activeSession
    ? parseFloat(((Number(activeSession.port.maxKw) * 0.8 * elapsed) / 3600).toFixed(2)) : 0;
  const activeCost = activeSession
    ? parseFloat((activeKwh * Number(activeSession.port.pricePerKwh)).toFixed(2)) : 0;

  const co2    = stats ? co2SavedKg(stats.totalKwh) : 0;
  const trees  = treesEquivalent(co2);
  const liters = stats ? litersGasSaved(stats.totalKwh) : 0;

  return (
    <ScrollView
      style={[s.page, { backgroundColor: t.background }]}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[s.header, { backgroundColor: t.headerBg }]}>
        <View>
          <Text style={s.headerGreeting}>{greeting()}</Text>
          <Text style={s.headerName}>{firstName} ⚡</Text>
        </View>
        <TouchableOpacity onPress={() => nav.navigate('Profile')} style={[s.avatar, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
          <Text style={s.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.body}>

        {/* ── Active Session ─────────────────────────────────────────────── */}
        {activeSession ? (
          <TouchableOpacity
            style={[s.sessionBanner, { backgroundColor: t.accent }, Shadow.md]}
            onPress={() => nav.navigate('ChargingSession', { session: activeSession })}
            activeOpacity={0.88}
          >
            <View style={s.sessionLive}>
              <Animated.View style={[s.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={s.liveLabel}>LIVE · CHARGING</Text>
            </View>
            <View style={s.sessionRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.sessionStation} numberOfLines={1}>{activeSession.station.name}</Text>
                <Text style={s.sessionCity}>{activeSession.station.city}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.sessionTimer}>{fmtElapsed(elapsed)}</Text>
                <Text style={s.sessionMeta}>{activeKwh} kWh · ₱{activeCost.toFixed(2)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.6)" style={{ marginLeft: 6 }} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[s.noSession, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[s.noSessionIcon, { backgroundColor: t.accentSoft }]}>
              <Ionicons name="flash-outline" size={18} color={t.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.noSessionTitle, { color: t.text }]}>No active session</Text>
              <Text style={[s.noSessionSub, { color: t.textSecondary }]}>Find a station to start charging</Text>
            </View>
            <TouchableOpacity style={[s.findBtn, { backgroundColor: t.accent }]} onPress={() => nav.navigate('Map')}>
              <Text style={s.findBtnText}>Find</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        {stats && stats.sessions > 0 && (
          <View style={[s.statsCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            {[
              { label: 'Sessions',  value: String(stats.sessions),            color: t.text    },
              { label: 'kWh',       value: stats.totalKwh.toFixed(1),         color: t.text    },
              { label: 'Spent',     value: `₱${stats.totalSpent.toFixed(0)}`, color: t.text    },
              { label: 'CO₂ Saved', value: formatCo2(co2),                    color: '#027A48' },
            ].map((item, i, arr) => (
              <View key={item.label} style={{ flexDirection: 'row', flex: 1 }}>
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={[s.statLabel, { color: t.textTertiary }]}>{item.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={[s.statDivider, { backgroundColor: t.border }]} />}
              </View>
            ))}
          </View>
        )}

        {/* ── Eco Impact ─────────────────────────────────────────────────── */}
        {stats && stats.totalKwh > 0 && (
          <View style={[s.ecoCard, { backgroundColor: '#022C22', borderColor: '#065F46' }]}>
            <View style={s.ecoHeader}>
              <View style={s.ecoIconWrap}>
                <Text style={{ fontSize: 18 }}>🌱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.ecoTitle}>Your Eco Impact</Text>
                <Text style={s.ecoSub}>Every kWh charged makes a difference</Text>
              </View>
            </View>
            <View style={[s.ecoDivider, { backgroundColor: '#065F46' }]} />
            <View style={s.ecoStats}>
              {[
                { value: formatCo2(co2),                    label: 'CO₂ Saved'  },
                { value: `${liters} L`,                     label: 'Gas Avoided' },
                { value: trees > 0 ? `${trees} 🌳` : '< 1', label: 'Trees Equiv.' },
              ].map((item, i, arr) => (
                <View key={item.label} style={{ flexDirection: 'row', flex: 1 }}>
                  <View style={s.ecoStat}>
                    <Text style={s.ecoStatValue}>{item.value}</Text>
                    <Text style={s.ecoStatLabel}>{item.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={[s.ecoStatDiv, { backgroundColor: '#065F46' }]} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Nearest Station ────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: t.textTertiary }]}>NEAREST STATION</Text>
          {loadingNearby ? (
            <View style={[s.nearbyCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <NearbyCardSkeleton />
            </View>
          ) : nearbyStation ? (
            <TouchableOpacity
              style={[s.nearbyCard, { backgroundColor: t.surface, borderColor: t.border }]}
              onPress={() => nav.navigate('StationDetail', { stationId: nearbyStation.id })}
              activeOpacity={0.8}
            >
              {/* Left colored strip */}
              <View style={[s.nearbyStrip, { backgroundColor: nearbyStation.has_available ? '#027A48' : t.textTertiary }]} />

              <View style={[s.nearbyIcon, { backgroundColor: nearbyStation.has_available ? '#ECFDF3' : t.surfaceMuted }]}>
                <Ionicons name="flash" size={20} color={nearbyStation.has_available ? '#027A48' : t.textTertiary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[s.nearbyName, { color: t.text }]} numberOfLines={1}>{nearbyStation.name}</Text>
                <Text style={[s.nearbyAddress, { color: t.textSecondary }]} numberOfLines={1}>{nearbyStation.address}</Text>
                <View style={s.nearbyMeta}>
                  <View style={[s.availBadge, { backgroundColor: nearbyStation.has_available ? '#ECFDF3' : t.surfaceMuted }]}>
                    <View style={[s.availDot, { backgroundColor: nearbyStation.has_available ? '#027A48' : '#9CA3AF' }]} />
                    <Text style={[s.availText, { color: nearbyStation.has_available ? '#027A48' : t.textTertiary }]}>
                      {nearbyStation.has_available ? 'Available' : 'Occupied'}
                    </Text>
                  </View>
                  <Text style={[s.metaPill, { color: t.textTertiary }]}>{nearbyStation.port_count} ports</Text>
                  {nearbyStation.distance_meters != null && (
                    <Text style={[s.metaPill, { color: t.textTertiary }]}>{fmtDist(nearbyStation.distance_meters)}</Text>
                  )}
                  {hasLocation && nearbyStation.distance_meters != null && (
                    <View style={[s.etaBadge, { backgroundColor: t.accentSoft }]}>
                      <Text style={[s.etaText, { color: t.accent }]}>🚗 {formatEta(nearbyStation.distance_meters)}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={s.nearbyActions}>
                <TouchableOpacity hitSlop={8} onPress={() => shareStation(nearbyStation)}>
                  <Ionicons name="share-outline" size={16} color={t.textTertiary} />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color={t.textTertiary} />
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={[s.emptyText, { color: t.textSecondary }]}>No stations found nearby.</Text>
          )}
        </View>

        {/* ── Quick Actions ──────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: t.textTertiary }]}>QUICK ACCESS</Text>
          <View style={s.quickRow}>
            {([
              { label: 'Map View',  icon: 'map-outline',  screen: 'Map',      primary: true  },
              { label: 'Stations',  icon: 'flash-outline', screen: 'Stations', primary: false },
              { label: 'History',   icon: 'time-outline',  screen: 'History',  primary: false },
            ] as const).map(({ label, icon, screen, primary }) => (
              <TouchableOpacity
                key={label}
                style={[
                  s.quickCard,
                  primary
                    ? { backgroundColor: t.accent, borderColor: t.accent }
                    : { backgroundColor: t.surface, borderColor: t.border },
                ]}
                onPress={() => nav.navigate(screen)}
                activeOpacity={0.8}
              >
                <Ionicons name={icon} size={20} color={primary ? '#fff' : t.accent} />
                <Text style={[s.quickLabel, { color: primary ? '#fff' : t.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Recent Charges ─────────────────────────────────────────────── */}
        {recentSessions.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={[s.sectionLabel, { color: t.textTertiary }]}>RECENT CHARGES</Text>
              <TouchableOpacity onPress={() => nav.navigate('History')}>
                <Text style={[s.seeAll, { color: t.accent }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={[s.recentList, { backgroundColor: t.surface, borderColor: t.border }]}>
              {recentSessions.map((sess, i) => (
                <View key={sess.id}>
                  <View style={s.recentRow}>
                    <View style={[s.recentIcon, { backgroundColor: t.accentSoft }]}>
                      <Ionicons name="flash" size={14} color={t.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.recentName, { color: t.text }]} numberOfLines={1}>{sess.station.name}</Text>
                      <Text style={[s.recentCity, { color: t.textSecondary }]}>
                        {sess.station.city} · {SPEED_LABELS[sess.port?.chargingSpeed] ?? sess.port?.chargingSpeed}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.recentKwh, { color: t.text }]}>{(sess.energyKwh ?? 0).toFixed(2)} kWh</Text>
                      <Text style={s.recentCo2}>−{co2SavedKg(sess.energyKwh ?? 0)} kg CO₂</Text>
                    </View>
                  </View>
                  {i < recentSessions.length - 1 && (
                    <View style={[s.recentDivider, { backgroundColor: t.separator }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

      </View>
      <View style={{ height: Spacing.xxxl }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page:    { flex: 1 },
  content: { paddingBottom: 16 },
  body:    { padding: Spacing.lg, gap: Spacing.md },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.xl,
  },
  headerGreeting: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: F.regular },
  headerName:     { color: '#fff', fontSize: 26, fontFamily: F.bold, marginTop: 2, letterSpacing: -0.5 },
  avatar:         { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { color: '#fff', fontSize: 14, fontFamily: F.bold },

  // Active session
  sessionBanner: { borderRadius: Radius.md, padding: Spacing.lg },
  sessionLive:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: Spacing.sm },
  liveDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveLabel:     { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontFamily: F.extraBold, letterSpacing: 1 },
  sessionRow:    { flexDirection: 'row', alignItems: 'center' },
  sessionStation:{ color: '#fff', fontSize: 15, fontFamily: F.semiBold, flex: 1 },
  sessionCity:   { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  sessionTimer:  { color: '#fff', fontSize: 20, fontFamily: F.bold, fontVariant: ['tabular-nums'] },
  sessionMeta:   { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: F.medium, marginTop: 2 },

  // No session
  noSession: {
    borderRadius: Radius.md, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md,
  },
  noSessionIcon:  { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  noSessionTitle: { fontSize: 14, fontFamily: F.semiBold },
  noSessionSub:   { fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  findBtn:        { borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 7 },
  findBtnText:    { color: '#fff', fontFamily: F.semiBold, fontSize: 13 },

  // Stats
  statsCard: {
    borderRadius: Radius.md, borderWidth: 1,
    flexDirection: 'row', padding: Spacing.lg,
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 16, fontFamily: F.bold, letterSpacing: -0.2 },
  statLabel:   { fontSize: 11, fontFamily: F.regular, marginTop: 3 },
  statDivider: { width: 1, marginVertical: 4 },

  // Eco
  ecoCard: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.lg },
  ecoHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  ecoIconWrap: {
    width: 36, height: 36, borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  ecoTitle:     { color: '#fff', fontSize: 14, fontFamily: F.semiBold },
  ecoSub:       { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  ecoDivider:   { height: 1, marginBottom: Spacing.md },
  ecoStats:     { flexDirection: 'row' },
  ecoStat:      { flex: 1, alignItems: 'center' },
  ecoStatValue: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  ecoStatLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: F.regular, marginTop: 3 },
  ecoStatDiv:   { width: 1, marginVertical: 4 },

  // Section
  section:     { gap: Spacing.sm },
  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel:{ fontSize: 11, fontFamily: F.extraBold, letterSpacing: 0.8 },
  seeAll:      { fontSize: 13, fontFamily: F.semiBold },

  // Nearby
  nearbyCard: {
    borderRadius: Radius.md, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: Spacing.md, overflow: 'hidden',
  },
  nearbyStrip:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  nearbyIcon:    { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  nearbyName:    { fontSize: 14, fontFamily: F.semiBold },
  nearbyAddress: { fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  nearbyMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' },
  availBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.xs, paddingHorizontal: 6, paddingVertical: 3 },
  availDot:      { width: 5, height: 5, borderRadius: 2.5 },
  availText:     { fontSize: 11, fontFamily: F.semiBold },
  metaPill:      { fontSize: 12, fontFamily: F.regular },
  etaBadge:      { borderRadius: Radius.xs, paddingHorizontal: 6, paddingVertical: 3 },
  etaText:       { fontSize: 11, fontFamily: F.semiBold },
  nearbyActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyText:     { fontSize: 14, fontFamily: F.regular },

  // Quick
  quickRow:  { flexDirection: 'row', gap: Spacing.sm },
  quickCard: {
    flex: 1, borderRadius: Radius.md, borderWidth: 1,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md,
    alignItems: 'center', gap: 6,
  },
  quickLabel: { fontSize: 12, fontFamily: F.semiBold },

  // Recent
  recentList:    { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  recentRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  recentDivider: { height: 1 },
  recentIcon:    { width: 32, height: 32, borderRadius: Radius.xs, alignItems: 'center', justifyContent: 'center' },
  recentName:    { fontSize: 13, fontFamily: F.semiBold },
  recentCity:    { fontSize: 11, fontFamily: F.regular, marginTop: 2 },
  recentKwh:     { fontSize: 13, fontFamily: F.semiBold },
  recentCo2:     { fontSize: 11, fontFamily: F.medium, color: '#027A48', marginTop: 2 },
});

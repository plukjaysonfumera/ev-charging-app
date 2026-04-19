import { API_URL } from '../lib/config';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Easing, Share,
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

function formatDistance(m: number) { return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)} km`; }
function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function formatElapsed(secs: number) {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function HomeScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [activeSession,  setActiveSession]  = useState<ActiveSession | null>(null);
  const [nearbyStation,  setNearbyStation]  = useState<NearbyStation | null>(null);
  const [stats,          setStats]          = useState<Stats | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loadingNearby,  setLoadingNearby]  = useState(true);
  const [elapsed,        setElapsed]        = useState(0);
  const [hasLocation,    setHasLocation]    = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ecoAnim   = useRef(new Animated.Value(0)).current;
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    Animated.spring(ecoAnim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 9 }).start();
  }, [stats?.totalKwh]);

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

  useFocusEffect(useCallback(() => { loadData(); }, [user?.uid]));

  async function loadData() {
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
        totalKwh:   parseFloat(completed.reduce((sum: number, s: any) => sum + (s.energyKwh ?? 0), 0).toFixed(2)),
        totalSpent: parseFloat(completed.reduce((sum: number, s: any) => sum + Number(s.totalAmount ?? 0), 0).toFixed(2)),
      });
      setRecentSessions(completed.slice(0, 3));
    } catch { /* silent */ }
    loadNearbyStation();
  }

  async function loadNearbyStation() {
    setLoadingNearby(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setHasLocation(true);
        const res  = await fetch(`${API_URL}/api/v1/stations?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}&radius=20`);
        const json = await res.json();
        const stations: NearbyStation[] = json.data ?? [];
        setNearbyStation(stations.find(s => s.has_available) ?? stations[0] ?? null);
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
        message: `⚡ ${station.name}\n📍 ${station.address}, ${station.city}\n\nFind it on PHEV PH.`,
        title: station.name,
      });
    } catch { /* silent */ }
  }

  const firstName  = (user?.displayName ?? 'Driver').split(' ')[0];
  const activeKwh  = activeSession ? parseFloat(((Number(activeSession.port.maxKw) * 0.8 * elapsed) / 3600).toFixed(2)) : 0;
  const activeCost = activeSession ? parseFloat((activeKwh * Number(activeSession.port.pricePerKwh)).toFixed(2)) : 0;
  const co2    = stats ? co2SavedKg(stats.totalKwh) : 0;
  const trees  = treesEquivalent(co2);
  const liters = stats ? litersGasSaved(stats.totalKwh) : 0;

  return (
    <ScrollView
      style={[s.container, { backgroundColor: t.background }]}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={[s.headerBg, { backgroundColor: t.headerBg }]} />
        <View style={s.headerInner}>
          <View>
            <Text style={s.greeting}>{getGreeting()},</Text>
            <Text style={s.userName}>{firstName} ⚡</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={s.avatarBtn}>
            <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.10)']} style={s.avatar}>
              <Text style={s.avatarText}>
                {(user?.displayName ?? 'EV').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Active Session Banner ── */}
      {activeSession ? (
        <TouchableOpacity
          style={[s.activeBanner, { backgroundColor: t.accent }, Shadow.md]}
          onPress={() => navigation.navigate('ChargingSession', { session: activeSession })}
          activeOpacity={0.88}
        >
          <View style={s.activeLiveRow}>
            <Animated.View style={[s.liveDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={s.liveLabel}>LIVE · CHARGING</Text>
          </View>
          <View style={s.activeBannerBody}>
            <View style={{ flex: 1 }}>
              <Text style={s.activeStationName} numberOfLines={1}>{activeSession.station.name}</Text>
              <Text style={s.activeCity}>{activeSession.station.city}</Text>
            </View>
            <View style={s.activeBannerRight}>
              <Text style={s.activeTimer}>{formatElapsed(elapsed)}</Text>
              <Text style={s.activeKwh}>{activeKwh} kWh · ₱{activeCost.toFixed(2)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[s.noSessionCard, { backgroundColor: t.surface, borderColor: t.border }, Shadow.sm]}>
          <View style={[s.noSessionIcon, { backgroundColor: t.accentSoft }]}>
            <Ionicons name="flash-outline" size={22} color={t.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.noSessionTitle, { color: t.text }]}>No active session</Text>
            <Text style={[s.noSessionSub, { color: t.textSecondary }]}>Find a station to start charging</Text>
          </View>
          <TouchableOpacity style={[s.findBtn, { backgroundColor: t.accent }]} onPress={() => navigation.navigate('Map')}>
            <Text style={s.findBtnText}>Find Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Stats Row ── */}
      {stats && stats.sessions > 0 && (
        <View style={[s.statsRow, { backgroundColor: t.surface }, Shadow.sm]}>
          {[
            { value: String(stats.sessions),            label: 'Sessions',  color: t.text },
            { value: `${stats.totalKwh}`,               label: 'kWh',       color: t.text },
            { value: `₱${stats.totalSpent.toFixed(0)}`, label: 'Spent',     color: t.text },
            { value: formatCo2(co2),                    label: 'CO₂ Saved', color: '#16A34A' },
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

      {/* ── Eco Impact Card ── */}
      {stats && stats.totalKwh > 0 && (
        <Animated.View style={[s.ecoWrap, { opacity: ecoAnim, transform: [{ scale: ecoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
          <LinearGradient colors={['#14532D', '#166534', '#15803D']} style={s.ecoCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={s.ecoCircle1} /><View style={s.ecoCircle2} />
            <View style={s.ecoTop}>
              <View style={s.ecoIconBox}><Text style={{ fontSize: 20 }}>🌱</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.ecoTitle}>Your Eco Impact</Text>
                <Text style={s.ecoSub}>Every kWh makes a difference</Text>
              </View>
            </View>
            <View style={s.ecoStats}>
              {[
                { value: formatCo2(co2),            label: 'CO₂ Saved'  },
                { value: `${liters}L`,              label: 'Gas Avoided' },
                { value: trees > 0 ? `${trees} 🌳` : '< 1', label: 'Trees Equiv.' },
              ].map((item, i, arr) => (
                <View key={item.label} style={{ flexDirection: 'row', flex: 1 }}>
                  <View style={s.ecoStat}>
                    <Text style={s.ecoStatValue}>{item.value}</Text>
                    <Text style={s.ecoStatLabel}>{item.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={s.ecoStatDiv} />}
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* ── Nearest Station ── */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: t.text }]}>
          {nearbyStation?.has_available ? '⚡ Nearest Available' : '📍 Nearest Station'}
        </Text>
        {loadingNearby ? (
          <View style={[s.nearbyCard, { backgroundColor: t.surface }, Shadow.sm]}>
            <NearbyCardSkeleton />
          </View>
        ) : nearbyStation ? (
          <TouchableOpacity
            style={[s.nearbyCard, { backgroundColor: t.surface }, Shadow.sm]}
            onPress={() => navigation.navigate('StationDetail', { stationId: nearbyStation.id })}
            activeOpacity={0.82}
          >
            {nearbyStation.has_available && <View style={[s.nearbyAccentBar, { backgroundColor: t.accent }]} />}
            <View style={[s.nearbyIconBox, { backgroundColor: nearbyStation.has_available ? t.accentSoft : t.surfaceMuted }]}>
              <Ionicons name="flash" size={22} color={nearbyStation.has_available ? t.accent : t.textTertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.nearbyName, { color: t.text }]} numberOfLines={1}>{nearbyStation.name}</Text>
              <Text style={[s.nearbyAddress, { color: t.textSecondary }]} numberOfLines={1}>{nearbyStation.address}</Text>
              <View style={s.nearbyMeta}>
                <View style={[s.availChip, { backgroundColor: nearbyStation.has_available ? '#DCFCE7' : t.surfaceMuted }]}>
                  <View style={[s.availDot, { backgroundColor: nearbyStation.has_available ? '#16A34A' : '#9CA3AF' }]} />
                  <Text style={[s.availText, { color: nearbyStation.has_available ? '#15803D' : t.textTertiary }]}>
                    {nearbyStation.has_available ? 'Available' : 'Occupied'}
                  </Text>
                </View>
                <Text style={[s.metaChip, { color: t.textTertiary }]}>{nearbyStation.port_count} ports</Text>
                {nearbyStation.distance_meters != null && (
                  <Text style={[s.metaChip, { color: t.textTertiary }]}>{formatDistance(nearbyStation.distance_meters)}</Text>
                )}
                {hasLocation && nearbyStation.distance_meters != null && (
                  <View style={[s.etaChip, { backgroundColor: t.accentSoft, borderColor: t.accent + '30' }]}>
                    <Text style={[s.etaText, { color: t.accent }]}>🚗 {formatEta(nearbyStation.distance_meters)}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={s.nearbyActions}>
              <TouchableOpacity onPress={() => shareStation(nearbyStation)} hitSlop={8} style={s.nearbyActionBtn}>
                <Ionicons name="share-outline" size={17} color={t.textTertiary} />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={17} color={t.textTertiary} />
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={[s.emptyText, { color: t.textSecondary }]}>No stations found nearby.</Text>
        )}
      </View>

      {/* ── Quick Actions ── */}
      <View style={s.quickRow}>
        {[
          { label: 'Map',      icon: 'map-outline',   screen: 'Map',      accent: true  },
          { label: 'Stations', icon: 'flash-outline',  screen: 'Stations', accent: false },
          { label: 'History',  icon: 'time-outline',   screen: 'History',  accent: false },
        ].map(({ label, icon, screen, accent }) => (
          <TouchableOpacity
            key={label}
            style={[s.quickCard, accent ? { backgroundColor: t.accent } : { backgroundColor: t.surface, borderColor: t.border }, Shadow.sm]}
            onPress={() => navigation.navigate(screen)}
            activeOpacity={0.82}
          >
            <Ionicons name={icon as any} size={24} color={accent ? '#fff' : t.accent} />
            <Text style={[s.quickLabel, { color: accent ? '#fff' : t.text }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Recent Sessions ── */}
      {recentSessions.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={[s.sectionTitle, { color: t.text }]}>Recent Charges</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={[s.seeAll, { color: t.accent }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentSessions.map(sess => (
            <View key={sess.id} style={[s.recentCard, { backgroundColor: t.surface }, Shadow.sm]}>
              <View style={[s.recentIcon, { backgroundColor: t.accentSoft }]}>
                <Ionicons name="flash" size={15} color={t.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.recentStation, { color: t.text }]} numberOfLines={1}>{sess.station.name}</Text>
                <Text style={[s.recentCity, { color: t.textSecondary }]}>
                  {sess.station.city} · {SPEED_LABELS[sess.port?.chargingSpeed] ?? sess.port?.chargingSpeed}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.recentKwh, { color: t.text }]}>{(sess.energyKwh ?? 0).toFixed(2)} kWh</Text>
                <Text style={s.recentCo2}>-{co2SavedKg(sess.energyKwh ?? 0)} kg CO₂</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: Spacing.xxxl }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content:   { paddingBottom: 16 },

  // Header
  header:      { marginBottom: Spacing.lg },
  headerBg:    { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  headerInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.xxl,
  },
  greeting:  { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontFamily: F.medium },
  userName:  { color: '#fff', fontSize: 28, fontFamily: F.extraBold, marginTop: 2, letterSpacing: -0.5 },
  avatarBtn: {},
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: { color: '#fff', fontSize: 15, fontFamily: F.bold },

  // Active session
  activeBanner: {
    marginHorizontal: Spacing.lg, marginTop: -Spacing.md, marginBottom: Spacing.lg,
    borderRadius: Radius.lg, padding: Spacing.lg,
  },
  activeLiveRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  liveDot:         { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#fff' },
  liveLabel:       { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontFamily: F.extraBold, letterSpacing: 1 },
  activeBannerBody:{ flexDirection: 'row', alignItems: 'center' },
  activeStationName: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  activeCity:      { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: F.medium, marginTop: 2 },
  activeBannerRight: { alignItems: 'flex-end', marginRight: Spacing.sm },
  activeTimer:     { color: '#fff', fontSize: 22, fontFamily: F.black, fontVariant: ['tabular-nums'] },
  activeKwh:       { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: F.medium, marginTop: 2 },

  // No session
  noSessionCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderRadius: Radius.lg, padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1,
  },
  noSessionIcon:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  noSessionTitle: { fontSize: 15, fontFamily: F.bold },
  noSessionSub:   { fontSize: 13, fontFamily: F.regular, marginTop: 2 },
  findBtn:        { borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 9 },
  findBtnText:    { color: '#fff', fontFamily: F.bold, fontSize: 13 },

  // Stats
  statsRow: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row',
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 17, fontFamily: F.extraBold, letterSpacing: -0.3 },
  statLabel:   { fontSize: 11, fontFamily: F.medium, marginTop: 3, textAlign: 'center' },
  statDivider: { width: 1, marginVertical: 4 },

  // Eco card
  ecoWrap: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  ecoCard: { borderRadius: Radius.xl, padding: Spacing.lg, overflow: 'hidden' },
  ecoCircle1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)', top: -50, right: -30,
  },
  ecoCircle2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: -30, left: 20,
  },
  ecoTop:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  ecoIconBox:  { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  ecoTitle:    { color: '#fff', fontSize: 15, fontFamily: F.bold },
  ecoSub:      { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  ecoStats:    { flexDirection: 'row', alignItems: 'center' },
  ecoStat:     { flex: 1, alignItems: 'center' },
  ecoStatValue:{ color: '#fff', fontSize: 18, fontFamily: F.extraBold, letterSpacing: -0.3 },
  ecoStatLabel:{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontFamily: F.medium, marginTop: 3 },
  ecoStatDiv:  { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.18)' },

  // Section
  section:     { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle:{ fontSize: 16, fontFamily: F.bold, marginBottom: Spacing.md, letterSpacing: -0.2 },
  seeAll:      { fontSize: 13, fontFamily: F.semiBold },

  // Nearby
  nearbyCard: {
    borderRadius: Radius.lg, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md,
  },
  nearbyAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  nearbyIconBox:   { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  nearbyName:      { fontSize: 15, fontFamily: F.bold, letterSpacing: -0.2 },
  nearbyAddress:   { fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  nearbyMeta:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  availChip:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  availDot:        { width: 5, height: 5, borderRadius: 2.5 },
  availText:       { fontSize: 11, fontFamily: F.semiBold },
  metaChip:        { fontSize: 12, fontFamily: F.regular },
  etaChip:         { borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1 },
  etaText:         { fontSize: 11, fontFamily: F.semiBold },
  nearbyActions:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nearbyActionBtn: { padding: 4 },
  emptyText:       { fontSize: 14, fontFamily: F.regular },

  // Quick actions
  quickRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  quickCard: {
    flex: 1, borderRadius: Radius.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md,
    alignItems: 'center', gap: Spacing.sm, borderWidth: 1,
  },
  quickLabel: { fontSize: 13, fontFamily: F.semiBold },

  // Recent
  recentCard: {
    borderRadius: Radius.md, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm,
  },
  recentIcon:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  recentStation: { fontSize: 14, fontFamily: F.semiBold },
  recentCity:    { fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  recentKwh:     { fontSize: 14, fontFamily: F.bold },
  recentCo2:     { fontSize: 11, fontFamily: F.semiBold, marginTop: 2, color: '#16A34A' },
});

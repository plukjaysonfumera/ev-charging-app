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
import { useTheme } from '../theme';
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

interface Stats {
  sessions: number; totalKwh: number; totalSpent: number;
}

interface RecentSession {
  id: string; startedAt: string; energyKwh: number;
  totalAmount: number; durationMinutes: number;
  station: { name: string; city: string };
  port: { chargingSpeed: string };
}

const SPEED_LABELS: Record<string, string> = { LEVEL1: 'L1', LEVEL2: 'L2', DCFC: 'DC Fast' };

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [activeSession,   setActiveSession]   = useState<ActiveSession | null>(null);
  const [nearbyStation,   setNearbyStation]   = useState<NearbyStation | null>(null);
  const [stats,           setStats]           = useState<Stats | null>(null);
  const [recentSessions,  setRecentSessions]  = useState<RecentSession[]>([]);
  const [loadingNearby,   setLoadingNearby]   = useState(true);
  const [elapsed,         setElapsed]         = useState(0);
  const [hasLocation,     setHasLocation]     = useState(false);

  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const ecoAnim     = useRef(new Animated.Value(0)).current;
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation for live dot
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Eco card entrance animation
  useEffect(() => {
    Animated.spring(ecoAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
  }, [stats?.totalKwh]);

  // Session elapsed timer
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
        const { latitude, longitude } = loc.coords;
        setHasLocation(true);
        const res  = await fetch(`${API_URL}/api/v1/stations?lat=${latitude}&lng=${longitude}&radius=20`);
        const json = await res.json();
        const stations: NearbyStation[] = json.data ?? [];
        setNearbyStation(stations.find(s => s.has_available) ?? stations[0] ?? null);
      } else {
        const res  = await fetch(`${API_URL}/api/v1/stations`);
        const json = await res.json();
        setNearbyStation((json.data ?? [])[0] ?? null);
      }
    } catch { /* silent */ } finally {
      setLoadingNearby(false);
    }
  }

  async function shareStation(station: NearbyStation) {
    try {
      await Share.share({
        message: `⚡ Check out ${station.name} EV charging station in ${station.city}!\n${station.address}\n\nView on Google Maps: https://maps.google.com/?q=${station.latitude},${station.longitude}`,
        title: station.name,
      });
    } catch { /* silent */ }
  }

  const firstName  = (user?.displayName ?? 'Driver').split(' ')[0];
  const activeKwh  = activeSession ? parseFloat(((Number(activeSession.port.maxKw) * 0.8 * elapsed) / 3600).toFixed(2)) : 0;
  const activeCost = activeSession ? parseFloat((activeKwh * Number(activeSession.port.pricePerKwh)).toFixed(2)) : 0;

  const co2   = stats ? co2SavedKg(stats.totalKwh) : 0;
  const trees = treesEquivalent(co2);
  const liters = stats ? litersGasSaved(stats.totalKwh) : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: t.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <LinearGradient colors={[t.accent, t.accent + 'DD']} style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{firstName} ⚡</Text>
        </View>
        <TouchableOpacity style={styles.headerProfileBtn} onPress={() => navigation.navigate('Profile')}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {(user?.displayName ?? 'E').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Active Session Banner ── */}
      {activeSession ? (
        <TouchableOpacity
          style={[styles.activeBanner, { backgroundColor: t.accent }]}
          onPress={() => navigation.navigate('ChargingSession', { session: activeSession })}
          activeOpacity={0.9}
        >
          <View style={styles.activeBannerLeft}>
            <View style={styles.activeLiveRow}>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.liveLabel}>LIVE · CHARGING</Text>
            </View>
            <Text style={styles.activeStationName} numberOfLines={1}>{activeSession.station.name}</Text>
            <Text style={styles.activeCity}>{activeSession.station.city}</Text>
          </View>
          <View style={styles.activeBannerRight}>
            <Text style={styles.activeTimer}>{formatElapsed(elapsed)}</Text>
            <Text style={styles.activeKwh}>{activeKwh} kWh</Text>
            <Text style={styles.activeCost}>₱{activeCost.toFixed(2)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.noSessionCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Ionicons name="flash-outline" size={28} color={t.textTertiary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.noSessionTitle, { color: t.text }]}>No active session</Text>
            <Text style={[styles.noSessionSub, { color: t.textSecondary }]}>Find a station to start charging</Text>
          </View>
          <TouchableOpacity style={[styles.findBtn, { backgroundColor: t.accent }]} onPress={() => navigation.navigate('Map')}>
            <Text style={styles.findBtnText}>Find</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Stats Row ── */}
      {stats && stats.sessions > 0 && (
        <View style={[styles.statsRow, { backgroundColor: t.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: t.text }]}>{stats.sessions}</Text>
            <Text style={[styles.statLabel, { color: t.textSecondary }]}>Sessions</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: t.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: t.text }]}>{stats.totalKwh}</Text>
            <Text style={[styles.statLabel, { color: t.textSecondary }]}>kWh Added</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: t.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: t.text }]}>₱{stats.totalSpent.toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: t.textSecondary }]}>Spent</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: t.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#22C55E' }]}>{formatCo2(co2)}</Text>
            <Text style={[styles.statLabel, { color: t.textSecondary }]}>CO₂ Saved</Text>
          </View>
        </View>
      )}

      {/* ── Eco Impact Card ── */}
      {stats && stats.totalKwh > 0 && (
        <Animated.View style={{ transform: [{ scale: ecoAnim }], opacity: ecoAnim, marginHorizontal: 16, marginTop: 16 }}>
          <LinearGradient colors={['#166534', '#15803D']} style={styles.ecoCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            {/* Decorative circles */}
            <View style={styles.ecoCircle1} />
            <View style={styles.ecoCircle2} />

            <View style={styles.ecoTop}>
              <View style={styles.ecoIconBox}>
                <Text style={styles.ecoEmoji}>🌱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ecoTitle}>Your Eco Impact</Text>
                <Text style={styles.ecoSub}>Every kWh charged makes a difference</Text>
              </View>
            </View>

            <View style={styles.ecoStats}>
              <View style={styles.ecoStat}>
                <Text style={styles.ecoStatValue}>{formatCo2(co2)}</Text>
                <Text style={styles.ecoStatLabel}>CO₂ Saved</Text>
              </View>
              <View style={styles.ecoStatDivider} />
              <View style={styles.ecoStat}>
                <Text style={styles.ecoStatValue}>{liters}L</Text>
                <Text style={styles.ecoStatLabel}>Gas Avoided</Text>
              </View>
              <View style={styles.ecoStatDivider} />
              <View style={styles.ecoStat}>
                <Text style={styles.ecoStatValue}>{trees > 0 ? `${trees} 🌳` : '< 1'}</Text>
                <Text style={styles.ecoStatLabel}>Trees Equiv.</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* ── Nearest Station ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>
          {nearbyStation?.has_available ? '⚡ Nearest Available' : '📍 Nearest Station'}
        </Text>

        {loadingNearby ? (
          <View style={[styles.nearbyCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <NearbyCardSkeleton />
          </View>
        ) : nearbyStation ? (
          <TouchableOpacity
            style={[styles.nearbyCard, { backgroundColor: t.surface, borderColor: nearbyStation.has_available ? t.accent : t.border }]}
            onPress={() => navigation.navigate('StationDetail', { stationId: nearbyStation.id })}
            activeOpacity={0.85}
          >
            <View style={[styles.nearbyIconBox, { backgroundColor: nearbyStation.has_available ? t.badge : t.surface }]}>
              <Ionicons name="flash" size={24} color={nearbyStation.has_available ? t.accent : t.textTertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nearbyName, { color: t.text }]} numberOfLines={1}>{nearbyStation.name}</Text>
              <Text style={[styles.nearbyAddress, { color: t.textSecondary }]} numberOfLines={1}>{nearbyStation.address}</Text>
              <View style={styles.nearbyMeta}>
                <View style={[styles.availChip, { backgroundColor: nearbyStation.has_available ? t.badge : t.surface, borderColor: nearbyStation.has_available ? t.accent : t.border }]}>
                  <View style={[styles.availDot, { backgroundColor: nearbyStation.has_available ? t.accent : '#888' }]} />
                  <Text style={[styles.availText, { color: nearbyStation.has_available ? t.accent : t.textTertiary }]}>
                    {nearbyStation.has_available ? 'Available' : 'Occupied'}
                  </Text>
                </View>
                <Text style={[styles.nearbyMeta2, { color: t.textTertiary }]}>{nearbyStation.port_count} ports</Text>
                {nearbyStation.distance_meters != null && (
                  <>
                    <Text style={[styles.nearbyMeta2, { color: t.textTertiary }]}>·  {formatDistance(nearbyStation.distance_meters)}</Text>
                    {hasLocation && (
                      <Text style={[styles.etaChip, { color: t.accent, borderColor: t.accent + '40', backgroundColor: t.badge }]}>
                        🚗 {formatEta(nearbyStation.distance_meters)}
                      </Text>
                    )}
                  </>
                )}
              </View>
            </View>
            <View style={styles.nearbyActions}>
              <TouchableOpacity onPress={() => shareStation(nearbyStation)} hitSlop={8}>
                <Ionicons name="share-outline" size={18} color={t.textTertiary} />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={18} color={t.textTertiary} />
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.emptyText, { color: t.textSecondary }]}>No stations found nearby.</Text>
        )}
      </View>

      {/* ── Quick Actions ── */}
      <View style={styles.quickActions}>
        {[
          { label: 'Map',      icon: 'map',         screen: 'Map',      primary: true  },
          { label: 'Stations', icon: 'flash',        screen: 'Stations', primary: false },
          { label: 'History',  icon: 'time',         screen: 'History',  primary: false },
        ].map(({ label, icon, screen, primary }) => (
          <TouchableOpacity
            key={label}
            style={[styles.quickCard, primary ? { backgroundColor: t.accent } : { backgroundColor: t.surface, borderColor: t.border }]}
            onPress={() => navigation.navigate(screen)}
            activeOpacity={0.85}
          >
            <Ionicons name={icon as any} size={26} color={primary ? '#fff' : t.accent} />
            <Text style={[styles.quickLabel, { color: primary ? '#fff' : t.text }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Recent Sessions ── */}
      {recentSessions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: t.text }]}>Recent Charges</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={[styles.seeAll, { color: t.accent }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentSessions.map(s => (
            <View key={s.id} style={[styles.recentCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={[styles.recentIcon, { backgroundColor: t.badge }]}>
                <Ionicons name="flash" size={16} color={t.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recentStation, { color: t.text }]} numberOfLines={1}>{s.station.name}</Text>
                <Text style={[styles.recentCity, { color: t.textSecondary }]}>
                  {s.station.city} · {SPEED_LABELS[s.port?.chargingSpeed] ?? s.port?.chargingSpeed}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.recentKwh, { color: t.text }]}>{(s.energyKwh ?? 0).toFixed(2)} kWh</Text>
                <Text style={[styles.recentCo2, { color: '#22C55E' }]}>-{co2SavedKg(s.energyKwh ?? 0)} kg CO₂</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { paddingBottom: 32 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24,
  },
  greeting:         { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500' },
  userName:         { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 2 },
  headerProfileBtn: { padding: 2 },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  activeBanner: {
    marginHorizontal: 16, marginTop: -12, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  activeBannerLeft:  { flex: 1 },
  activeLiveRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  liveDot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  liveLabel:         { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  activeStationName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  activeCity:        { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  activeBannerRight: { alignItems: 'flex-end', marginRight: 4 },
  activeTimer:       { color: '#fff', fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  activeKwh:         { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  activeCost:        { color: 'rgba(255,255,255,0.75)', fontSize: 12 },

  noSessionCard: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1,
  },
  noSessionTitle: { fontSize: 15, fontWeight: '700' },
  noSessionSub:   { fontSize: 13, marginTop: 2 },
  findBtn:        { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  findBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },

  statsRow: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 16, flexDirection: 'row',
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 17, fontWeight: '800' },
  statLabel:   { fontSize: 10, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, marginVertical: 4 },

  // Eco card
  ecoCard: { borderRadius: 20, padding: 18, overflow: 'hidden' },
  ecoCircle1: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -40, right: -20,
  },
  ecoCircle2: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.07)', bottom: -20, left: 30,
  },
  ecoTop:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  ecoIconBox:   { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  ecoEmoji:     { fontSize: 22 },
  ecoTitle:     { color: '#fff', fontSize: 15, fontWeight: '800' },
  ecoSub:       { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  ecoStats:     { flexDirection: 'row', alignItems: 'center' },
  ecoStat:      { flex: 1, alignItems: 'center' },
  ecoStatValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
  ecoStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  ecoStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

  section:      { marginHorizontal: 16, marginTop: 24 },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  seeAll:       { fontSize: 13, fontWeight: '600' },

  nearbyCard: {
    borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5,
  },
  nearbyIconBox:  { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  nearbyName:     { fontSize: 15, fontWeight: '700' },
  nearbyAddress:  { fontSize: 12, marginTop: 2 },
  nearbyMeta:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  nearbyMeta2:    { fontSize: 12 },
  availChip:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  availDot:       { width: 6, height: 6, borderRadius: 3 },
  availText:      { fontSize: 11, fontWeight: '700' },
  etaChip:        { fontSize: 11, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  nearbyActions:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyText:      { fontSize: 14 },

  quickActions: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 20 },
  quickCard: {
    flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  quickLabel: { fontSize: 13, fontWeight: '700' },

  recentCard: {
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, marginBottom: 8,
  },
  recentIcon:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  recentStation: { fontSize: 14, fontWeight: '700' },
  recentCity:    { fontSize: 12, marginTop: 2 },
  recentKwh:     { fontSize: 14, fontWeight: '700' },
  recentCo2:     { fontSize: 11, marginTop: 2, fontWeight: '600' },
});

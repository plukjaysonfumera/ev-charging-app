import { API_URL } from '../lib/config';
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import CarImage from '../components/CarImage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH   = SCREEN_WIDTH - 16 * 2;
const CARD_HEIGHT  = Math.round(CARD_WIDTH * 0.62);  // cinematic 16:10 ratio

interface Stats {
  sessions: number;
  totalKwh: number;
  totalSpent: number;
  totalMinutes: number;
}

// Achievement badge definitions
const BADGES: { id: string; icon: string; label: string; desc: string; color: string; threshold: (s: Stats) => boolean }[] = [
  { id: 'first',    icon: '⚡', label: 'First Charge',  desc: 'Complete your first session',  color: '#F59E0B', threshold: s => s.sessions >= 1 },
  { id: 'ten',      icon: '🔋', label: '10 Sessions',   desc: '10 charging sessions done',     color: '#3B82F6', threshold: s => s.sessions >= 10 },
  { id: 'kwh50',    icon: '🌱', label: '50 kWh',        desc: '50 kWh of clean energy added',  color: '#22C55E', threshold: s => s.totalKwh >= 50 },
  { id: 'kwh100',   icon: '💚', label: '100 kWh',       desc: 'EV champion — 100 kWh!',        color: '#16A34A', threshold: s => s.totalKwh >= 100 },
  { id: 'spender',  icon: '💳', label: 'Power Spender', desc: 'Spent over ₱1,000 charging',   color: '#8B5CF6', threshold: s => s.totalSpent >= 1000 },
  { id: 'road',     icon: '🛣️', label: 'Road Warrior',  desc: 'More than 5 hours of charging', color: '#F97316', threshold: s => s.totalMinutes >= 300 },
];



const CONNECTOR_LABELS: Record<string, string> = {
  TYPE1: 'Type 1', TYPE2: 'Type 2', CCS1: 'CCS1', CCS2: 'CCS2',
  CHADEMO: 'CHAdeMO', NACS: 'NACS', TESLA_S: 'Tesla',
};

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  batteryKwh: number;
  connectors: string[];
  isDefault: boolean;
  licensePlate?: string;
}

export default function ProfileScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useFocusEffect(useCallback(() => {
    loadVehicles();
    loadStats();
  }, []));

  async function loadStats() {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/sessions?firebaseUid=${user.uid}`);
      const json = await res.json();
      const completed = (json.data ?? []).filter((s: any) => s.status === 'COMPLETED');
      setStats({
        sessions: completed.length,
        totalKwh: completed.reduce((sum: number, s: any) => sum + (s.energyKwh ?? 0), 0),
        totalSpent: completed.reduce((sum: number, s: any) => sum + Number(s.totalAmount ?? 0), 0),
        totalMinutes: completed.reduce((sum: number, s: any) => sum + (s.durationMinutes ?? 0), 0),
      });
    } catch { /* silent */ }
  }

  async function loadVehicles() {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/vehicles?firebaseUid=${user.uid}`);
      const json = await res.json();
      setVehicles(json.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function setDefault(vehicleId: string) {
    if (!user) return;
    await fetch(`${API_URL}/api/v1/vehicles/${vehicleId}/default`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseUid: user.uid }),
    });
    loadVehicles();
  }

  async function deleteVehicle(vehicleId: string) {
    Alert.alert('Delete Vehicle', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await fetch(`${API_URL}/api/v1/vehicles/${vehicleId}`, { method: 'DELETE' });
          loadVehicles();
        },
      },
    ]);
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.surface }]} contentContainerStyle={styles.content}>
      {/* Avatar + Info */}
      <View style={[styles.header, { backgroundColor: t.surfaceElevated }]}>
        <View style={[styles.avatar, { backgroundColor: t.accent }]}>
          <Text style={styles.avatarInitials}>
            {(user?.displayName ?? 'E').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: t.text }]}>{user?.displayName ?? 'EV Driver'}</Text>
          <Text style={[styles.email, { color: t.textSecondary }]}>{user?.email}</Text>
          <View style={[styles.memberBadge, { backgroundColor: t.badge }]}>
            <Ionicons name="flash" size={10} color={t.accent} />
            <Text style={[styles.memberText, { color: t.accent }]}>PHEV PH Member</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="create-outline" size={20} color={t.accent} />
        </TouchableOpacity>
      </View>

      {/* Charging Stats */}
      {stats && stats.sessions > 0 && (
        <View style={[styles.statsCard, { backgroundColor: t.accent }]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.sessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalKwh.toFixed(1)}</Text>
            <Text style={styles.statLabel}>kWh</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₱{stats.totalSpent.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.totalMinutes < 60 ? `${stats.totalMinutes}m` : `${Math.floor(stats.totalMinutes / 60)}h`}
            </Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
        </View>
      )}

      {/* Achievement Badges */}
      {stats && (
        <View style={[styles.badgesCard, { backgroundColor: t.surfaceElevated }]}>
          <Text style={[styles.badgesTitle, { color: t.text }]}>Achievements</Text>
          <View style={styles.badgesGrid}>
            {BADGES.map(b => {
              const earned = b.threshold(stats);
              return (
                <View
                  key={b.id}
                  style={[
                    styles.badge,
                    { backgroundColor: earned ? b.color + '18' : t.surface, borderColor: earned ? b.color : t.border },
                  ]}
                >
                  <Text style={[styles.badgeIcon, { opacity: earned ? 1 : 0.3 }]}>{b.icon}</Text>
                  <Text style={[styles.badgeLabel, { color: earned ? t.text : t.textTertiary }]}>{b.label}</Text>
                  {!earned && (
                    <View style={[styles.badgeLock, { backgroundColor: t.border }]}>
                      <Text style={{ fontSize: 8, color: t.textTertiary }}>🔒</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* My Vehicles */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>My Vehicles</Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: t.green }]} onPress={() => navigation.navigate('AddVehicle')}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={t.green} style={{ marginTop: 16 }} />
        ) : vehicles.length === 0 ? (
          <TouchableOpacity
            style={[styles.emptyVehicle, { backgroundColor: t.surfaceElevated, borderColor: t.border }]}
            onPress={() => navigation.navigate('AddVehicle')}
          >
            <Ionicons name="car-outline" size={32} color={t.textTertiary} />
            <Text style={[styles.emptyText, { color: t.textTertiary }]}>Add your EV to get started</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.vehicleList}>
            {vehicles.map(v => (
              <View key={v.id} style={[styles.vehicleCard, v.isDefault && { borderColor: t.accent }]}>

                {/* ── Full-bleed car image ── */}
                <CarImage
                  make={v.make}
                  model={v.model}
                  width={CARD_WIDTH}
                  height={CARD_HEIGHT}
                />

                {/* ── Gradient overlay — transparent → black from 35% down ── */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
                  locations={[0.3, 0.6, 1]}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />

                {/* ── Top-right: action buttons ── */}
                <View style={styles.cardTopActions}>
                  {!v.isDefault && (
                    <TouchableOpacity
                      onPress={() => setDefault(v.id)}
                      style={styles.glassBtn}
                    >
                      <Ionicons name="star-outline" size={15} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => deleteVehicle(v.id)}
                    style={[styles.glassBtn, styles.glassBtnDanger]}
                  >
                    <Ionicons name="trash-outline" size={15} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* ── Top-left: Default badge ── */}
                {v.isDefault && (
                  <View style={[styles.defaultBadge, { backgroundColor: t.accent }]}>
                    <Ionicons name="star" size={10} color="#fff" />
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}

                {/* ── Bottom overlay: car info ── */}
                <View style={styles.cardOverlayInfo}>
                  <Text style={styles.overlayMake}>{v.year} · {v.make.toUpperCase()}</Text>
                  <Text style={styles.overlayModel} numberOfLines={1}>{v.model}</Text>

                  <View style={styles.overlayMeta}>
                    <View style={styles.overlayMetaItem}>
                      <Ionicons name="battery-charging-outline" size={13} color="rgba(255,255,255,0.75)" />
                      <Text style={styles.overlayMetaText}>{v.batteryKwh} kWh</Text>
                    </View>
                    {v.licensePlate ? (
                      <View style={styles.overlayMetaItem}>
                        <Ionicons name="card-outline" size={13} color="rgba(255,255,255,0.75)" />
                        <Text style={styles.overlayMetaText}>{v.licensePlate}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.connectorRow}>
                    {(v.connectors ?? []).slice(0, 5).map(c => (
                      <View key={c} style={styles.overlayConnectorChip}>
                        <Ionicons name="flash" size={9} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.overlayConnectorText}>
                          {CONNECTOR_LABELS[c] ?? c}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

              </View>
            ))}
          </View>
        )}
      </View>

      {/* App Info */}
      <View style={[styles.appInfo, { borderColor: t.border }]}>
        <Text style={[styles.appInfoText, { color: t.textTertiary }]}>PHEV PH · Version 1.0.0</Text>
        <Text style={[styles.appInfoText, { color: t.textTertiary }]}>Powering EV drivers across the Philippines 🇵🇭</Text>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>Account</Text>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: t.surfaceElevated, borderBottomColor: t.separator }]}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="person-outline" size={20} color={t.textSecondary} />
          <Text style={[styles.menuText, { color: t.text }]}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={16} color={t.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, styles.menuItemLast, { backgroundColor: t.surfaceElevated }]}
          onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => signOut(auth) },
          ])}
        >
          <Ionicons name="log-out-outline" size={20} color={t.destructive} />
          <Text style={[styles.menuText, { color: t.destructive }]}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={16} color={t.textTertiary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarInitials: { color: '#fff', fontSize: 22, fontWeight: '800' },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
  memberText: { fontSize: 10, fontWeight: '700' },
  appInfo: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16, alignItems: 'center', gap: 4 },
  appInfoText: { fontSize: 12, textAlign: 'center' },
  headerInfo: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700' },
  email: { fontSize: 13, marginTop: 2 },
  editButton: { padding: 8 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyVehicle: { borderRadius: 12, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed' },
  emptyText: { fontSize: 14 },

  vehicleList: { gap: 16 },
  vehicleCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },

  // Top-right glass action buttons
  cardTopActions: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', gap: 8,
  },
  glassBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  glassBtnDanger: {
    backgroundColor: 'rgba(220,38,38,0.4)',
    borderColor: 'rgba(255,100,100,0.3)',
  },

  // Top-left default badge
  defaultBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  defaultBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Bottom overlay content
  cardOverlayInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16,
  },
  overlayMake: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  overlayModel: {
    color: '#FFFFFF',
    fontSize: 22, fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  overlayMeta: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  overlayMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  overlayMetaText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },

  connectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  overlayConnectorChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  overlayConnectorText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12,
    borderBottomWidth: 1,
  },
  menuItemLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomWidth: 0 },
  menuText: { flex: 1, fontSize: 15 },
  badgesCard: { borderRadius: 14, padding: 16, marginBottom: 16 },
  badgesTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    width: '30.5%', borderRadius: 12, padding: 10,
    alignItems: 'center', gap: 4, borderWidth: 1.5,
    position: 'relative',
  },
  badgeIcon: { fontSize: 26 },
  badgeLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  badgeLock: {
    position: 'absolute', top: 6, right: 6,
    width: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  statsCard: { flexDirection: 'row', borderRadius: 14, padding: 16, marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
});

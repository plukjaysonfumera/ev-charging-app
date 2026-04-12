import { API_URL } from '../lib/config';
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';



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

  useFocusEffect(useCallback(() => { loadVehicles(); }, []));

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
          vehicles.map(v => (
            <View
              key={v.id}
              style={[
                styles.vehicleCard,
                { backgroundColor: t.surfaceElevated, borderColor: t.border },
                v.isDefault && { borderColor: t.green, backgroundColor: t.greenTint },
              ]}
            >
              <View style={[styles.vehicleIcon, { backgroundColor: t.badge }]}>
                <Ionicons name="car" size={24} color={v.isDefault ? '#fff' : t.green} style={v.isDefault ? { tintColor: '#fff' } : undefined} />
              </View>
              <View style={styles.vehicleInfo}>
                <View style={styles.vehicleNameRow}>
                  <Text style={[styles.vehicleName, { color: t.text }]}>{v.year} {v.make} {v.model}</Text>
                  {v.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: t.green }]}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.vehicleDetail, { color: t.textSecondary }]}>
                  {v.batteryKwh} kWh{v.licensePlate ? ` · 🪪 ${v.licensePlate}` : ''}
                </Text>
                <View style={styles.connectorRow}>
                  {(v.connectors ?? []).length > 0 ? (v.connectors ?? []).map(c => (
                    <View key={c} style={[styles.connectorChip, { backgroundColor: t.badge }]}>
                      <Ionicons name="flash" size={10} color={t.accent} />
                      <Text style={[styles.connectorChipText, { color: t.accent }]}>{CONNECTOR_LABELS[c] ?? c}</Text>
                    </View>
                  )) : (
                    <Text style={[styles.vehicleDetail, { color: t.textTertiary }]}>No connector selected</Text>
                  )}
                </View>
              </View>
              <View style={styles.vehicleActions}>
                {!v.isDefault && (
                  <TouchableOpacity onPress={() => setDefault(v.id)} style={styles.iconBtn}>
                    <Ionicons name="star-outline" size={18} color={t.textSecondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => deleteVehicle(v.id)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={18} color={t.destructive} />
                </TouchableOpacity>
              </View>
            </View>
          ))
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
  vehicleCard: { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1.5 },
  vehicleIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  vehicleInfo: { flex: 1 },
  vehicleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vehicleName: { fontSize: 14, fontWeight: '700' },
  defaultBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  defaultText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  vehicleDetail: { fontSize: 12, marginTop: 2 },
  connectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  connectorChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  connectorChipText: { fontSize: 10, fontWeight: '700' },
  vehicleActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12,
    borderBottomWidth: 1,
  },
  menuItemLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomWidth: 0 },
  menuText: { flex: 1, fontSize: 15 },
});

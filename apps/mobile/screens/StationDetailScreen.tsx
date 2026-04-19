import { API_URL } from '../lib/config';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, Alert, Linking, Platform,
  Modal, TextInput, KeyboardAvoidingView, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../lib/firebase';
import { useTheme, F } from '../theme';
import { useFavorites } from '../hooks/useFavorites';



const CONNECTOR_LABELS: Record<string, string> = {
  TYPE1: 'Type 1 (J1772)', TYPE2: 'Type 2 (Mennekes)',
  CCS1: 'CCS1', CCS2: 'CCS2', CHADEMO: 'CHAdeMO', NACS: 'NACS (Tesla)',
};

const SPEED_LABELS: Record<string, string> = {
  LEVEL1: 'Level 1 (~1.4 kW)', LEVEL2: 'Level 2 (up to 22 kW)', DCFC: 'DC Fast Charge',
};

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#2d9e5f', OCCUPIED: '#e07b39', FAULTED: '#e03939', OFFLINE: '#aaa',
};

interface Port {
  id: string; port_number: string; connector_type: string;
  charging_speed: string; max_kw: number; price_per_kwh: string;
  currency: string; status: string;
  session_started_at?: string | null;
  session_target_kwh?: number | null;
}

const AVG_SESSION_MINUTES: Record<string, number> = {
  DCFC: 40, LEVEL2: 120, LEVEL1: 480,
};

function minutesElapsed(startedAt: string): number {
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
}

function estimatedWait(port: Port): string {
  if (!port.session_started_at) return '';
  const elapsed = minutesElapsed(port.session_started_at);
  // Use targetKwh for precise estimate; fall back to average by speed
  const totalMinutes = port.session_target_kwh
    ? Math.round((port.session_target_kwh / port.max_kw) * 60)
    : AVG_SESSION_MINUTES[port.charging_speed] ?? 60;
  const remaining = Math.max(0, totalMinutes - elapsed);
  if (remaining === 0) return 'Finishing soon';
  if (remaining < 60) return `~${remaining}m wait`;
  return `~${Math.floor(remaining / 60)}h ${remaining % 60}m wait`;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

interface Station {
  id: string; name: string; address: string; city: string;
  province: string; network_name?: string; amenities: string[];
  average_rating: number; review_count: number; ports: Port[];
  latitude?: number; longitude?: number;
  phone?: string; website?: string;
  opening_hours?: Record<string, string>;
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

function todayKey(): string {
  return DAY_KEYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
}

function openDirections(lat: number, lng: number, name: string) {
  const label = encodeURIComponent(name);
  Alert.alert(
    'Get Directions',
    'Open with:',
    [
      {
        text: 'Google Maps',
        onPress: () => {
          const url = Platform.select({
            ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
            android: `google.navigation:q=${lat},${lng}`,
          });
          Linking.canOpenURL(url!).then(supported => {
            if (supported) {
              Linking.openURL(url!);
            } else {
              // Fallback to browser
              Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`);
            }
          });
        },
      },
      {
        text: 'Waze',
        onPress: () => {
          const url = `waze://?ll=${lat},${lng}&navigate=yes`;
          Linking.canOpenURL(url).then(supported => {
            if (supported) {
              Linking.openURL(url);
            } else {
              Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
            }
          });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]
  );
}

interface Review {
  id: string; rating: number; comment?: string;
  createdAt: string; user: { displayName: string };
}

export default function StationDetailScreen({ route, navigation }: any) {
  const t = useTheme();
  const { stationId } = route.params;
  const [station, setStation] = useState<Station | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingPort, setStartingPort] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [chargeSheet, setChargeSheet] = useState<Port | null>(null);
  const [targetKwh, setTargetKwh] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isFavorite, toggle } = useFavorites();

  function openChargeSheet(port: Port) {
    const user = auth.currentUser;
    if (!user) { Alert.alert('Sign in required'); return; }
    setTargetKwh('');
    setChargeSheet(port);
  }

  async function confirmStartCharging() {
    const port = chargeSheet;
    const user = auth.currentUser;
    if (!port || !user) return;
    const kwh = parseFloat(targetKwh);
    if (!targetKwh || isNaN(kwh) || kwh <= 0) {
      Alert.alert('Enter kWh', 'Please enter how many kWh you want to charge.');
      return;
    }
    setChargeSheet(null);
    setStartingPort(port.id);
    try {
      const res = await fetch(`${API_URL}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: user.uid, displayName: user.displayName,
          email: user.email, stationId, portId: port.id,
          targetKwh: kwh,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      navigation.navigate('ChargingSession', { session: json.data });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not start session.');
    } finally {
      setStartingPort(null);
    }
  }

  async function loadStation() {
    try {
      const res = await fetch(`${API_URL}/api/v1/stations/${stationId}`);
      const json = await res.json();
      setStation(json.data);
      setLastRefreshed(new Date());
    } catch {
      setError('Could not load station details');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStation();
    // Poll port status every 30 seconds
    pollRef.current = setInterval(loadStation, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [stationId]);

  async function handleShare() {
    if (!station) return;
    try {
      const availablePorts = (station.ports ?? []).filter(p => p.status === 'AVAILABLE').length;
      const totalPorts = (station.ports ?? []).length;
      const connectors = [...new Set((station.ports ?? []).map(p => p.connector_type))].join(', ');
      await Share.share({
        title: station.name,
        message:
          `⚡ ${station.name}\n` +
          `📍 ${station.address}, ${station.city}\n` +
          `🔌 ${availablePorts}/${totalPorts} ports available · ${connectors}\n\n` +
          `Find it on PHEV PH — the EV charging app for the Philippines.`,
      });
    } catch (_) {}
  }

  // Bookmark + Share buttons in header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
          <TouchableOpacity
            onPress={handleShare}
            style={{ padding: 8 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="share-outline" size={22} color={t.headerText} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => toggle(stationId)}
            style={{ padding: 8 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFavorite(stationId) ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isFavorite(stationId) ? t.accent : t.headerText}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [stationId, isFavorite(stationId), station]);

  useFocusEffect(useCallback(() => {
    fetch(`${API_URL}/api/v1/reviews?stationId=${stationId}`)
      .then(res => res.json())
      .then(json => setReviews(json.data ?? []));
  }, [stationId]));

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: t.background }]}><ActivityIndicator size="large" color={t.green} /></View>;
  }

  if (error || !station) {
    return <View style={[styles.centered, { backgroundColor: t.background }]}><Text style={{ color: t.destructive }}>{error ?? 'Station not found'}</Text></View>;
  }

  const stars = Math.round(station.average_rating);

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.name, { color: t.green }]}>{station.name}</Text>
      <Text style={[styles.address, { color: t.textSecondary }]}>{station.address}, {station.city}</Text>

      <View style={styles.topActions}>
        {station.network_name && (
          <View style={[styles.networkBadge, { backgroundColor: t.badge }]}>
            <Text style={[styles.networkText, { color: t.badgeText }]}>{station.network_name}</Text>
          </View>
        )}
        {station.latitude != null && station.longitude != null && (
          <TouchableOpacity
            style={[styles.directionsButton, { backgroundColor: t.accent }]}
            onPress={() => openDirections(station.latitude!, station.longitude!, station.name)}
          >
            <Ionicons name="navigate" size={15} color="#fff" />
            <Text style={styles.directionsText}>Get Directions</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.row}>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map(i => (
            <Ionicons key={i} name={i <= stars ? 'star' : 'star-outline'} size={16} color={t.star} />
          ))}
        </View>
        <Text style={[styles.reviewCount, { color: t.textSecondary }]}>
          {station.review_count} {station.review_count === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      {/* Contact & Hours */}
      {(station.phone || station.website || station.opening_hours) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Info</Text>

          {station.phone && (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => Linking.openURL(`tel:${station.phone}`)}
            >
              <Ionicons name="call-outline" size={16} color={t.green} style={styles.infoIcon} />
              <Text style={[styles.infoLink, { color: t.green }]}>{station.phone}</Text>
            </TouchableOpacity>
          )}

          {station.website && (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => Linking.openURL(station.website!)}
            >
              <Ionicons name="globe-outline" size={16} color={t.green} style={styles.infoIcon} />
              <Text style={[styles.infoLink, { color: t.green }]} numberOfLines={1}>
                {station.website.replace(/^https?:\/\//, '')}
              </Text>
            </TouchableOpacity>
          )}

          {station.opening_hours && (
            <View style={[styles.hoursCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              {DAY_KEYS.map(key => {
                const hours = station.opening_hours![key];
                const isToday = key === todayKey();
                return (
                  <View key={key} style={[styles.hoursRow, isToday && { backgroundColor: t.green + '14' }]}>
                    <Text style={[styles.hoursDay, { color: isToday ? t.green : t.text }, isToday && { fontWeight: '700' }]}>
                      {DAY_LABELS[key]}
                    </Text>
                    <Text style={[styles.hoursTime, { color: hours ? (isToday ? t.green : t.textSecondary) : t.textTertiary }]}>
                      {hours ?? 'Closed'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {(station.amenities ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Amenities</Text>
          <View style={styles.amenitiesRow}>
            {(station.amenities ?? []).map(a => (
              <View key={a} style={[styles.amenityChip, { backgroundColor: t.surface }]}>
                <Text style={[styles.amenityText, { color: t.textSecondary }]}>{a}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.portsHeader}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Charging Ports ({(station.ports ?? []).length})</Text>
          <TouchableOpacity onPress={loadStation} style={styles.refreshRow}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveText, { color: t.textTertiary }]}>Live</Text>
          </TouchableOpacity>
        </View>
        {(station.ports ?? []).length === 0 ? (
          <Text style={[styles.noData, { color: t.textTertiary }]}>No ports listed yet.</Text>
        ) : (
          (station.ports ?? []).map(port => {
            const statusColor = STATUS_COLORS[port.status] ?? '#aaa';
            const isOccupied = port.status === 'OCCUPIED';
            const elapsed = isOccupied && port.session_started_at ? minutesElapsed(port.session_started_at) : null;
            const wait = isOccupied && port.session_started_at ? estimatedWait(port) : null;
            return (
              <View key={port.id} style={[styles.portCard, { borderColor: port.status === 'AVAILABLE' ? t.green : statusColor + '55' }]}>
                <View style={styles.portHeader}>
                  <Text style={[styles.portNumber, { color: t.text }]}>Port {port.port_number}</Text>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.portStatus, { color: statusColor }]}>
                    {isOccupied ? 'In Use' : port.status.charAt(0) + port.status.slice(1).toLowerCase()}
                  </Text>
                </View>

                <Text style={[styles.portDetail, { color: t.textSecondary }]}>
                  {CONNECTOR_LABELS[port.connector_type] ?? port.connector_type}
                </Text>
                <Text style={[styles.portDetail, { color: t.textSecondary }]}>
                  {SPEED_LABELS[port.charging_speed] ?? port.charging_speed} · {port.max_kw} kW
                </Text>
                {parseFloat(port.price_per_kwh) > 0
                  ? <Text style={[styles.portPrice, { color: t.green }]}>₱{port.price_per_kwh} / kWh</Text>
                  : <Text style={[styles.portPrice, { color: t.textTertiary }]}>Price — contact station</Text>
                }

                {isOccupied && elapsed !== null && (
                  <View style={styles.inUseBox}>
                    <Ionicons name="time-outline" size={14} color="#e07b39" />
                    <Text style={styles.inUseText}>
                      Charging for {elapsed}m{wait ? ` · ${wait}` : ''}
                    </Text>
                  </View>
                )}

                {port.status === 'AVAILABLE' && (
                  <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: t.green }]}
                    onPress={() => openChargeSheet(port)}
                    disabled={startingPort === port.id}
                  >
                    {startingPort === port.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Ionicons name="flash" size={15} color="#fff" /><Text style={styles.startButtonText}>Start Charging</Text></>
                    }
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.reviewsHeader}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Reviews ({reviews.length})</Text>
          <TouchableOpacity
            style={styles.writeReviewButton}
            onPress={() => navigation.navigate('WriteReview', { stationId: station.id, stationName: station.name })}
          >
            <Ionicons name="create-outline" size={16} color={t.green} />
            <Text style={[styles.writeReviewText, { color: t.green }]}>Write a review</Text>
          </TouchableOpacity>
        </View>

        {reviews.length === 0 ? (
          <Text style={[styles.noData, { color: t.textTertiary }]}>No reviews yet — be the first!</Text>
        ) : (
          reviews.map(review => (
            <View key={review.id} style={[styles.reviewCard, { backgroundColor: t.surface, borderColor: t.separator }]}>
              <View style={styles.reviewHeader}>
                <Text style={[styles.reviewerName, { color: t.text }]}>{review.user.displayName}</Text>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Ionicons key={i} name={i <= review.rating ? 'star' : 'star-outline'} size={13} color={t.star} />
                  ))}
                </View>
              </View>
              {review.comment && <Text style={[styles.reviewComment, { color: t.textSecondary }]}>{review.comment}</Text>}
              <Text style={[styles.reviewDate, { color: t.textTertiary }]}>
                {new Date(review.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Pre-charge confirmation sheet */}
      <Modal visible={!!chargeSheet} transparent animationType="slide" onRequestClose={() => setChargeSheet(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setChargeSheet(null)} />
          {chargeSheet && (() => {
            const kwh = parseFloat(targetKwh) || 0;
            const estMins = kwh > 0 ? Math.round((kwh / chargeSheet.max_kw) * 60) : null;
            const priceKnown = parseFloat(chargeSheet.price_per_kwh) > 0;
            const estCost = kwh > 0 && priceKnown ? (kwh * parseFloat(chargeSheet.price_per_kwh)).toFixed(2) : null;
            return (
              <View style={[styles.sheet, { backgroundColor: t.surfaceElevated }]}>
                <View style={[styles.sheetHandle, { backgroundColor: t.border }]} />
                <Text style={[styles.sheetTitle, { color: t.text }]}>How much do you want to charge?</Text>

                <View style={[styles.sheetPortInfo, { backgroundColor: t.surface, borderColor: t.border }]}>
                  <Text style={[styles.sheetPortLabel, { color: t.textSecondary }]}>
                    Port {chargeSheet.port_number} · {CONNECTOR_LABELS[chargeSheet.connector_type] ?? chargeSheet.connector_type} · {chargeSheet.max_kw} kW
                  </Text>
                  {parseFloat(chargeSheet.price_per_kwh) > 0
                    ? <Text style={[styles.sheetPortPrice, { color: t.green }]}>₱{chargeSheet.price_per_kwh} / kWh</Text>
                    : <Text style={[styles.sheetPortPrice, { color: t.textTertiary }]}>Price — contact station</Text>
                  }
                </View>

                <Text style={[styles.sheetLabel, { color: t.textSecondary }]}>Target kWh</Text>
                <View style={[styles.kwhInputRow, { borderColor: t.border, backgroundColor: t.surface }]}>
                  <TextInput
                    style={[styles.kwhInput, { color: t.text }]}
                    value={targetKwh}
                    onChangeText={setTargetKwh}
                    placeholder="e.g. 30"
                    placeholderTextColor={t.placeholder}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                  <Text style={[styles.kwhUnit, { color: t.textTertiary }]}>kWh</Text>
                </View>

                {estMins !== null && (
                  <View style={[styles.sheetEstRow, { backgroundColor: t.surface, borderColor: t.border }]}>
                    <View style={styles.sheetEst}>
                      <Ionicons name="time-outline" size={16} color={t.green} />
                      <View>
                        <Text style={[styles.sheetEstValue, { color: t.text }]}>{formatMinutes(estMins)}</Text>
                        <Text style={[styles.sheetEstLabel, { color: t.textTertiary }]}>Est. time</Text>
                      </View>
                    </View>
                    <View style={[styles.sheetEstDivider, { backgroundColor: t.border }]} />
                    <View style={styles.sheetEst}>
                      <Ionicons name="card-outline" size={16} color={t.green} />
                      <View>
                        <Text style={[styles.sheetEstValue, { color: t.text }]}>₱{estCost}</Text>
                        <Text style={[styles.sheetEstLabel, { color: t.textTertiary }]}>Est. cost</Text>
                      </View>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.sheetConfirm, { backgroundColor: t.green, opacity: kwh > 0 ? 1 : 0.5 }]}
                  onPress={confirmStartCharging}
                  disabled={kwh <= 0}
                >
                  <Ionicons name="flash" size={16} color="#fff" />
                  <Text style={styles.sheetConfirmText}>Start Charging</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setChargeSheet(null)} style={styles.sheetCancel}>
                  <Text style={[styles.sheetCancelText, { color: t.textTertiary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            );
          })()}
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 22, fontFamily: F.extraBold, marginBottom: 4, letterSpacing: -0.4 },
  address: { fontSize: 14, fontFamily: F.regular, marginBottom: 12 },
  topActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  networkBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  networkText: { fontSize: 12, fontFamily: F.semiBold },
  directionsButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  directionsText: { color: '#fff', fontSize: 13, fontFamily: F.bold },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stars: { flexDirection: 'row', marginRight: 8 },
  reviewCount: { fontSize: 13, fontFamily: F.regular },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontFamily: F.bold, marginBottom: 10, letterSpacing: -0.2 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  amenityText: { fontSize: 13, fontFamily: F.medium, textTransform: 'capitalize' },
  portCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  portHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  portNumber: { fontSize: 14, fontFamily: F.bold, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  portStatus: { fontSize: 12, fontFamily: F.semiBold },
  portDetail: { fontSize: 13, fontFamily: F.regular, marginBottom: 2 },
  portPrice: { fontSize: 14, fontFamily: F.bold, marginTop: 4 },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 11, marginTop: 10 },
  startButtonText: { color: '#fff', fontFamily: F.bold, fontSize: 14 },
  noData: { fontSize: 14, fontFamily: F.regular },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  writeReviewButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  writeReviewText: { fontSize: 13, fontFamily: F.semiBold },
  reviewCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  reviewerName: { fontSize: 14, fontFamily: F.semiBold },
  reviewStars: { flexDirection: 'row' },
  reviewComment: { fontSize: 14, fontFamily: F.regular, marginBottom: 6, lineHeight: 21 },
  reviewDate: { fontSize: 12, fontFamily: F.regular },
  portsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  refreshRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  liveText: { fontSize: 12, fontFamily: F.semiBold },
  inUseBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#e07b3918', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  inUseText: { fontSize: 13, fontFamily: F.semiBold, color: '#e07b39' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontFamily: F.bold, marginBottom: 16 },
  sheetPortInfo: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetPortLabel: { fontSize: 13, fontFamily: F.regular },
  sheetPortPrice: { fontSize: 13, fontFamily: F.bold },
  sheetLabel: { fontSize: 13, fontFamily: F.semiBold, marginBottom: 8 },
  kwhInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginBottom: 16 },
  kwhInput: { flex: 1, fontSize: 30, fontFamily: F.extraBold, paddingVertical: 12 },
  kwhUnit: { fontSize: 16, fontFamily: F.semiBold },
  sheetEstRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 20 },
  sheetEst: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetEstDivider: { width: 1, marginHorizontal: 8 },
  sheetEstValue: { fontSize: 16, fontFamily: F.bold },
  sheetEstLabel: { fontSize: 11, fontFamily: F.regular, marginTop: 2 },
  sheetConfirm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, marginBottom: 12 },
  sheetConfirmText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  sheetCancel: { alignItems: 'center', padding: 8 },
  sheetCancelText: { fontSize: 15, fontFamily: F.regular },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoIcon: { marginRight: 8 },
  infoLink: { fontSize: 14, fontFamily: F.regular, textDecorationLine: 'underline', flex: 1 },
  hoursCard: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 9 },
  hoursDay: { fontSize: 14, fontFamily: F.regular },
  hoursTime: { fontSize: 14, fontFamily: F.regular },
});

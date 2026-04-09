import { API_URL } from '../lib/config';
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../lib/firebase';
import { useTheme } from '../theme';



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
}

interface Station {
  id: string; name: string; address: string; city: string;
  province: string; network_name?: string; amenities: string[];
  average_rating: number; review_count: number; ports: Port[];
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

  async function startCharging(port: Port) {
    const user = auth.currentUser;
    if (!user) { Alert.alert('Sign in required'); return; }
    setStartingPort(port.id);
    try {
      const res = await fetch(`${API_URL}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.uid, displayName: user.displayName, email: user.email, stationId, portId: port.id }),
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

  useEffect(() => {
    fetch(`${API_URL}/api/v1/stations/${stationId}`)
      .then(res => res.json())
      .then(json => setStation(json.data))
      .catch(() => setError('Could not load station details'))
      .finally(() => setLoading(false));
  }, [stationId]);

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

      {station.network_name && (
        <View style={[styles.networkBadge, { backgroundColor: t.badge }]}>
          <Text style={[styles.networkText, { color: t.badgeText }]}>{station.network_name}</Text>
        </View>
      )}

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

      {station.amenities.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Amenities</Text>
          <View style={styles.amenitiesRow}>
            {station.amenities.map(a => (
              <View key={a} style={[styles.amenityChip, { backgroundColor: t.surface }]}>
                <Text style={[styles.amenityText, { color: t.textSecondary }]}>{a}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>Charging Ports ({station.ports.length})</Text>
        {station.ports.length === 0 ? (
          <Text style={[styles.noData, { color: t.textTertiary }]}>No ports listed yet.</Text>
        ) : (
          station.ports.map(port => (
            <View key={port.id} style={[styles.portCard, { borderColor: t.border }]}>
              <View style={styles.portHeader}>
                <Text style={[styles.portNumber, { color: t.text }]}>Port {port.port_number}</Text>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[port.status] ?? '#aaa' }]} />
                <Text style={[styles.portStatus, { color: STATUS_COLORS[port.status] ?? '#aaa' }]}>{port.status}</Text>
              </View>
              <Text style={[styles.portDetail, { color: t.textSecondary }]}>
                {CONNECTOR_LABELS[port.connector_type] ?? port.connector_type}
              </Text>
              <Text style={[styles.portDetail, { color: t.textSecondary }]}>
                {SPEED_LABELS[port.charging_speed] ?? port.charging_speed} · {port.max_kw} kW
              </Text>
              <Text style={[styles.portPrice, { color: t.green }]}>₱{port.price_per_kwh} / kWh</Text>
              {port.status === 'AVAILABLE' && (
                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: t.green }]}
                  onPress={() => startCharging(port)}
                  disabled={startingPort === port.id}
                >
                  {startingPort === port.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="flash" size={15} color="#fff" /><Text style={styles.startButtonText}>Start Charging</Text></>
                  }
                </TouchableOpacity>
              )}
            </View>
          ))
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  address: { fontSize: 14, marginBottom: 12 },
  networkBadge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  networkText: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stars: { flexDirection: 'row', marginRight: 8 },
  reviewCount: { fontSize: 13 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  amenityText: { fontSize: 13, textTransform: 'capitalize' },
  portCard: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10 },
  portHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  portNumber: { fontSize: 14, fontWeight: '700', flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  portStatus: { fontSize: 12, fontWeight: '600' },
  portDetail: { fontSize: 13, marginBottom: 2 },
  portPrice: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingVertical: 10, marginTop: 10 },
  startButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  noData: { fontSize: 14 },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  writeReviewButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  writeReviewText: { fontSize: 13, fontWeight: '600' },
  reviewCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  reviewerName: { fontSize: 14, fontWeight: '700' },
  reviewStars: { flexDirection: 'row' },
  reviewComment: { fontSize: 14, marginBottom: 6, lineHeight: 20 },
  reviewDate: { fontSize: 12 },
});

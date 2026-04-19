import { API_URL } from '../lib/config';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, View, ActivityIndicator, Text,
  TouchableOpacity, ScrollView, TextInput, Platform, Animated, Easing,
  useColorScheme,
} from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { MAP_STYLE_LIGHT, MAP_STYLE_DARK } from '../lib/mapStyle';

const MANILA_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

// Filter options — null means "All"
const FILTERS: { label: string; value: string | null; icon: string }[] = [
  { label: 'All',      value: null,       icon: 'flash' },
  { label: 'CCS2',     value: 'CCS2',     icon: 'flash' },
  { label: 'CHAdeMO',  value: 'CHADEMO',  icon: 'flash' },
  { label: 'Type 2',   value: 'TYPE2',    icon: 'flash' },
  { label: 'Type 1',   value: 'TYPE1',    icon: 'flash' },
  { label: 'NACS',     value: 'NACS',     icon: 'flash' },
  { label: 'GB/T AC',  value: 'GBAC',     icon: 'flash' },
  { label: 'GB/T DC',  value: 'GBACD',    icon: 'flash' },
  { label: 'DC Fast',  value: '__DCFC__', icon: 'flash' },
];

// Speed filter tag — stations that have at least one DCFC port
const DCFC_TAG = '__DCFC__';

interface Station {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  average_rating: number;
  port_count: number;
  has_available: boolean;
  connector_types: string[];
  charging_speeds?: string[];
}

// ── Shared pulse animation ────────────────────────────────────────────────────
// One module-level Animated.Value shared by ALL available-station pins.
// This lets markers render as plain <Marker> children (required for clustering)
// while still getting a synchronized pulse ring.
const pulseAnim = new Animated.Value(1);
Animated.loop(
  Animated.sequence([
    Animated.timing(pulseAnim, { toValue: 1.65, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
  ])
).start();

const pulseOpacity = pulseAnim.interpolate({ inputRange: [1, 1.65], outputRange: [0.55, 0] });

const markerStyles = StyleSheet.create({
  wrap:  { alignItems: 'center' },
  ring: {
    position: 'absolute',
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2,
    top: -8,
  },
  pin: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22, shadowRadius: 4, elevation: 5,
  },
  tail: {
    width: 0, height: 0, alignSelf: 'center',
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
});

export default function MapScreen() {
  const t = useTheme();
  const scheme = useColorScheme();
  const navigation = useNavigation<any>();
  const mapRef = useRef<any>(null);
  const mapStyle = scheme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [mapSearch, setMapSearch] = useState('');

  useEffect(() => {
    requestLocationAndLoad();
  }, []);

  async function requestLocationAndLoad() {
    // Always load all stations for the map; location is only used for zooming
    loadAllStations();
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);
        zoomToLocation(coords);
      }
    } catch {
      // location unavailable — map already loaded, just keep Manila default
    }
  }

  function zoomToLocation(coords: { latitude: number; longitude: number }) {
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.3, longitudeDelta: 0.3 }, 800);
  }

  function loadAllStations() {
    fetch(`${API_URL}/api/v1/stations`)
      .then(res => res.json())
      .then(json => setStations(json.data ?? []))
      .catch(() => setError('Could not load stations.'))
      .finally(() => setLoading(false));
  }

  function handleMyLocation() {
    if (userLocation) {
      zoomToLocation(userLocation);
    } else {
      requestLocationAndLoad();
    }
  }

  // Apply active filter + text search
  const searchQ = mapSearch.trim().toLowerCase();
  const visibleStations = stations.filter(s => {
    if (activeFilter) {
      if (activeFilter === DCFC_TAG) {
        const isDcfc = (s.charging_speeds ?? []).includes('DCFC') ||
          (s.connector_types ?? []).some(c => ['CCS1','CCS2','CHADEMO','NACS'].includes(c));
        if (!isDcfc) return false;
      } else if (!(s.connector_types ?? []).includes(activeFilter)) {
        return false;
      }
    }
    if (searchQ) {
      return s.name.toLowerCase().includes(searchQ) ||
        s.city.toLowerCase().includes(searchQ) ||
        s.address.toLowerCase().includes(searchQ);
    }
    return true;
  });

  // Count per filter for badges
  function countForFilter(value: string | null): number {
    if (!value) return stations.length;
    if (value === DCFC_TAG) {
      return stations.filter(s =>
        (s.connector_types ?? []).some(c => ['CCS1','CCS2','CHADEMO','NACS'].includes(c))
      ).length;
    }
    return stations.filter(s => (s.connector_types ?? []).includes(value)).length;
  }

  return (
    <View style={styles.container}>
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={MANILA_REGION}
        showsUserLocation
        customMapStyle={mapStyle}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        clusterColor="#FFFFFF"
        clusterTextColor={t.accent}
        radius={50}
        minPoints={3}
        maxZoom={14}
        renderCluster={(cluster: any) => {
          const { id, geometry, onPress, properties } = cluster;
          const count = properties.point_count;
          const size = count < 10 ? 40 : count < 50 ? 48 : 56;
          return (
            <Marker
              key={`cluster-${id}`}
              coordinate={{ latitude: geometry.coordinates[1], longitude: geometry.coordinates[0] }}
              onPress={onPress}
              tracksViewChanges={false}
            >
              <View style={[
                styles.cluster,
                {
                  width: size, height: size, borderRadius: size / 2,
                  backgroundColor: '#FFFFFF',
                  borderColor: t.accent,
                },
              ]}>
                <Ionicons name="flash" size={12} color={t.accent} />
                <Text style={[styles.clusterText, { color: t.accent }]}>{count}</Text>
              </View>
            </Marker>
          );
        }}
      >
        {visibleStations.map(station => {
          const available   = station.has_available;
          const borderColor = available ? t.accent : '#BBBBBB';
          return (
            <Marker
              key={station.id}
              coordinate={{ latitude: Number(station.latitude), longitude: Number(station.longitude) }}
              title={station.name}
              description={`${station.address} · Tap for details`}
              onCalloutPress={() => navigation.navigate('StationDetail', { stationId: station.id })}
              tracksViewChanges={false}
            >
              <View style={markerStyles.wrap}>
                {available && (
                  <Animated.View style={[
                    markerStyles.ring,
                    { borderColor, transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
                  ]} />
                )}
                <View style={[markerStyles.pin, { borderColor }]}>
                  <Ionicons name="flash" size={14} color={borderColor} />
                </View>
                <View style={[markerStyles.tail, { borderTopColor: borderColor }]} />
              </View>
            </Marker>
          );
        })}
      </ClusteredMapView>

      {/* Filter bar — slightly translucent so map peeks through */}
      <View style={[
        styles.filterBar,
        { backgroundColor: scheme === 'dark' ? 'rgba(20,24,32,0.96)' : 'rgba(255,255,255,0.97)' },
      ]}>
        {/* Search input */}
        <View style={[styles.mapSearchContainer, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Ionicons name="search" size={16} color={t.textTertiary} style={styles.mapSearchIcon} />
          <TextInput
            style={[styles.mapSearchInput, { color: t.text }]}
            placeholder="Search stations, cities..."
            placeholderTextColor={t.placeholder}
            value={mapSearch}
            onChangeText={setMapSearch}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map(f => {
            const count = countForFilter(f.value);
            if (count === 0 && f.value !== null) return null;
            const active = activeFilter === f.value;
            return (
              <TouchableOpacity
                key={f.label}
                style={[
                  styles.filterChip,
                  { backgroundColor: active ? t.accent : t.surface, borderColor: active ? t.accent : t.border },
                ]}
                onPress={() => setActiveFilter(active ? null : f.value)}
              >
                <Ionicons name="flash" size={11} color={active ? '#fff' : t.accent} />
                <Text style={[styles.filterLabel, { color: active ? '#fff' : t.text }]}>{f.label}</Text>
                {f.value !== null && (
                  <View style={[styles.filterBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : t.badge }]}>
                    <Text style={[styles.filterBadgeText, { color: active ? '#fff' : t.badgeText }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Station count */}
      {!loading && (
        <View style={[styles.countBadge, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.countText, { color: t.textSecondary }]}>
            {visibleStations.length} station{visibleStations.length !== 1 ? 's' : ''}
            {activeFilter ? ` · ${FILTERS.find(f => f.value === activeFilter)?.label}` : ''}
          </Text>
        </View>
      )}

      {/* My location button */}
      <TouchableOpacity
        style={[
          styles.locationButton,
          { backgroundColor: scheme === 'dark' ? '#1E2430' : '#FFFFFF' },
        ]}
        onPress={handleMyLocation}
      >
        <Ionicons name="locate" size={22} color={t.accent} />
      </TouchableOpacity>

      {loading && (
        <View style={[styles.overlay, { backgroundColor: t.overlay }]}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      )}

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: t.destructive }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  filterBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: 52,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  mapSearchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginBottom: 8,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10,
  },
  mapSearchIcon: { marginRight: 6 },
  mapSearchInput: { flex: 1, paddingVertical: 9, fontSize: 14 },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  countBadge: {
    position: 'absolute',
    top: 152,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  countText: { fontSize: 12, fontWeight: '600' },

  locationButton: {
    position: 'absolute', bottom: 32, right: 16,
    borderRadius: 28, width: 48, height: 48,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  errorBanner: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    padding: 12, borderRadius: 8,
  },
  errorText: { color: '#fff', textAlign: 'center' },
  cluster: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 4, elevation: 5,
  },
  clusterText: { fontWeight: '800', fontSize: 12, lineHeight: 14 },
});

import { API_URL } from '../lib/config';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, View, ActivityIndicator, Text,
  TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

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

export default function MapScreen() {
  const t = useTheme();
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);
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
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={MANILA_REGION}
        showsUserLocation
      >
        {visibleStations.map(station => (
          <Marker
            key={station.id}
            coordinate={{ latitude: Number(station.latitude), longitude: Number(station.longitude) }}
            title={station.name}
            description={`${station.address} · Tap for details`}
            onCalloutPress={() => navigation.navigate('StationDetail', { stationId: station.id })}
          >
            <View style={[styles.markerContainer, {
              backgroundColor: station.has_available ? t.accent : '#888',
            }]}>
              <Ionicons name="flash" size={14} color="#fff" />
            </View>
            <View style={[styles.markerTail, {
              borderTopColor: station.has_available ? t.accent : '#888',
            }]} />
          </Marker>
        ))}
      </MapView>

      {/* Filter bar */}
      <View style={[styles.filterBar, { backgroundColor: t.background }]}>
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
        style={[styles.locationButton, { backgroundColor: t.mapButton }]}
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
  markerContainer: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 5,
  },
  markerTail: {
    width: 0, height: 0, alignSelf: 'center',
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
});

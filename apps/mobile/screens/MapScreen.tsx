import { API_URL } from '../lib/config';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';



const MANILA_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

interface Station {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  average_rating: number;
  port_count: number;
}

export default function MapScreen() {
  const t = useTheme();
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    requestLocationAndLoad();
  }, []);

  async function requestLocationAndLoad() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);
        zoomToLocation(coords);
        loadNearbyStations(coords);
      } else {
        loadAllStations();
      }
    } catch {
      loadAllStations();
    }
  }

  function zoomToLocation(coords: { latitude: number; longitude: number }) {
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 800);
  }

  function loadNearbyStations(coords: { latitude: number; longitude: number }) {
    fetch(`${API_URL}/api/v1/stations?lat=${coords.latitude}&lng=${coords.longitude}&radius=20`)
      .then(res => res.json())
      .then(json => setStations(json.data ?? []))
      .catch(() => setError('Could not load stations.'))
      .finally(() => setLoading(false));
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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={MANILA_REGION}
        showsUserLocation
      >
        {stations.map(station => (
          <Marker
            key={station.id}
            coordinate={{ latitude: Number(station.latitude), longitude: Number(station.longitude) }}
            title={station.name}
            description={`${station.address} · Tap for details`}
            pinColor={t.green}
            onCalloutPress={() => navigation.navigate('StationDetail', { stationId: station.id })}
          />
        ))}
      </MapView>

      <TouchableOpacity style={[styles.locationButton, { backgroundColor: t.mapButton }]} onPress={handleMyLocation}>
        <Ionicons name="locate" size={22} color={t.green} />
      </TouchableOpacity>

      {loading && (
        <View style={[styles.overlay, { backgroundColor: t.overlay }]}>
          <ActivityIndicator size="large" color={t.green} />
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
});

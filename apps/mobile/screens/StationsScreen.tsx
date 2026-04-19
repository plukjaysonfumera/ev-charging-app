import { API_URL } from '../lib/config';
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, F } from '../theme';
import { useFavorites } from '../hooks/useFavorites';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';



// Preferred display order — only shown if at least one station has that type
const CONNECTOR_ORDER = ['CCS2', 'TYPE2', 'CHADEMO', 'GBAC', 'GBACD', 'NACS', 'CCS1', 'TYPE1', 'TESLA_S'];
const CONNECTOR_LABELS: Record<string, string> = {
  CCS2: 'CCS2', TYPE2: 'Type 2', CHADEMO: 'CHAdeMO',
  GBAC: 'GB/T AC', GBACD: 'GB/T DC', NACS: 'NACS',
  CCS1: 'CCS1', TYPE1: 'Type 1', TESLA_S: 'Tesla',
};
const AVAILABILITY_FILTERS = ['All', 'Available'];

interface Station {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  network_name?: string;
  average_rating: number;
  review_count: number;
  port_count: number;
  has_available: boolean;
  connector_types: string[];
  latitude: number;
  longitude: number;
}

export default function StationsScreen() {
  const t = useTheme();
  const navigation = useNavigation<any>();
  const { favorites, isFavorite } = useFavorites();
  const [stations, setStations] = useState<Station[]>([]);
  const [filtered, setFiltered] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Station[] | null>(null);
  const [connectorFilter, setConnectorFilter] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('All');
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => { loadStations(); }, []);
  useEffect(() => { applyFilters(); }, [search, searchResults, connectorFilter, availabilityFilter, stations, showSaved, favorites]);

  // Debounced API search — fires when query >= 2 chars
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/stations?q=${encodeURIComponent(trimmed)}`);
        const json = await res.json();
        setSearchResults(json.data ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Re-apply filters when returning from detail (bookmark may have changed)
  useFocusEffect(useCallback(() => { applyFilters(); }, [stations, showSaved, favorites]));

  async function loadStations(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/stations`);
      const json = await res.json();
      setStations(json.data ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function applyFilters() {
    // Use API search results when active, otherwise fall back to preloaded list
    let result = searchResults !== null ? [...searchResults] : [...stations];

    // Saved filter
    if (showSaved) {
      result = result.filter(s => isFavorite(s.id));
    }

    // Connector filter
    if (connectorFilter !== 'All') {
      result = result.filter(s =>
        Array.isArray(s.connector_types) &&
        s.connector_types.includes(connectorFilter)
      );
    }

    // Availability filter
    if (availabilityFilter === 'Available') {
      result = result.filter(s => s.has_available);
    }

    setFiltered(result);
  }

  // Build connector filter list from actual data — only types that exist
  const availableConnectorTypes = CONNECTOR_ORDER.filter(ct =>
    stations.some(s => s.connector_types?.includes(ct))
  );
  const connectorFilters = ['All', ...availableConnectorTypes];

  const activeFilterCount =
    (connectorFilter !== 'All' ? 1 : 0) +
    (availabilityFilter !== 'All' ? 1 : 0);

  function clearFilters() {
    setConnectorFilter('All');
    setAvailabilityFilter('All');
  }

  function renderStars(rating: number) {
    const stars = Math.round(rating);
    return [1, 2, 3, 4, 5].map(i => (
      <Ionicons key={i} name={i <= stars ? 'star' : 'star-outline'} size={12} color={t.star} />
    ));
  }

  // Connector type color map for pills
  const CONNECTOR_COLORS: Record<string, { bg: string; text: string }> = {
    CCS2:    { bg: '#EFF6FF', text: '#1D4ED8' },
    CCS1:    { bg: '#EFF6FF', text: '#1D4ED8' },
    CHADEMO: { bg: '#FFF7ED', text: '#C2410C' },
    TYPE2:   { bg: '#F0FDF4', text: '#15803D' },
    TYPE1:   { bg: '#F0FDF4', text: '#15803D' },
    NACS:    { bg: '#FAF5FF', text: '#7C3AED' },
    GBAC:    { bg: '#FEFCE8', text: '#A16207' },
    GBACD:   { bg: '#FEFCE8', text: '#A16207' },
    TESLA_S: { bg: '#FFF1F2', text: '#BE123C' },
  };

  function renderItem({ item }: { item: Station }) {
    const isAvailable = item.has_available;
    const connColor = isAvailable ? t.accent : '#888';
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: t.surfaceElevated },
        ]}
        onPress={() => navigation.navigate('StationDetail', { stationId: item.id })}
        activeOpacity={0.85}
      >
        {/* Left availability accent bar */}
        <View style={[styles.accentBar, { backgroundColor: connColor }]} />

        <View style={styles.cardInner}>
          {/* Top row */}
          <View style={styles.cardTop}>
            <View style={[styles.stationIconBox, { backgroundColor: isAvailable ? t.badge : t.surface }]}>
              <Ionicons name="flash" size={18} color={connColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stationName, { color: t.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.address, { color: t.textTertiary }]} numberOfLines={1}>
                {item.city}{item.network_name ? ` · ${item.network_name}` : ''}
              </Text>
            </View>
            <View style={[
              styles.availPill,
              { backgroundColor: isAvailable ? '#DCFCE7' : t.surface, borderColor: isAvailable ? '#16A34A' : t.border },
            ]}>
              <View style={[styles.availDot, { backgroundColor: isAvailable ? '#16A34A' : '#888' }]} />
              <Text style={[styles.availText, { color: isAvailable ? '#15803D' : '#888' }]}>
                {isAvailable ? 'Available' : 'Occupied'}
              </Text>
            </View>
          </View>

          {/* Connector type pills */}
          {Array.isArray(item.connector_types) && item.connector_types.length > 0 && (
            <View style={styles.connectorRow}>
              {item.connector_types.slice(0, 5).map(ct => {
                const c = CONNECTOR_COLORS[ct] ?? { bg: t.surface, text: t.textSecondary };
                return (
                  <View key={ct} style={[styles.connectorPill, { backgroundColor: c.bg }]}>
                    <Ionicons name="flash" size={9} color={c.text} />
                    <Text style={[styles.connectorPillText, { color: c.text }]}>{ct.replace('_', ' ')}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.stars}>{renderStars(item.average_rating)}</View>
            <Text style={[styles.reviewCount, { color: t.textTertiary }]}>
              {item.average_rating > 0 ? `${item.average_rating.toFixed(1)} ` : ''}({item.review_count})
            </Text>
            <View style={[styles.dot, { backgroundColor: t.border }]} />
            <Ionicons name="flash-outline" size={12} color={t.accent} />
            <Text style={[styles.portCount, { color: t.accent }]}>
              {item.port_count} port{item.port_count !== 1 ? 's' : ''}
            </Text>
            {isFavorite(item.id) && (
              <>
                <View style={[styles.dot, { backgroundColor: t.border }]} />
                <Ionicons name="bookmark" size={12} color={t.accent} />
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: t.surface }]}>
        <ActivityIndicator size="large" color={t.green} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.surface }]}>
      {/* All / Saved toggle */}
      <View style={[styles.toggleRow, { borderBottomColor: t.border }]}>
        <TouchableOpacity
          style={[styles.toggleTab, !showSaved && { borderBottomColor: t.accent, borderBottomWidth: 2 }]}
          onPress={() => setShowSaved(false)}
        >
          <Text style={[styles.toggleText, { color: showSaved ? t.textTertiary : t.accent }]}>All Stations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleTab, showSaved && { borderBottomColor: t.accent, borderBottomWidth: 2 }]}
          onPress={() => setShowSaved(true)}
        >
          <Ionicons name="bookmark" size={14} color={showSaved ? t.accent : t.textTertiary} />
          <Text style={[styles.toggleText, { color: showSaved ? t.accent : t.textTertiary }]}>
            Saved{favorites.size > 0 ? ` (${favorites.size})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: t.surfaceElevated, borderColor: t.border }]}>
        {searching
          ? <ActivityIndicator size="small" color={t.green} style={styles.searchIcon} />
          : <Ionicons name="search" size={18} color={t.textTertiary} style={styles.searchIcon} />
        }
        <TextInput
          style={[styles.searchInput, { color: t.text }]}
          placeholder="Search stations, cities..."
          placeholderTextColor={t.placeholder}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Connector Filter */}
      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: t.textTertiary }]}>Connector</Text>
        <FlatList
          horizontal
          data={connectorFilters}
          keyExtractor={i => i}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => {
            const active = connectorFilter === item;
            const label = item === 'All' ? 'All' : (CONNECTOR_LABELS[item] ?? item);
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: t.surfaceElevated, borderColor: t.border },
                  active && { backgroundColor: t.green, borderColor: t.green },
                ]}
                onPress={() => setConnectorFilter(item)}
              >
                <Text style={[styles.filterText, { color: t.textSecondary }, active && { color: '#fff', fontWeight: '600' }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Availability Filter */}
      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: t.textTertiary }]}>Availability</Text>
        <View style={styles.availRow}>
          {AVAILABILITY_FILTERS.map(item => {
            const active = availabilityFilter === item;
            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.filterChip,
                  { backgroundColor: t.surfaceElevated, borderColor: t.border },
                  active && { backgroundColor: t.green, borderColor: t.green },
                ]}
                onPress={() => setAvailabilityFilter(item)}
              >
                {item === 'Available' && (
                  <View style={[styles.availIndicator, { backgroundColor: active ? '#fff' : '#22C55E' }]} />
                )}
                <Text style={[styles.filterText, { color: t.textSecondary }, active && { color: '#fff', fontWeight: '600' }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Results row */}
      <View style={styles.resultsRow}>
        <Text style={[styles.resultsCount, { color: t.textTertiary }]}>
          {filtered.length} station{filtered.length !== 1 ? 's' : ''}
        </Text>
        {activeFilterCount > 0 && (
          <TouchableOpacity onPress={clearFilters} style={[styles.clearBtn, { backgroundColor: t.green + '18' }]}>
            <Text style={[styles.clearBtnText, { color: t.green }]}>Clear filters ({activeFilterCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadStations(true)} tintColor={t.green} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons
              name={showSaved ? 'bookmark-outline' : 'flash-off-outline'}
              size={48} color={t.border}
            />
            <Text style={[styles.emptyText, { color: t.textTertiary }]}>
              {showSaved ? 'No saved stations yet' : searchResults !== null ? `No results for "${search.trim()}"` : 'No stations found'}
            </Text>
            {showSaved && (
              <Text style={[styles.emptySubtext, { color: t.textTertiary }]}>
                Tap the bookmark icon on any station to save it here
              </Text>
            )}
            {!showSaved && activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearFilters} style={{ marginTop: 12 }}>
                <Text style={[styles.clearBtnText, { color: t.green }]}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, marginBottom: 8, borderRadius: 12,
    paddingHorizontal: 12, borderWidth: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: F.regular },
  filterSection: { paddingHorizontal: 12, marginBottom: 6 },
  filterLabel: { fontSize: 10, fontFamily: F.extraBold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  filterRow: { gap: 8 },
  availRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1,
  },
  filterText: { fontSize: 13, fontFamily: F.medium },
  availIndicator: { width: 7, height: 7, borderRadius: 4 },
  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 6 },
  resultsCount: { fontSize: 12, fontFamily: F.regular },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  clearBtnText: { fontSize: 12, fontFamily: F.semiBold },
  list: { padding: 12, paddingTop: 4 },
  card: {
    borderRadius: 16, marginBottom: 10, overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  accentBar: { width: 4 },
  cardInner: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stationIconBox: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  stationName: { fontSize: 14, fontFamily: F.semiBold, letterSpacing: -0.1 },
  address: { fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  availPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1,
  },
  availDot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 10, fontFamily: F.bold },
  connectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  connectorPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  connectorPillText: { fontSize: 10, fontFamily: F.bold },
  cardFooter: { flexDirection: 'row', alignItems: 'center' },
  stars: { flexDirection: 'row' },
  reviewCount: { fontSize: 12, fontFamily: F.regular, marginLeft: 4 },
  dot: { width: 3, height: 3, borderRadius: 2, marginHorizontal: 8 },
  portCount: { fontSize: 12, fontFamily: F.semiBold, marginLeft: 2 },
  emptyText: { fontSize: 15, fontFamily: F.medium, marginTop: 12 },
  emptySubtext: { fontSize: 13, fontFamily: F.regular, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
  toggleRow: { flexDirection: 'row', borderBottomWidth: 1 },
  toggleTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  toggleText: { fontSize: 14, fontFamily: F.semiBold },
});

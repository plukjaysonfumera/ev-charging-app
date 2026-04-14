import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@phevph:favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setFavorites(new Set(JSON.parse(raw))); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next: Set<string>) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }, []);

  const toggle = useCallback(async (stationId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(stationId)) {
        next.delete(stationId);
      } else {
        next.add(stationId);
      }
      persist(next);
      return next;
    });
  }, [persist]);

  const isFavorite = useCallback(
    (stationId: string) => favorites.has(stationId),
    [favorites],
  );

  return { favorites, isFavorite, toggle, loaded };
}

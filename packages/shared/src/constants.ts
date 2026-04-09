export const DEFAULT_RADIUS_KM = 10;
export const MAX_RADIUS_KM = 100;
export const DEFAULT_CURRENCY = 'PHP';
export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'fil'] as const;

export const PHILIPPINE_PROVINCES = [
  'Metro Manila',
  'Cebu',
  'Davao',
  'Laguna',
  'Cavite',
  'Rizal',
  'Bulacan',
  'Pampanga',
  'Batangas',
  'Quezon',
] as const;

// Center of the Philippines (approx)
export const PH_CENTER_COORDS = {
  latitude: 12.8797,
  longitude: 121.7740,
} as const;

/**
 * Custom Google Maps styles for PHEV PH.
 * Applied via ClusteredMapView `customMapStyle` prop (Android + iOS PROVIDER_GOOGLE).
 * iOS Apple Maps uses `mapType="mutedStandard"` instead — no JSON needed.
 */

// ── Light ─────────────────────────────────────────────────────────────────────
// Clean, minimal off-white — white/red pins pop against the muted base.
export const MAP_STYLE_LIGHT = [
  // Base land — warm off-white
  { elementType: 'geometry',           stylers: [{ color: '#F0EDE8' }] },

  // All text
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F0EDE8' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#8A8070' }] },

  // Hide POI clutter
  { featureType: 'poi',                           stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#DFF0D8' }, { visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'labels',   stylers: [{ visibility: 'off' }] },

  // Transit — minimal
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  // Water — soft slate blue
  { featureType: 'water', elementType: 'geometry',        stylers: [{ color: '#C8DCE8' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9EB4C0' }] },

  // Local roads — white on warm base
  { featureType: 'road',                elementType: 'geometry.fill',   stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road',                elementType: 'geometry.stroke', stylers: [{ color: '#E0DAD2' }] },
  { featureType: 'road',                elementType: 'labels.text.fill', stylers: [{ color: '#9A9080' }] },

  // Arterials — slightly darker
  { featureType: 'road.arterial', elementType: 'geometry.fill',   stylers: [{ color: '#F8F4EF' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#D8D0C4' }] },

  // Highways — light gray
  { featureType: 'road.highway', elementType: 'geometry.fill',   stylers: [{ color: '#EDE8E0' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#D0C8BC' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#706050' }] },

  // Administrative borders — subtle
  { featureType: 'administrative',                elementType: 'geometry.stroke', stylers: [{ color: '#C8C0B4' }] },
  { featureType: 'administrative.locality',       elementType: 'labels.text.fill', stylers: [{ color: '#706050' }] },
  { featureType: 'administrative.neighborhood',   elementType: 'labels.text.fill', stylers: [{ color: '#A09080' }] },
];

// ── Dark ──────────────────────────────────────────────────────────────────────
// Deep navy base — red pins glow like charging indicators in the night.
export const MAP_STYLE_DARK = [
  // Base land — deep charcoal-blue
  { elementType: 'geometry',           stylers: [{ color: '#141820' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#141820' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#4A5568' }] },

  // Hide POI clutter
  { featureType: 'poi',                             stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1A2420' }, { visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'labels',   stylers: [{ visibility: 'off' }] },

  // Transit — off
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  // Water — dark teal
  { featureType: 'water', elementType: 'geometry',         stylers: [{ color: '#0E1620' }] },
  { featureType: 'water', elementType: 'labels.text.fill',  stylers: [{ color: '#2D4A5A' }] },

  // Local roads
  { featureType: 'road',          elementType: 'geometry.fill',   stylers: [{ color: '#1E2430' }] },
  { featureType: 'road',          elementType: 'geometry.stroke', stylers: [{ color: '#12161E' }] },
  { featureType: 'road',          elementType: 'labels.text.fill', stylers: [{ color: '#3A4455' }] },

  // Arterials
  { featureType: 'road.arterial', elementType: 'geometry.fill',   stylers: [{ color: '#242C3A' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#161C28' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#4A5568' }] },

  // Highways — slightly brighter so major routes are readable
  { featureType: 'road.highway', elementType: 'geometry.fill',   stylers: [{ color: '#2A3345' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1A2030' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#5A6880' }] },

  // Administrative
  { featureType: 'administrative',              elementType: 'geometry.stroke', stylers: [{ color: '#1E2840' }] },
  { featureType: 'administrative.locality',     elementType: 'labels.text.fill', stylers: [{ color: '#5A6880' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#3A4455' }] },
];

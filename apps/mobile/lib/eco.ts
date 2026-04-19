/**
 * Eco / environmental impact calculations for PHEV PH.
 *
 * Assumptions (Philippine context):
 *   - PH grid emission factor: ~0.56 kg CO₂/kWh
 *   - Equivalent ICE car: 10 km/L, 2.3 kg CO₂/L → 0.23 kg CO₂/km
 *   - EV efficiency: ~6 km/kWh → 6 × 0.23 = 1.38 kg CO₂/kWh (if gas)
 *   - Net saving per kWh: 1.38 − 0.56 ≈ 0.82 → we use 0.7 conservatively
 *   - 1 mature tree absorbs ~22 kg CO₂/year
 *   - 1 liter of gasoline ≈ 0.75 kg saved at 0.7 kg/kWh × ~1.07 kWh/L equiv
 */

export const CO2_KG_PER_KWH = 0.7;       // kg CO₂ saved per kWh charged
const TREE_KG_PER_YEAR      = 22;         // kg CO₂ absorbed by one tree/year
const KWH_PER_LITER_GAS     = 10 / 6;    // ~1.67 kWh eq per liter of fuel avoided

export function co2SavedKg(totalKwh: number): number {
  return parseFloat((totalKwh * CO2_KG_PER_KWH).toFixed(1));
}

export function treesEquivalent(co2Kg: number): number {
  return Math.max(0, Math.floor(co2Kg / TREE_KG_PER_YEAR));
}

export function litersGasSaved(totalKwh: number): number {
  return parseFloat((totalKwh / KWH_PER_LITER_GAS).toFixed(1));
}

export function formatCo2(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(1)} kg`;
}

/** Estimate driving ETA in Manila traffic (~25 km/h avg city speed) */
export function etaMinutes(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / (25_000 / 60)));
}

export function formatEta(distanceMeters: number): string {
  const mins = etaMinutes(distanceMeters);
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins} min`;
}

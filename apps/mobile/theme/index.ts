import { useColorScheme } from 'react-native';

// ─── Font families (Inter) ────────────────────────────────────────────────────
export const F = {
  regular:   'Inter-Regular',
  medium:    'Inter-Medium',
  semiBold:  'Inter-SemiBold',
  bold:      'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
  black:     'Inter-Black',
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

// ─── Spacing grid (8pt) ───────────────────────────────────────────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────
export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999,
} as const;

// ─── Colors ───────────────────────────────────────────────────────────────────
export const Colors = {
  light: {
    // Backgrounds
    background:      '#F8F8F8',
    surface:         '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted:    '#F2F2F7',

    // Text
    text:            '#0A0A0A',
    textSecondary:   '#5A5A68',
    textTertiary:    '#AEAEB2',
    placeholder:     '#AEAEB2',

    // Borders & separators
    border:          '#EBEBEB',
    separator:       '#F5F5F5',

    // Brand / accent (keep red)
    green:           '#E3000F',
    greenLight:      '#E3000F',
    greenTint:       '#FFF0F0',
    greenTintBorder: '#FECDD3',
    accent:          '#E3000F',
    accentSoft:      '#FFF0F1',

    // Semantic
    destructive:     '#FF3B30',
    star:            '#F59E0B',
    eco:             '#16A34A',
    ecoSoft:         '#DCFCE7',

    // Chrome
    tabBar:          '#FFFFFF',
    headerBg:        '#111827',    // dark header — premium feel
    headerText:      '#FFFFFF',
    inputBg:         '#F2F2F7',

    // Badges
    badge:           '#FFE4E6',
    badgeText:       '#E3000F',
    overlay:         'rgba(255,255,255,0.85)',
    mapButton:       '#FFFFFF',
  },
  dark: {
    // Backgrounds
    background:      '#0A0A0A',
    surface:         '#161618',
    surfaceElevated: '#1E1E20',
    surfaceMuted:    '#1C1C1E',

    // Text
    text:            '#F5F5F5',
    textSecondary:   '#AEAEB2',
    textTertiary:    '#636366',
    placeholder:     '#636366',

    // Borders & separators
    border:          '#2C2C2E',
    separator:       '#222224',

    // Brand / accent
    green:           '#FF453A',
    greenLight:      '#FF453A',
    greenTint:       '#2D0000',
    greenTintBorder: '#7F1D1D',
    accent:          '#FF453A',
    accentSoft:      '#2D0000',

    // Semantic
    destructive:     '#FF453A',
    star:            '#FFD60A',
    eco:             '#4ADE80',
    ecoSoft:         '#14532D',

    // Chrome
    tabBar:          '#111111',
    headerBg:        '#111111',
    headerText:      '#FFFFFF',
    inputBg:         '#2C2C2E',

    // Badges
    badge:           '#2D0000',
    badgeText:       '#FF453A',
    overlay:         'rgba(0,0,0,0.85)',
    mapButton:       '#2C2C2E',
  },
};

export type Theme = typeof Colors.light;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}

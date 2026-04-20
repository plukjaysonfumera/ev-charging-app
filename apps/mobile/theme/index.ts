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

// ─── Spacing (4pt base, like Figma) ──────────────────────────────────────────
export const Spacing = {
  xs:   4,
  sm:   8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl:32,
} as const;

// ─── Border radius (Figma-accurate) ──────────────────────────────────────────
// Figma uses 6–8px for most things; only modals/sheets get 12–16px
export const Radius = {
  xs:   4,    // tiny badge, tag
  sm:   6,    // input, small button, chip
  md:   8,    // card, panel, standard button
  lg:  12,    // modal, bottom sheet
  xl:  16,    // large card, drawer
  full:9999,  // true pill
} as const;

// ─── Shadows (Figma's very-subtle elevation) ──────────────────────────────────
export const Shadow = {
  xs: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ─── Color palette (Figma / Untitled UI gray scale) ───────────────────────────
// Light uses a warm-neutral gray (gray-25 = #FCFCFD, gray-50 = #F9FAFB,
// gray-100 = #F2F4F7, gray-200 = #EAECF0, gray-500 = #667085,
// gray-600 = #475467, gray-700 = #344054, gray-900 = #101828)
export const Colors = {
  light: {
    // ── Page / surface
    background:       '#F9FAFB',   // gray-50  — page bg (not pure white)
    surface:          '#FFFFFF',   // white    — card, panel
    surfaceElevated:  '#FFFFFF',   // white    — modal, sheet
    surfaceMuted:     '#F2F4F7',   // gray-100 — section bg, input fill

    // ── Text
    text:             '#101828',   // gray-900
    textSecondary:    '#475467',   // gray-600
    textTertiary:     '#98A2B3',   // gray-400
    placeholder:      '#98A2B3',

    // ── Borders
    border:           '#EAECF0',   // gray-200
    separator:        '#F2F4F7',   // gray-100

    // ── Brand
    green:            '#E3000F',
    greenLight:       '#E3000F',
    greenTint:        '#FEF2F2',
    greenTintBorder:  '#FECDD3',
    accent:           '#E3000F',
    accentSoft:       '#FEF2F2',   // red-50

    // ── Semantic
    destructive:      '#D92D20',
    star:             '#F79009',   // amber-400
    eco:              '#027A48',   // green-800
    ecoSoft:          '#ECFDF3',   // green-50

    // ── Chrome
    tabBar:           '#FFFFFF',
    headerBg:         '#101828',   // gray-900 — premium dark header
    headerText:       '#FFFFFF',
    inputBg:          '#F9FAFB',

    // ── Badges
    badge:            '#FEF2F2',
    badgeText:        '#E3000F',
    overlay:          'rgba(16,24,40,0.6)',
    mapButton:        '#FFFFFF',
  },
  dark: {
    // ── Page / surface
    background:       '#0C111D',   // near-black
    surface:          '#161B27',   // gray-900 dark
    surfaceElevated:  '#1D2939',   // gray-800 dark
    surfaceMuted:     '#182230',   // slightly lighter

    // ── Text
    text:             '#F9FAFB',   // gray-50
    textSecondary:    '#98A2B3',   // gray-400
    textTertiary:     '#475467',   // gray-600
    placeholder:      '#475467',

    // ── Borders
    border:           '#1D2939',   // gray-800
    separator:        '#161B27',

    // ── Brand
    green:            '#FF6B6B',
    greenLight:       '#FF6B6B',
    greenTint:        '#2D0000',
    greenTintBorder:  '#7F1D1D',
    accent:           '#FF6B6B',
    accentSoft:       '#2D0000',

    // ── Semantic
    destructive:      '#F97066',
    star:             '#FDB022',
    eco:              '#12B76A',
    ecoSoft:          '#054F31',

    // ── Chrome
    tabBar:           '#101828',
    headerBg:         '#0C111D',
    headerText:       '#FFFFFF',
    inputBg:          '#1D2939',

    // ── Badges
    badge:            '#2D0000',
    badgeText:        '#FF6B6B',
    overlay:          'rgba(0,0,0,0.7)',
    mapButton:        '#1D2939',
  },
};

export type Theme = typeof Colors.light;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}

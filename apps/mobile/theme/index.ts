import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    background:      '#FFFFFF',
    surface:         '#F2F2F7',
    surfaceElevated: '#FFFFFF',
    text:            '#0D0D0D',
    textSecondary:   '#6B6B6B',
    textTertiary:    '#AEAEB2',
    border:          '#E5E5EA',
    separator:       '#F0F0F0',
    green:           '#0A84FF',
    greenLight:      '#0A84FF',
    greenTint:       '#EBF4FF',
    greenTintBorder: '#BFDBFE',
    accent:          '#0A84FF',
    destructive:     '#FF3B30',
    star:            '#F5A623',
    tabBar:          '#FFFFFF',
    headerBg:        '#0A84FF',
    headerText:      '#FFFFFF',
    inputBg:         '#F2F2F7',
    placeholder:     '#AEAEB2',
    badge:           '#DBEAFE',
    badgeText:       '#0A84FF',
    overlay:         'rgba(255,255,255,0.7)',
    mapButton:       '#FFFFFF',
  },
  dark: {
    background:      '#000000',
    surface:         '#1C1C1E',
    surfaceElevated: '#2C2C2E',
    text:            '#FFFFFF',
    textSecondary:   '#AEAEB2',
    textTertiary:    '#636366',
    border:          '#38383A',
    separator:       '#2C2C2E',
    green:           '#0A84FF',
    greenLight:      '#0A84FF',
    greenTint:       '#001829',
    greenTintBorder: '#003366',
    accent:          '#0A84FF',
    destructive:     '#FF453A',
    star:            '#FFD60A',
    tabBar:          '#1C1C1E',
    headerBg:        '#1C1C1E',
    headerText:      '#FFFFFF',
    inputBg:         '#2C2C2E',
    placeholder:     '#636366',
    badge:           '#001829',
    badgeText:       '#0A84FF',
    overlay:         'rgba(0,0,0,0.7)',
    mapButton:       '#2C2C2E',
  },
};

export type Theme = typeof Colors.light;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}

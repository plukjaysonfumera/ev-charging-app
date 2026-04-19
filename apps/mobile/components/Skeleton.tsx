import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle, useColorScheme } from 'react-native';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/** Single shimmer skeleton block */
export function SkeletonBlock({ width = '100%', height = 16, borderRadius = 8, style }: Props) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const scheme  = useColorScheme();
  const base    = scheme === 'dark' ? '#2A2A2A' : '#E0E0E0';
  const highlight = scheme === 'dark' ? '#3A3A3A' : '#F0F0F0';

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const bg = shimmer.interpolate({ inputRange: [0, 1], outputRange: [base, highlight] });

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: bg }, style]}
    />
  );
}

/** Pre-built skeleton for a station list card */
export function StationCardSkeleton() {
  return (
    <View style={sk.card}>
      <SkeletonBlock width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="50%" height={11} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <SkeletonBlock width={60} height={22} borderRadius={11} />
          <SkeletonBlock width={60} height={22} borderRadius={11} />
        </View>
      </View>
    </View>
  );
}

/** Pre-built skeleton for the nearby station card on HomeScreen */
export function NearbyCardSkeleton() {
  return (
    <View style={sk.nearbyCard}>
      <SkeletonBlock width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBlock width="65%" height={15} />
        <SkeletonBlock width="45%" height={12} />
        <SkeletonBlock width={100} height={22} borderRadius={11} />
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  nearbyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
  },
});

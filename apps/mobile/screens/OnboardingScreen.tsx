import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Dimensions, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'flash' as const,
    label: '01',
    title: 'Welcome to\nPHEV PH',
    subtitle: 'Power your journey.\nDiscover, charge, and move — smarter.',
  },
  {
    id: '2',
    icon: 'map' as const,
    label: '02',
    title: 'Always\nWithin Reach',
    subtitle: 'Live map. Real-time availability.\nEvery station, right where you need it.',
  },
  {
    id: '3',
    icon: 'battery-charging' as const,
    label: '03',
    title: 'Plug In.\nPower Up.',
    subtitle: 'Select a port, tap Start —\nthen watch your charge come alive.',
  },
  {
    id: '4',
    icon: 'card' as const,
    label: '04',
    title: 'Pay Without\nHesitation',
    subtitle: 'GCash, Maya, or card.\nSecured by PayMongo. Done in a tap.',
  },
  {
    id: '5',
    icon: 'people' as const,
    label: '05',
    title: 'Drive Smarter,\nTogether',
    subtitle: 'Rate stations. Share insights.\nHelp build a better network for everyone.',
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const t = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  async function handleDone() {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    onDone();
  }

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleDone();
    }
  }

  function renderSlide({ item }: { item: typeof SLIDES[0] }) {
    return (
      <View style={styles.slide}>
        <Text style={[styles.slideLabel, { color: t.border }]}>{item.label}</Text>

        <View style={[styles.iconRingOuter, { backgroundColor: t.accent + '0D' }]}>
          <View style={[styles.iconRingInner, { backgroundColor: t.accent + '18' }]}>
            <Ionicons name={item.icon} size={52} color={t.accent} />
          </View>
        </View>

        <Text style={[styles.title, { color: t.text }]}>{item.title}</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>{item.subtitle}</Text>
      </View>
    );
  }

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleDone}
        disabled={isLast}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.skipText, { color: isLast ? 'transparent' : t.textTertiary }]}>Skip</Text>
      </TouchableOpacity>

      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={s => s.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={e => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        style={styles.flatList}
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [6, 20, 6],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.2, 1, 0.2],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity, backgroundColor: t.accent }]} />
          );
        })}
      </View>

      <View style={styles.buttonWrap}>
        <TouchableOpacity style={[styles.nextButton, { backgroundColor: t.accent }]} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Continue'}</Text>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  skipButton: { alignSelf: 'flex-end', paddingHorizontal: 24, paddingTop: 60 },
  skipText: { fontSize: 15, fontWeight: '500', letterSpacing: 0.2 },
  flatList: { flex: 1 },
  slide: { width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 20 },
  slideLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 4, marginBottom: 40 },
  iconRingOuter: { width: 188, height: 188, borderRadius: 94, alignItems: 'center', justifyContent: 'center', marginBottom: 52 },
  iconRingInner: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 36, fontWeight: '800', textAlign: 'center', marginBottom: 16, lineHeight: 44, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 26, fontWeight: '400', letterSpacing: 0.1 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 20 },
  dot: { height: 4, borderRadius: 2, backgroundColor: '#0A84FF' },
  buttonWrap: { width: '100%', paddingHorizontal: 32, paddingBottom: 52 },
  nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 16 },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});

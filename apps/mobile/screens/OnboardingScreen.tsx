import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Dimensions, Animated, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Each slide has its own accent color for variety
const SLIDES = [
  {
    id: '1',
    icon: 'flash' as const,
    title: 'Welcome to\nPHEV PH',
    subtitle: 'Power your journey. Discover, charge, and move — smarter across the Philippines.',
    bg: '#0A0A0A',
    accent: '#E3000F',
    isLogo: true,
  },
  {
    id: '2',
    icon: 'map' as const,
    title: 'Every Station,\nIn Your Hand',
    subtitle: 'Live map with real-time availability. Find the nearest charger in seconds.',
    bg: '#0A0F1A',
    accent: '#3B82F6',
  },
  {
    id: '3',
    icon: 'battery-charging' as const,
    title: 'Plug In.\nPower Up.',
    subtitle: 'Select a port, set your target kWh, and watch your battery fill up live.',
    bg: '#0A1A0A',
    accent: '#22C55E',
  },
  {
    id: '4',
    icon: 'card' as const,
    title: 'Pay Without\nHesitation',
    subtitle: 'GCash, Maya, or card. Powered by PayMongo. Completed in a single tap.',
    bg: '#1A0F00',
    accent: '#F59E0B',
  },
  {
    id: '5',
    icon: 'people' as const,
    title: 'Drive Smarter,\nTogether',
    subtitle: 'Rate stations, share insights, and help build a better EV network for all.',
    bg: '#120A1A',
    accent: '#A855F7',
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
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

  const slide = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  // Background color interpolation across slides
  const bgColors = SLIDES.map(s => s.bg);
  const accentColors = SLIDES.map(s => s.accent);

  function renderSlide({ item, index }: { item: typeof SLIDES[0]; index: number }) {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    // Slide-in from right animation for content
    const translateX = scrollX.interpolate({
      inputRange,
      outputRange: [width * 0.25, 0, -width * 0.25],
      extrapolate: 'clamp',
    });
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slide, { width }]}>
        <Animated.View style={[styles.slideContent, { opacity, transform: [{ translateX }] }]}>
          {/* Slide number */}
          <Text style={[styles.slideNum, { color: item.accent + '60' }]}>
            {String(index + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
          </Text>

          {/* Icon / Logo */}
          {item.isLogo ? (
            <View style={[styles.logoCircle, { backgroundColor: item.accent + '15', borderColor: item.accent + '30' }]}>
              <Image source={require('../assets/logo.png')} style={styles.logoImg} resizeMode="contain" />
            </View>
          ) : (
            <View style={[styles.iconWrap, { backgroundColor: item.accent + '15', borderColor: item.accent + '30' }]}>
              <View style={[styles.iconInner, { backgroundColor: item.accent + '25' }]}>
                <Ionicons name={item.icon} size={56} color={item.accent} />
              </View>
            </View>
          )}

          {/* Text */}
          <Text style={styles.title}>{item.title}</Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.65)' }]}>{item.subtitle}</Text>

          {/* Accent line under title */}
          <View style={[styles.titleUnderline, { backgroundColor: item.accent }]} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Dynamic background */}
      {SLIDES.map((s, i) => {
        const opacity = scrollX.interpolate({
          inputRange: [(i - 1) * width, i * width, (i + 1) * width],
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={s.id}
            style={[StyleSheet.absoluteFillObject, { backgroundColor: s.bg, opacity }]}
          />
        );
      })}

      {/* Decorative circles */}
      <View style={[styles.decorCircle1, { borderColor: slide.accent + '20' }]} />
      <View style={[styles.decorCircle2, { borderColor: slide.accent + '15' }]} />

      {/* Skip */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleDone}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={[styles.skipText, { opacity: isLast ? 0 : 1 }]}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
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

      {/* Bottom */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((s, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [6, 24, 6],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.25, 1, 0.25],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: s.accent }]}
              />
            );
          })}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: slide.accent }]}
          onPress={handleNext}
          activeOpacity={0.88}
        >
          <Text style={styles.ctaText}>{isLast ? 'Get Started' : 'Continue'}</Text>
          <Ionicons name={isLast ? 'checkmark-circle' : 'arrow-forward-circle'} size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },

  // Decorative background rings
  decorCircle1: {
    position: 'absolute',
    width: 400, height: 400, borderRadius: 200,
    borderWidth: 1,
    top: -100, right: -100,
  },
  decorCircle2: {
    position: 'absolute',
    width: 280, height: 280, borderRadius: 140,
    borderWidth: 1,
    bottom: 120, left: -80,
  },

  skipButton: {
    position: 'absolute',
    top: 60, right: 28,
    zIndex: 10,
  },
  skipText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '500' },

  flatList: { flex: 1 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  slideContent: { alignItems: 'flex-start', width: '100%' },

  slideNum: { fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 36 },

  // Icon display
  logoCircle: {
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 48,
  },
  logoImg: { width: 140, height: 140 },
  iconWrap: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 48,
  },
  iconInner: {
    width: 108, height: 108, borderRadius: 54,
    alignItems: 'center', justifyContent: 'center',
  },

  titleUnderline: { width: 48, height: 3, borderRadius: 2, marginTop: 16 },
  title: {
    color: '#fff',
    fontSize: 38, fontWeight: '800',
    letterSpacing: -0.8, lineHeight: 46,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16, lineHeight: 26, fontWeight: '400',
  },

  // Bottom bar
  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 52,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  dot: { height: 4, borderRadius: 2 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});

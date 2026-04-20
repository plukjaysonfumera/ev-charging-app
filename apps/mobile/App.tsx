import { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, useColorScheme, Animated } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { Colors, F } from './theme';

import { AuthProvider, useAuth } from './context/AuthContext';
import { auth } from './lib/firebase';

import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import StationsScreen from './screens/StationsScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import StationDetailScreen from './screens/StationDetailScreen';
import WriteReviewScreen from './screens/WriteReviewScreen';
import ChargingSessionScreen from './screens/ChargingSessionScreen';
import SessionSummaryScreen from './screens/SessionSummaryScreen';
import PaymentScreen from './screens/PaymentScreen';
import PaymentSuccessScreen from './screens/PaymentSuccessScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import AddVehicleScreen from './screens/AddVehicleScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import OnboardingScreen from './screens/OnboardingScreen';

import { API_URL } from './lib/config';

SplashScreen.preventAutoHideAsync();

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const TAB_ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home:     ['home',    'home-outline'],
  Map:      ['map',     'map-outline'],
  Stations: ['flash',   'flash-outline'],
  History:  ['time',    'time-outline'],
  Profile:  ['person',  'person-outline'],
};

function AnimatedTabIcon({
  routeName, color, size, focused,
}: { routeName: string; color: string; size: number; focused: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.18 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [focused]);

  const [activeIcon, inactiveIcon] = TAB_ICONS[routeName] ?? ['ellipse', 'ellipse-outline'];
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={focused ? activeIcon : inactiveIcon} size={size} color={color} />
    </Animated.View>
  );
}

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerPushToken(firebaseUid: string) {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'bde9cd60-6b4c-485a-b061-9bee0cf4e69c',
    });
    await fetch(`${API_URL}/api/v1/users/push-token`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseUid, expoPushToken: tokenData.data }),
    });
  } catch { /* silent */ }
}

function TabNavigator() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor:   t.accent,
        tabBarInactiveTintColor: t.textTertiary,
        tabBarStyle: {
          backgroundColor: t.tabBar,
          borderTopColor:  t.border,
          borderTopWidth:  1,
          height:          58,
          paddingBottom:   8,
          paddingTop:      6,
        },
        tabBarLabelStyle: {
          fontFamily: F.medium,
          fontSize:   11,
          marginTop:  1,
        },
        headerStyle:      { backgroundColor: t.headerBg },
        headerTintColor:  t.headerText,
        headerTitleStyle: { fontFamily: F.bold, fontSize: 17 },
        tabBarIcon: ({ color, size, focused }) => (
          <AnimatedTabIcon routeName={route.name} color={color} size={size} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ headerShown: false }} />
      <Tab.Screen name="Map"      component={MapScreen} />
      <Tab.Screen name="Stations" component={StationsScreen} />
      <Tab.Screen name="History"  component={HistoryScreen} />
      <Tab.Screen name="Profile"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  const notificationListener = useRef<any>();
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? Colors.dark : Colors.light;

  const headerOptions = {
    headerStyle:      { backgroundColor: t.headerBg },
    headerTintColor:  t.headerText,
    headerTitleStyle: { fontFamily: F.bold, fontSize: 17 } as any,
  };

  useEffect(() => {
    if (user) registerPushToken(user.uid);
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});
    return () => notificationListener.current?.remove();
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.background }}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  if (!user) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login"    component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
      </AuthStack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs"           component={TabNavigator}          options={{ headerShown: false }} />
      <Stack.Screen name="StationDetail"  component={StationDetailScreen}   options={{ title: 'Station Details',   ...headerOptions }} />
      <Stack.Screen name="WriteReview"    component={WriteReviewScreen}     options={{ title: 'Write a Review',    ...headerOptions }} />
      <Stack.Screen name="ChargingSession" component={ChargingSessionScreen} options={{ title: 'Charging',         ...headerOptions, headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="SessionSummary" component={SessionSummaryScreen}  options={{ title: 'Session Complete',  ...headerOptions, headerBackVisible: false }} />
      <Stack.Screen name="Payment"        component={PaymentScreen}         options={{ title: 'Payment',           ...headerOptions }} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile"    component={EditProfileScreen}     options={{ title: 'Edit Profile',      ...headerOptions }} />
      <Stack.Screen name="AddVehicle"     component={AddVehicleScreen}      options={{ title: 'Add Vehicle',       ...headerOptions }} />
    </Stack.Navigator>
  );
}

function RootApp() {
  const scheme = useColorScheme();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  const [fontsLoaded] = useFonts({
    'Inter-Regular':   Inter_400Regular,
    'Inter-Medium':    Inter_500Medium,
    'Inter-SemiBold':  Inter_600SemiBold,
    'Inter-Bold':      Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
    'Inter-Black':     Inter_900Black,
  });

  useEffect(() => {
    AsyncStorage.removeItem('onboarding_complete').then(() =>
      AsyncStorage.getItem('onboarding_complete').then(val => {
        setOnboardingDone(val === 'true');
      })
    );
  }, []);

  useEffect(() => {
    if (fontsLoaded && onboardingDone !== null) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, onboardingDone]);

  if (!fontsLoaded || onboardingDone === null) {
    return null; // splash screen stays visible
  }

  if (!onboardingDone) {
    return <OnboardingScreen onDone={() => setOnboardingDone(true)} />;
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style={scheme === 'dark' ? 'light' : 'light'} />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

export default function App() {
  return <RootApp />;
}

import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments, SplashScreen as ExpoSplashScreen } from "expo-router";
import { useFonts } from "expo-font";
import {
  Outfit_100Thin,
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from "@expo-google-fonts/outfit";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";
import '../global.css';
import { BackHandler, StatusBar, ToastAndroid, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '@/state/userStore';
import { useAuthListener } from '@/hooks/useAuthListener';
import { useNotifications } from '@/hooks/useNotifications';
import { AlertProvider } from '@/components/ui/CustomAlert';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from '@/components/SplashScreen';
import { useThemeStore } from '@/state/themeStore';
import ConnectivityWrapper from '@/components/system/ConnectivityWrapper';
import Constants from 'expo-constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

ExpoSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const lastExitPress = useRef(0);
  const [fontsLoaded, error] = useFonts({
    Outfit_100Thin,
    Outfit_200ExtraLight,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
    Talina: require('@/assets/fonts/talina.otf'),
    talina: require('@/assets/fonts/talina.otf'),
    'Talina DEMO': require('@/assets/fonts/talina.otf'),
    'TalinaDEMO-Regular': require('@/assets/fonts/talina.otf'),
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins: Poppins_400Regular,
  });

  const { rehydrateFromStorage } = useUserStore();
  const { isDark, colors, loadTheme } = useThemeStore();
  useAuthListener();
  useNotifications();

  useEffect(() => {
    rehydrateFromStorage();
    loadTheme();
  }, []);

  useEffect(() => {
    if (fontsLoaded || error) {
      ExpoSplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
        <AlertProvider>
          <ConnectivityWrapper currentVersion={Constants.expoConfig?.version ?? '1.0.0'}>
            <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
              <StatusBar
                backgroundColor={colors.background}
                barStyle={isDark ? "light-content" : "dark-content"}
              />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="admin" />
                <Stack.Screen name="events" />
                <Stack.Screen name="profile" />
                <Stack.Screen name="map" />
              </Stack>
            </SafeAreaView>
          </ConnectivityWrapper>
        </AlertProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

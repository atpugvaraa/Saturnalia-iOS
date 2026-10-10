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
import '../global.css';
import { BackHandler, StatusBar, ToastAndroid, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StoreProvider } from '@/state/StoreContext';
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
  });

  const { rehydrateFromStorage } = useUserStore();
  useAuthListener();
  useNotifications();

  useEffect(() => {
    rehydrateFromStorage();
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
        <StoreProvider>
          <AlertProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#040D2D' }}>
              <StatusBar backgroundColor="#040D2D" barStyle="light-content" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#DBE2ED' } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="admin" />
                <Stack.Screen name="events" />
                <Stack.Screen name="profile" />
                <Stack.Screen name="map" />
                <Stack.Screen name="store" />
              </Stack>
            </SafeAreaView>
          </AlertProvider>
        </StoreProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

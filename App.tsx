import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';

import { RootNavigator } from '@/navigation/RootNavigator';
import { setFontsReady } from '@/theme/typography';
import { palette } from '@/theme';

import { useSettingsStore } from '@/store/useSettingsStore';
import { useLocationStore } from '@/store/useLocationStore';
import { useTasbihStore } from '@/store/useTasbihStore';
import { useQuranStore } from '@/store/useQuranStore';
import { setHapticsEnabled } from '@/services/haptics';
import { ensureAndroidChannel } from '@/services/notifications';

// Hold the native splash until fonts and persisted state are ready, so the
// first frame the user sees is the finished UI rather than a reflow.
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Amiri_400Regular,
    Amiri_700Bold,
  });

  const [storesReady, setStoresReady] = useState(false);

  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateLocation = useLocationStore((s) => s.hydrate);
  const hydrateTasbih = useTasbihStore((s) => s.hydrate);
  const hydrateQuran = useQuranStore((s) => s.hydrate);

  useEffect(() => {
    let active = true;

    const boot = async (): Promise<void> => {
      // Every hydrate() swallows its own errors, so allSettled here is about
      // not blocking on a slow one rather than about failure handling.
      await Promise.allSettled([
        hydrateSettings(),
        hydrateLocation(),
        hydrateTasbih(),
        hydrateQuran(),
      ]);

      if (!active) return;

      setHapticsEnabled(useSettingsStore.getState().hapticsEnabled);
      void ensureAndroidChannel();
      setStoresReady(true);
    };

    void boot();
    return () => {
      active = false;
    };
  }, [hydrateSettings, hydrateLocation, hydrateTasbih, hydrateQuran]);

  // A font that fails to download must not brick the app; the typography layer
  // falls back to system faces and we carry on.
  const fontsSettled = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontsLoaded) setFontsReady(true);
  }, [fontsLoaded]);

  const ready = fontsSettled && storesReady;

  const onLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root} onLayout={onLayout}>
          <StatusBar style="light" />
          <RootNavigator />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.ink,
  },
});

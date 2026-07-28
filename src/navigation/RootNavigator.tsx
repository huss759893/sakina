import React from 'react';
import {
  NavigationContainer,
  DarkTheme,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { TabNavigator } from './TabNavigator';
import { SurahScreen } from '@/screens/SurahScreen';
import { DhikrScreen } from '@/screens/DhikrScreen';
import { MosqueScreen } from '@/screens/MosqueScreen';
import { ZakatScreen } from '@/screens/ZakatScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { LocationSearchScreen } from '@/screens/LocationSearchScreen';

import { palette, fontFamilies } from '@/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * The navigation theme drives the surfaces React Navigation paints itself —
 * screen backgrounds during transitions, the card behind a modal. Leaving it
 * at the default produces a white flash between dark screens.
 */
const navigationTheme: Theme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: palette.gold,
    background: palette.ink,
    card: palette.surface,
    text: palette.text,
    border: palette.hairline,
    notification: palette.gold,
  },
  fonts: {
    regular: { fontFamily: fontFamilies.regular, fontWeight: '400' },
    medium: { fontFamily: fontFamilies.medium, fontWeight: '500' },
    bold: { fontFamily: fontFamilies.bold, fontWeight: '700' },
    heavy: { fontFamily: fontFamilies.extrabold, fontWeight: '800' },
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.ink },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Surah" component={SurahScreen} />
        <Stack.Screen name="Dhikr" component={DhikrScreen} />
        <Stack.Screen name="Mosques" component={MosqueScreen} />
        <Stack.Screen name="Zakat" component={ZakatScreen} />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="LocationSearch"
          component={LocationSearchScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import React from 'react';
import {
  NavigationContainer,
  DarkTheme,
  type LinkingOptions,
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
import { readJSON } from '@/utils/storage';
import type { RootStackParamList, TabParamList } from './types';

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

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['sakina://'],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home: 'home',
          Prayers: 'prayers',
          Qibla: 'qibla',
          Quran: 'quran',
          More: 'more',
        },
      },
      Surah: { path: 'surah/:number/:name', parse: { number: Number } },
      Dhikr: 'dhikr',
      Mosques: 'mosques',
      Zakat: 'zakat',
      Settings: 'settings',
      LocationSearch: 'location',
    },
  },
};

/**
 * UI-automation hook: when the `screenshot-route` storage key is present the
 * navigator opens directly on that screen. Nothing inside the app ever writes
 * the key — it exists so test harnesses can drive the sandbox from outside.
 */
interface ScreenshotRoute {
  tab?: keyof TabParamList;
  stack?: Exclude<keyof RootStackParamList, 'Tabs' | 'Surah'>;
  params?: RootStackParamList['Surah'];
}

function buildInitialState(target: ScreenshotRoute | null) {
  if (target?.tab) {
    return { routes: [{ name: 'Tabs' as const, state: { routes: [{ name: target.tab }] } }] };
  }
  if (target?.stack || target?.params) {
    const name = target.params ? ('Surah' as const) : target.stack!;
    return {
      index: 1,
      routes: [{ name: 'Tabs' as const }, { name, params: target.params }],
    };
  }
  return undefined;
}

export function RootNavigator() {
  const [routeOverride, setRouteOverride] = React.useState<
    ScreenshotRoute | null | 'pending'
  >('pending');

  React.useEffect(() => {
    void readJSON<ScreenshotRoute | null>('screenshot-route', null).then(
      setRouteOverride
    );
  }, []);

  if (routeOverride === 'pending') return null;

  return (
    <NavigationContainer
      theme={navigationTheme}
      linking={linking}
      initialState={buildInitialState(routeOverride)}>
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

import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Navigation params are declared once here and registered globally below, so
 * every `useNavigation()` call in the app is typed without extra annotation.
 */

export type TabParamList = {
  Home: undefined;
  Prayers: undefined;
  Qibla: undefined;
  Quran: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Surah: { number: number; name: string; scrollToAyah?: number };
  Dhikr: undefined;
  Mosques: undefined;
  Zakat: undefined;
  Settings: undefined;
  LocationSearch: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

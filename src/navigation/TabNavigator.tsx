import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurTabBarBackground } from './TabBarBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Compass, Home, LayoutGrid, Clock } from 'lucide-react-native';

import { HomeScreen } from '@/screens/HomeScreen';
import { PrayerTimesScreen } from '@/screens/PrayerTimesScreen';
import { QiblaScreen } from '@/screens/QiblaScreen';
import { QuranScreen } from '@/screens/QuranScreen';
import { MoreScreen } from '@/screens/MoreScreen';

import { TAB_BAR_HEIGHT } from '@/components/Screen';
import { palette, radius, space, font } from '@/theme';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

/**
 * A floating tab bar rather than an edge-anchored one — it keeps the gold
 * accent off the very bottom of the display, where the home indicator already
 * competes for attention.
 */
export function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: [styles.label, font('semibold')],
        tabBarItemStyle: styles.item,
        tabBarBackground: () => <BlurTabBarBackground />,
        tabBarStyle: [
          styles.bar,
          {
            height: TAB_BAR_HEIGHT,
            bottom: insets.bottom > 0 ? insets.bottom : space.md,
          },
        ],
        // The floating bar sits above content, so screens pad themselves via
        // `useTabBarClearance` instead of relying on the navigator's inset.
        tabBarHideOnKeyboard: Platform.OS === 'android',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Home size={21} color={color} strokeWidth={focused ? 2.3 : 1.9} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Prayers"
        component={PrayerTimesScreen}
        options={{
          tabBarLabel: 'Prayers',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Clock size={21} color={color} strokeWidth={focused ? 2.3 : 1.9} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Qibla"
        component={QiblaScreen}
        options={{
          tabBarLabel: 'Qibla',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Compass size={21} color={color} strokeWidth={focused ? 2.3 : 1.9} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Quran"
        component={QuranScreen}
        options={{
          tabBarLabel: "Qur'an",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <BookOpen size={21} color={color} strokeWidth={focused ? 2.3 : 1.9} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <LayoutGrid size={21} color={color} strokeWidth={focused ? 2.3 : 1.9} />
            </TabIcon>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/** A soft gold well behind the active icon, instead of a colour change alone. */
function TabIcon({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.iconWell, focused && styles.iconWellActive]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: space.base,
    right: space.base,
    borderRadius: radius.xl,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    overflow: 'hidden',
  },
  item: {
    paddingVertical: 0,
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.2,
    marginTop: 3,
    // Without this the descenders in "Prayers"/"Qibla" sit on the clip edge.
    paddingBottom: 2,
  },
  iconWell: {
    width: 44,
    height: 26,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWellActive: {
    backgroundColor: palette.goldGlow,
  },
});

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { baseGradient, palette, space } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  /** Skip the top safe-area pad when the screen draws its own hero under it. */
  edgeToEdge?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Root wrapper for every screen: the base gradient, plus safe-area padding
 * that accounts for the bottom tab bar so content never hides behind it.
 */
export function Screen({
  children,
  edgeToEdge = false,
  style,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={[...baseGradient]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.content,
          { paddingTop: edgeToEdge ? 0 : insets.top + space.sm },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/** Bottom padding that clears the floating tab bar plus the home indicator. */
export function useTabBarClearance(extra = space.xl): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + extra;
}

/**
 * Tall enough for the icon well plus a full label line. The bar clips its own
 * content (`overflow: hidden`, needed for the rounded blur), so this has to
 * cover icon + gap + label + vertical padding or the labels get cut off.
 */
export const TAB_BAR_HEIGHT = 74;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  content: {
    flex: 1,
  },
});

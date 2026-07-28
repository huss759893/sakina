import { Platform, ViewStyle } from 'react-native';
import { palette } from './colors';

/** 4pt base scale. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
  pill: 999,
} as const;

/**
 * On a dark UI, elevation reads through a lighter surface + a soft ambient
 * shadow, not through a hard drop shadow. Android gets `elevation` since it
 * ignores shadowColor for non-elevated views.
 */
export const shadow = {
  soft: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 6 },
    default: {},
  }) as ViewStyle,
  lifted: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.5,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 14 },
    },
    android: { elevation: 12 },
    default: {},
  }) as ViewStyle,
  gold: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.gold,
      shadowOpacity: 0.32,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 8 },
    default: {},
  }) as ViewStyle,
} as const;

/** Minimum 44pt touch targets, per the accessibility baseline. */
export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;
export const MIN_TOUCH = 44;

export const duration = {
  fast: 150,
  base: 240,
  slow: 400,
  sky: 900,
} as const;

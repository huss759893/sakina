import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { palette, radius, space, MIN_TOUCH } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const HEIGHT: Record<Size, number> = { sm: MIN_TOUCH, md: 50, lg: 56 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  // A button that is busy must not fire again — double-submits on a slow
  // network are the single most common cause of duplicate work.
  const inert = disabled || loading;

  const textColor =
    variant === 'primary'
      ? palette.ink
      : variant === 'danger'
        ? palette.rose
        : palette.text;

  const body = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textColor}
          style={styles.spinner}
        />
      ) : (
        icon
      )}
      <Text
        variant={size === 'sm' ? 'bodySm' : 'body'}
        weight="semibold"
        color={textColor}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inert, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { height: HEIGHT[size] },
        fullWidth && styles.fullWidth,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        inert && styles.inert,
        pressed && !inert && styles.pressed,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[palette.goldBright, palette.gold, palette.goldDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    overflow: 'hidden',
    minWidth: MIN_TOUCH,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  spinner: {
    marginRight: 2,
  },
  secondary: {
    backgroundColor: palette.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairlineStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairlineStrong,
  },
  danger: {
    backgroundColor: palette.roseGlow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.rose,
  },
  inert: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
  },
});

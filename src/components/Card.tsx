import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { palette, radius, shadow, space } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * On a dark ground, "raised" reads as a lighter surface plus a hairline, not
 * as a drop shadow. The pressed state dims rather than scales, so nothing in
 * the layout shifts under the finger.
 */
export function Card({
  children,
  style,
  padded = true,
  elevated = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: CardProps) {
  const content = (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        elevated && styles.elevated,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    overflow: 'hidden',
  },
  padded: {
    padding: space.base,
  },
  elevated: {
    backgroundColor: palette.surfaceRaised,
    ...shadow.soft,
  },
  pressed: {
    opacity: 0.72,
  },
});

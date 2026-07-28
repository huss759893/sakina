import React from 'react';
import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';
import { font, type as typeScale, arabicType, palette } from '@/theme';

/**
 * Typed text primitive. Every string in the app goes through this so weight,
 * tracking and the custom-font fallback are decided in exactly one place.
 */

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodySm'
  | 'label'
  | 'caption'
  | 'numeric';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const DEFAULT_WEIGHT: Record<Variant, Weight> = {
  display: 'extrabold',
  h1: 'bold',
  h2: 'bold',
  h3: 'semibold',
  body: 'regular',
  bodySm: 'regular',
  label: 'semibold',
  caption: 'medium',
  numeric: 'semibold',
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: string;
  align?: TextStyle['textAlign'];
  /** Applies the uppercase treatment that goes with the `label` variant. */
  uppercase?: boolean;
  children?: React.ReactNode;
}

export function Text({
  variant = 'body',
  weight,
  color = palette.text,
  align,
  uppercase,
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant],
        font(weight ?? DEFAULT_WEIGHT[variant]),
        { color },
        align ? { textAlign: align } : null,
        uppercase || variant === 'label' ? styles.upper : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

type ArabicVariant = keyof typeof arabicType;

export interface ArabicTextProps extends TextProps {
  variant?: ArabicVariant;
  color?: string;
  bold?: boolean;
  /** Multiplies both size and leading together, preserving the ratio. */
  scale?: number;
  children?: React.ReactNode;
}

/**
 * Arabic needs its own primitive: right-to-left flow, a naskh face, and far
 * more leading than Latin at the same optical size — diacritics sit well above
 * and below the baseline and collide at Latin line-heights.
 */
export function ArabicText({
  variant = 'inline',
  color = palette.text,
  bold = false,
  scale = 1,
  style,
  children,
  ...rest
}: ArabicTextProps) {
  const base = arabicType[variant];

  return (
    <RNText
      {...rest}
      style={[
        {
          fontSize: base.fontSize * scale,
          lineHeight: base.lineHeight * scale,
          color,
          writingDirection: 'rtl',
          textAlign: 'right',
        },
        font(bold ? 'arabicBold' : 'arabic'),
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  upper: {
    textTransform: 'uppercase',
  },
});

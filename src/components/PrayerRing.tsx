import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { palette } from '@/theme';
import { useSvgId } from '@/utils/svgId';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface PrayerRingProps {
  /** 0..1 through the current prayer window. */
  progress: number;
  size: number;
  strokeWidth?: number;
  /** Accent for the filled arc; usually the current phase's accent colour. */
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

/**
 * The arc: how far through the current prayer window we are. It reads at a
 * glance in a way a bare countdown does not — a nearly-closed ring says "this
 * window is almost over" without the user parsing any digits.
 *
 * Animated via strokeDashoffset. This cannot use the native driver (it is not
 * a transform or opacity), but it updates once a second at most, so the JS
 * thread cost is irrelevant.
 */
export function PrayerRing({
  progress,
  size,
  strokeWidth = 8,
  color = palette.gold,
  trackColor = 'rgba(255,255,255,0.14)',
  children,
}: PrayerRingProps) {
  const gradientId = useSvgId('ring');
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const clamped = Number.isFinite(progress)
    ? Math.min(Math.max(progress, 0), 1)
    : 0;

  const animated = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    const animation = Animated.timing(animated, {
      toValue: clamped,
      duration: 600,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [clamped, animated]);

  const dashoffset = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.55} />
            <Stop offset="1" stopColor={color} stopOpacity={1} />
          </SvgLinearGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          // Rotate so the arc starts at twelve o'clock instead of three.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {children ? (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="box-none">
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

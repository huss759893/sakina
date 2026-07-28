import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { phaseGradients, duration, type PrayerPhase } from '@/theme';

/**
 * The app's signature: the background behind the dashboard is the sky at the
 * current point in the prayer cycle. It cross-fades when the phase changes —
 * indigo before Fajr, blush at dawn, hard blue at Dhuhr, brass at Asr, ember
 * at Maghrib, near-black at Isha.
 *
 * Implemented as two stacked gradients with an animated opacity rather than by
 * interpolating colour stops, because opacity can run on the native driver and
 * a per-frame colour interpolation cannot.
 */

interface GradientSkyProps {
  phase: PrayerPhase;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function GradientSky({ phase, style, children }: GradientSkyProps) {
  // `base` is what is currently shown; `incoming` fades in over it.
  const [base, setBase] = useState<PrayerPhase>(phase);
  const [incoming, setIncoming] = useState<PrayerPhase | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === base) return;

    setIncoming(phase);
    fade.setValue(0);

    const animation = Animated.timing(fade, {
      toValue: 1,
      duration: duration.sky,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (!finished) return;
      // Promote the incoming layer to the base and drop the extra view.
      setBase(phase);
      setIncoming(null);
      fade.setValue(0);
    });

    return () => animation.stop();
  }, [phase, base, fade]);

  return (
    <Animated.View style={[styles.container, style]}>
      <LinearGradient
        colors={[...phaseGradients[base]]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {incoming !== null && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <LinearGradient
            colors={[...phaseGradients[incoming]]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

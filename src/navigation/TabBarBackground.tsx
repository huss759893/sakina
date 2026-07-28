import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { palette } from '@/theme';

/**
 * Background for the floating tab bar.
 *
 * iOS gets a real system blur. Android's blur is a software implementation
 * that costs a full-screen readback every frame, so it gets an opaque surface
 * instead — visually near-identical over a dark background, and far cheaper.
 */
export function BlurTabBarBackground() {
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.container}>
        <BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.tintIOS]} />
        <View style={styles.hairline} />
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.solid]}>
      <View style={styles.hairline} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  tintIOS: {
    backgroundColor: 'rgba(16,26,46,0.55)',
  },
  solid: {
    backgroundColor: palette.surface,
  },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairlineStrong,
  },
});

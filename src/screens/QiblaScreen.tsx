import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Text as SvgText,
} from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertTriangle, Compass as CompassIcon, MapPin } from 'lucide-react-native';

import { Text, ArabicText } from '@/components/Text';
import { Card } from '@/components/Card';
import { Pill, SectionHeader } from '@/components/Controls';
import { LocationPrompt } from '@/components/StateViews';
import { Screen, useTabBarClearance } from '@/components/Screen';

import { useLocationStore } from '@/store/useLocationStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCompassHeading } from '@/hooks/useCompassHeading';
import { notifySuccess } from '@/services/haptics';

import {
  qiblaBearing,
  distanceToKaabaKm,
  compassPoint,
  angleDelta,
  normalizeDegrees,
  formatDistance,
} from '@/utils/geo';
import { palette, space, radius, font } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

const DIAL = 300;
const CENTER = DIAL / 2;
/** Alignment tolerance, in degrees, before we call it "facing the Qibla". */
const ALIGN_TOLERANCE = 5;

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function QiblaScreen() {
  const navigation = useNavigation<Nav>();
  const bottomPad = useTabBarClearance();
  const { coords, label, status, error: locError, requestLocation } =
    useLocationStore();
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const compass = useCompassHeading(Boolean(coords));

  const qibla = useMemo(() => (coords ? qiblaBearing(coords) : null), [coords]);
  const distance = useMemo(
    () => (coords ? distanceToKaabaKm(coords) : null),
    [coords]
  );

  /**
   * Relative bearing: where the Qibla sits on screen once the dial has been
   * counter-rotated by the device heading. Zero means dead ahead.
   */
  const relative = useMemo(() => {
    if (qibla === null || compass.heading === null) return null;
    return normalizeDegrees(qibla - compass.heading);
  }, [qibla, compass.heading]);

  const offBy = relative === null ? null : Math.abs(angleDelta(0, relative));
  const aligned = offBy !== null && offBy <= ALIGN_TOLERANCE;

  // Fire the haptic once on entering alignment, not on every frame inside it.
  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && !wasAligned.current && hapticsEnabled) notifySuccess();
    wasAligned.current = aligned;
  }, [aligned, hapticsEnabled]);

  /**
   * The dial rotates by -heading. We accumulate an unbounded rotation value
   * rather than writing the raw 0-360 heading, so crossing north animates
   * through 1° instead of unwinding 359° the wrong way.
   */
  const rotation = useRef(new Animated.Value(0)).current;
  const continuous = useRef(0);
  const lastHeading = useRef<number | null>(null);

  useEffect(() => {
    if (compass.heading === null) return;

    const previous = lastHeading.current;
    if (previous === null) {
      continuous.current = -compass.heading;
      rotation.setValue(continuous.current);
    } else {
      continuous.current -= angleDelta(previous, compass.heading);
      Animated.timing(rotation, {
        toValue: continuous.current,
        duration: 120,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    }

    lastHeading.current = compass.heading;
  }, [compass.heading, rotation]);

  const spin = rotation.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  if (!coords) {
    return (
      <Screen>
        <LocationPrompt
          message="The Qibla is calculated from your coordinates to the Kaaba, so Sakina needs to know where you are."
          onRequest={() => void requestLocation()}
          busy={status === 'requesting'}
          error={locError}
          onSetManually={() => navigation.navigate('LocationSearch')}
        />
      </Screen>
    );
  }

  const accent = aligned ? palette.jade : palette.gold;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="h1">Qibla</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={palette.textMuted} strokeWidth={2} />
            <Text variant="bodySm" color={palette.textMuted} numberOfLines={1}>
              {label || 'Current location'}
            </Text>
          </View>
        </View>

        {/* ── Compass ────────────────────────────────────────────── */}
        <View style={styles.compassWrap}>
          {/* Fixed index pointer — the dial turns beneath it. */}
          <View style={styles.pointerWrap} pointerEvents="none">
            <Svg width={28} height={20}>
              <Path d="M14 20 L0 0 L28 0 Z" fill={accent} />
            </Svg>
          </View>

          <Animated.View
            style={{ transform: [{ rotate: spin }] }}
            accessibilityLabel={
              relative === null
                ? 'Compass calibrating'
                : `Qibla is ${Math.round(relative)} degrees from the direction you are facing`
            }
          >
            <Svg width={DIAL} height={DIAL}>
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={CENTER - 2}
                fill={palette.surface}
                stroke={palette.hairlineStrong}
                strokeWidth={1}
              />
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={CENTER - 34}
                fill="none"
                stroke={palette.hairlineFaint}
                strokeWidth={1}
              />

              {/* Degree ticks every 15°, longer on the cardinals. */}
              {Array.from({ length: 24 }, (_, i) => {
                const angle = (i * 15 - 90) * (Math.PI / 180);
                const isCardinal = i % 6 === 0;
                const outer = CENTER - 8;
                const inner = CENTER - (isCardinal ? 22 : 15);
                return (
                  <Line
                    key={i}
                    x1={CENTER + outer * Math.cos(angle)}
                    y1={CENTER + outer * Math.sin(angle)}
                    x2={CENTER + inner * Math.cos(angle)}
                    y2={CENTER + inner * Math.sin(angle)}
                    stroke={isCardinal ? palette.textSoft : palette.textFaint}
                    strokeWidth={isCardinal ? 2 : 1}
                  />
                );
              })}

              {/* Cardinal letters. */}
              {[
                { letter: 'N', angle: -90 },
                { letter: 'E', angle: 0 },
                { letter: 'S', angle: 90 },
                { letter: 'W', angle: 180 },
              ].map(({ letter, angle }) => {
                const rad = angle * (Math.PI / 180);
                const r = CENTER - 44;
                return (
                  <SvgText
                    key={letter}
                    x={CENTER + r * Math.cos(rad)}
                    y={CENTER + r * Math.sin(rad) + 6}
                    fill={letter === 'N' ? palette.rose : palette.textMuted}
                    fontSize={16}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {letter}
                  </SvgText>
                );
              })}

              {/* Qibla indicator, fixed to the dial at the true bearing. */}
              {qibla !== null ? (
                <G rotation={qibla} origin={`${CENTER}, ${CENTER}`}>
                  <Line
                    x1={CENTER}
                    y1={CENTER}
                    x2={CENTER}
                    y2={40}
                    stroke={accent}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  {/*
                    A simple Kaaba glyph: cube plus the kiswah band. The
                    counter-rotation keeps it upright — its *position* should
                    travel around the dial, but a tilted Kaaba just reads as a
                    rendering mistake.
                  */}
                  <G rotation={-qibla} origin={`${CENTER}, 32`}>
                    <Circle cx={CENTER} cy={32} r={17} fill={accent} />
                    <Path
                      d={`M ${CENTER - 8} 25 h 16 v 15 h -16 Z`}
                      fill={palette.ink}
                    />
                    <Line
                      x1={CENTER - 8}
                      y1={30}
                      x2={CENTER + 8}
                      y2={30}
                      stroke={accent}
                      strokeWidth={2.5}
                    />
                  </G>
                </G>
              ) : null}

              <Circle cx={CENTER} cy={CENTER} r={6} fill={accent} />
            </Svg>
          </Animated.View>
        </View>

        {/* ── Readout ────────────────────────────────────────────── */}
        <View style={styles.readout}>
          {compass.heading === null ? (
            <Pill label="Calibrating compass…" tone="neutral" />
          ) : aligned ? (
            <Pill label="Facing the Qibla" tone="jade" />
          ) : (
            <Text variant="bodySm" color={palette.textMuted}>
              Turn {angleDelta(0, relative ?? 0) > 0 ? 'right' : 'left'} by{' '}
              {Math.round(offBy ?? 0)}°
            </Text>
          )}
        </View>

        <View style={styles.statsRow}>
          <Stat
            label="Qibla bearing"
            value={qibla !== null ? `${Math.round(qibla)}°` : '—'}
            sub={qibla !== null ? compassPoint(qibla) : ''}
          />
          <Stat
            label="Your heading"
            value={
              compass.heading !== null ? `${Math.round(compass.heading)}°` : '—'
            }
            sub={compass.heading !== null ? compassPoint(compass.heading) : ''}
          />
          <Stat
            label="To the Kaaba"
            value={distance !== null ? formatDistance(distance) : '—'}
            sub="great circle"
          />
        </View>

        {compass.calibrationNeeded ? (
          <Card style={styles.warnCard}>
            <View style={styles.warnRow}>
              <AlertTriangle size={16} color={palette.amber} strokeWidth={2} />
              <Text variant="caption" color={palette.textSoft} style={styles.flex}>
                Compass accuracy is low. Move away from metal and electronics, then
                wave the device in a figure-eight to recalibrate.
              </Text>
            </View>
          </Card>
        ) : null}

        {compass.error ? (
          <Card style={styles.warnCard}>
            <View style={styles.warnRow}>
              <AlertTriangle size={16} color={palette.rose} strokeWidth={2} />
              <Text variant="caption" color={palette.textSoft} style={styles.flex}>
                {compass.error}
              </Text>
            </View>
          </Card>
        ) : null}

        <SectionHeader title="About this reading" style={styles.sectionSpacing} />
        <Card>
          <View style={styles.aboutRow}>
            <CompassIcon size={16} color={palette.textMuted} strokeWidth={2} />
            <Text variant="caption" color={palette.textMuted} style={styles.flex}>
              {compass.source === 'location'
                ? 'Using the device compass with magnetic declination applied, so the bearing is relative to true north.'
                : compass.source === 'magnetometer'
                  ? 'Using the raw magnetometer. Without location permission the reading is relative to magnetic north, which can differ from true north by several degrees.'
                  : 'Waiting for the first compass reading.'}
            </Text>
          </View>
          <Text variant="caption" color={palette.textFaint} style={styles.aboutNote}>
            The bearing is the initial heading of the great-circle path to the Kaaba
            at 21.4225° N, 39.8262° E — the same method used by observatories, and
            not the straight line you would draw on a flat map.
          </Text>
          <View style={styles.kaabaRow}>
            <ArabicText variant="inline" color={palette.gold}>
              ٱلْكَعْبَة
            </ArabicText>
            <Text variant="caption" color={palette.textFaint}>
              Makkah al-Mukarramah
            </Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="label" color={palette.textMuted}>
        {label}
      </Text>
      <Text style={[styles.statValue, font('bold')]}>{value}</Text>
      <Text variant="caption" color={palette.textFaint}>
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  flex: { flex: 1 },
  header: {
    gap: 4,
    marginBottom: space.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compassWrap: {
    alignItems: 'center',
    marginTop: space.sm,
  },
  pointerWrap: {
    marginBottom: space.sm,
    alignItems: 'center',
  },
  readout: {
    alignItems: 'center',
    marginTop: space.lg,
    minHeight: 32,
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.lg,
  },
  stat: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    padding: space.md,
    gap: 3,
  },
  statValue: {
    fontSize: 20,
    color: palette.text,
    letterSpacing: -0.4,
  },
  warnCard: {
    marginTop: space.base,
    borderColor: palette.hairlineStrong,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  sectionSpacing: {
    marginTop: space.xl,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  aboutNote: {
    marginTop: space.md,
    lineHeight: 17,
  },
  kaabaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairlineFaint,
  },
});

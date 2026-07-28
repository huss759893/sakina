import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { ArrowLeft, RotateCcw, Undo2 } from 'lucide-react-native';

import { Text, ArabicText } from '@/components/Text';
import { Card } from '@/components/Card';
import { Segmented, SectionHeader, Pill } from '@/components/Controls';
import { palette, space, radius, font, HIT_SLOP, MIN_TOUCH } from '@/theme';

import { useTasbihStore } from '@/store/useTasbihStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { DHIKR_PRESETS, findDhikr } from '@/data/dhikr';
import { DUAS, DUA_OCCASIONS } from '@/data/duas';
import { tapLight, tapHeavy, notifySuccess, selection } from '@/services/haptics';

const COUNTER_SIZE = 260;

export function DhikrScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'tasbih' | 'duas'>('tasbih');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <ArrowLeft size={20} color={palette.text} strokeWidth={2} />
        </Pressable>
        <Text variant="h3" style={styles.headerTitle}>
          Dhikr
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabWrap}>
        <Segmented
          options={[
            { value: 'tasbih', label: 'Tasbih' },
            { value: 'duas', label: "Du'a" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'tasbih' ? (
        <TasbihPanel bottomInset={insets.bottom} />
      ) : (
        <DuaPanel bottomInset={insets.bottom} />
      )}
    </View>
  );
}

/* ── Tasbih ──────────────────────────────────────────────────────── */

function TasbihPanel({ bottomInset }: { bottomInset: number }) {
  const tasbih = useTasbihStore();
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const dhikr = useMemo(() => findDhikr(tasbih.activeId), [tasbih.activeId]);
  const count = tasbih.counts[dhikr.id] ?? 0;
  const rounds = tasbih.rounds[dhikr.id] ?? 0;
  const progress = Math.min(count / dhikr.target, 1);

  // Pulse the ring on each tap — a visual acknowledgement for users who have
  // haptics off, or a device without them.
  const pulse = useRef(new Animated.Value(0)).current;

  const runPulse = useCallback(() => {
    pulse.setValue(0);
    Animated.timing(pulse, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [pulse]);

  const onTap = useCallback(() => {
    const next = tasbih.increment(dhikr.id);
    runPulse();

    if (next >= dhikr.target) {
      // Reaching the target is the event worth a distinct signal.
      if (hapticsEnabled) notifySuccess();
      tasbih.completeRound(dhikr.id);
    } else if (next % 10 === 0) {
      if (hapticsEnabled) tapHeavy();
    } else if (hapticsEnabled) {
      tapLight();
    }
  }, [dhikr.id, dhikr.target, tasbih, hapticsEnabled, runPulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 1.04, 1],
  });

  const glow = pulse.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 0],
  });

  const radiusPx = (COUNTER_SIZE - 14) / 2;
  const circumference = 2 * Math.PI * radiusPx;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.panel,
        { paddingBottom: bottomInset + space.xxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Segmented
        scrollable
        options={DHIKR_PRESETS.map((p) => ({
          value: p.id,
          label: p.transliteration,
        }))}
        value={tasbih.activeId}
        onChange={(id) => {
          selection();
          tasbih.setActive(id);
        }}
        style={styles.presetRow}
      />

      <View style={styles.dhikrText}>
        <ArabicText variant="dua" color={palette.gold} style={styles.centered}>
          {dhikr.arabic}
        </ArabicText>
        <Text variant="body" weight="semibold" align="center" style={styles.translit}>
          {dhikr.transliteration}
        </Text>
        <Text variant="bodySm" color={palette.textMuted} align="center">
          {dhikr.translation}
        </Text>
      </View>

      {/* ── The counter ──────────────────────────────────────────── */}
      <Pressable
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel={`Tasbih counter, ${count} of ${dhikr.target}. Tap to increment.`}
        style={styles.counterWrap}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Animated.View
            style={[
              styles.counterGlow,
              { opacity: glow },
            ]}
            pointerEvents="none"
          />
          <Svg width={COUNTER_SIZE} height={COUNTER_SIZE}>
            <Circle
              cx={COUNTER_SIZE / 2}
              cy={COUNTER_SIZE / 2}
              r={radiusPx}
              fill={palette.surface}
              stroke={palette.hairline}
              strokeWidth={1}
            />
            <Circle
              cx={COUNTER_SIZE / 2}
              cy={COUNTER_SIZE / 2}
              r={radiusPx}
              fill="none"
              stroke={palette.gold}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              transform={`rotate(-90 ${COUNTER_SIZE / 2} ${COUNTER_SIZE / 2})`}
            />
          </Svg>

          <View style={[StyleSheet.absoluteFill, styles.counterCenter]} pointerEvents="none">
            <Text style={[styles.countValue, font('extrabold')]}>{count}</Text>
            <Text variant="bodySm" color={palette.textMuted}>
              of {dhikr.target}
            </Text>
            {rounds > 0 ? (
              <Pill label={`${rounds} ${rounds === 1 ? 'round' : 'rounds'}`} tone="jade" />
            ) : null}
          </View>
        </Animated.View>
      </Pressable>

      <Text variant="caption" color={palette.textFaint} align="center" style={styles.hint}>
        Tap anywhere on the circle to count
      </Text>

      <View style={styles.counterActions}>
        <Pressable
          onPress={() => {
            selection();
            tasbih.decrement(dhikr.id);
          }}
          disabled={count === 0}
          accessibilityRole="button"
          accessibilityLabel="Undo last count"
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
            count === 0 && styles.disabled,
          ]}
        >
          <Undo2 size={17} color={palette.textSoft} strokeWidth={2} />
          <Text variant="bodySm" weight="medium" color={palette.textSoft}>
            Undo
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            selection();
            tasbih.resetCurrent(dhikr.id);
          }}
          disabled={count === 0}
          accessibilityRole="button"
          accessibilityLabel="Reset counter to zero"
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
            count === 0 && styles.disabled,
          ]}
        >
          <RotateCcw size={17} color={palette.textSoft} strokeWidth={2} />
          <Text variant="bodySm" weight="medium" color={palette.textSoft}>
            Reset
          </Text>
        </Pressable>
      </View>

      <Card style={styles.lifetimeCard}>
        <View style={styles.lifetimeRow}>
          <View style={styles.flex}>
            <Text variant="label" color={palette.textMuted}>
              Lifetime dhikr
            </Text>
            <Text variant="h2">{tasbih.lifetime.toLocaleString()}</Text>
          </View>
          <Pressable
            onPress={() => {
              selection();
              tasbih.resetAll();
            }}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Reset all counters and lifetime total"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text variant="caption" weight="semibold" color={palette.rose}>
              Reset all
            </Text>
          </Pressable>
        </View>
      </Card>
    </ScrollView>
  );
}

/* ── Du'a ────────────────────────────────────────────────────────── */

function DuaPanel({ bottomInset }: { bottomInset: number }) {
  const [occasion, setOccasion] = useState<string>('All');
  const showTransliteration = useSettingsStore((s) => s.showTransliteration);
  const update = useSettingsStore((s) => s.update);

  const filtered = useMemo(
    () => (occasion === 'All' ? DUAS : DUAS.filter((d) => d.occasion === occasion)),
    [occasion]
  );

  return (
    <ScrollView
      contentContainerStyle={[
        styles.panel,
        { paddingBottom: bottomInset + space.xxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Segmented
        scrollable
        options={['All', ...DUA_OCCASIONS].map((o) => ({ value: o, label: o }))}
        value={occasion}
        onChange={(value) => {
          selection();
          setOccasion(value);
        }}
        style={styles.presetRow}
      />

      <SectionHeader
        title={`${filtered.length} supplications`}
        action={{
          label: showTransliteration ? 'Hide transliteration' : 'Show transliteration',
          onPress: () => update({ showTransliteration: !showTransliteration }),
        }}
      />

      <View style={styles.duaList}>
        {filtered.map((dua) => (
          <Card key={dua.id} style={styles.duaCard}>
            <View style={styles.duaHeader}>
              <Text variant="body" weight="semibold" style={styles.flex}>
                {dua.title}
              </Text>
              <Pill label={dua.occasion} tone="neutral" />
            </View>

            <ArabicText variant="dua" style={styles.duaArabic}>
              {dua.arabic}
            </ArabicText>

            {showTransliteration ? (
              <Text
                variant="bodySm"
                color={palette.gold}
                style={styles.transliterationText}
              >
                {dua.transliteration}
              </Text>
            ) : null}

            <Text variant="bodySm" color={palette.textSoft} style={styles.duaTranslation}>
              {dua.translation}
            </Text>

            <Text variant="caption" color={palette.textFaint} style={styles.reference}>
              {dua.reference}
            </Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  centered: { textAlign: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
  },
  headerButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Balances the header row without looking like a tappable button.
  headerSpacer: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  tabWrap: {
    paddingHorizontal: space.lg,
    paddingBottom: space.base,
  },

  panel: {
    paddingHorizontal: space.lg,
  },
  presetRow: {
    marginBottom: space.lg,
  },

  dhikrText: {
    alignItems: 'center',
    gap: 6,
    marginBottom: space.lg,
  },
  translit: {
    marginTop: space.xs,
  },

  counterWrap: {
    alignItems: 'center',
  },
  counterGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: COUNTER_SIZE,
    backgroundColor: palette.goldGlow,
  },
  counterCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  countValue: {
    fontSize: 68,
    lineHeight: 76,
    color: palette.text,
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    marginTop: space.md,
  },
  counterActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.md,
    marginTop: space.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    minHeight: MIN_TOUCH,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    justifyContent: 'center',
  },
  lifetimeCard: {
    marginTop: space.xl,
  },
  lifetimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.base,
  },

  duaList: {
    gap: space.md,
  },
  duaCard: {
    gap: space.md,
  },
  duaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  duaArabic: {
    textAlign: 'right',
  },
  transliterationText: {
    fontStyle: 'italic',
    lineHeight: 22,
  },
  duaTranslation: {
    lineHeight: 23,
  },
  reference: {
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairlineFaint,
  },
});

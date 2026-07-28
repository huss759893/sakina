import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Compass,
  Hand,
  Landmark,
  MoonStar,
  RefreshCw,
  Settings as SettingsIcon,
  Sunrise,
  WifiOff,
  Calculator,
  BookOpen,
} from 'lucide-react-native';

import { Text, ArabicText } from '@/components/Text';
import { Card } from '@/components/Card';
import { GradientSky } from '@/components/GradientSky';
import { KhatamPattern } from '@/components/KhatamPattern';
import { PrayerRing } from '@/components/PrayerRing';
import { SectionHeader, Pill } from '@/components/Controls';
import { LoadingState, ErrorState, LocationPrompt } from '@/components/StateViews';
import { useTabBarClearance } from '@/components/Screen';

import { useLocationStore } from '@/store/useLocationStore';
import {
  usePrayerStore,
  selectTimeline,
  selectHijri,
  selectTimeZone,
} from '@/store/usePrayerStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNow } from '@/hooks/useNow';

import { formatHijri, formatHijriArabic } from '@/api/aladhan';
import {
  resolveNextPrayer,
  resolvePhase,
  formatCountdown,
  formatClock,
  formatGregorian,
  addDays,
  type PrayerEvent,
} from '@/utils/time';
import {
  palette,
  space,
  radius,
  phaseAccent,
  phaseLabel,
  shadow,
  HIT_SLOP,
} from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottomPad = useTabBarClearance();

  // Tick every second — the countdown is the reason this screen exists.
  const now = useNow(1000);

  const {
    coords,
    label,
    status: locStatus,
    error: locError,
    requestLocation,
  } = useLocationStore();
  const { methodId, school, use24Hour } = useSettingsStore();
  const {
    days,
    status: prayerStatus,
    error: prayerError,
    isStale,
    load,
  } = usePrayerStore();

  useEffect(() => {
    if (!coords) return;
    void load(coords, methodId, school);
  }, [coords, methodId, school, load]);

  const today = useMemo(() => selectTimeline({ days }, now), [days, now]);
  const tomorrow = useMemo(
    () => selectTimeline({ days }, addDays(now, 1)),
    [days, now]
  );
  const hijri = useMemo(() => selectHijri({ days }, now), [days, now]);
  // Null when the location is the device's own; set for a manually picked city.
  const timeZone = useMemo(() => selectTimeZone({ days }, now), [days, now]);

  const next = useMemo(
    () => resolveNextPrayer(today, tomorrow, now),
    [today, tomorrow, now]
  );
  const phase = useMemo(() => resolvePhase(today, now), [today, now]);
  const accent = phaseAccent[phase];

  const onRefresh = useCallback(() => {
    if (coords) void load(coords, methodId, school, { force: true });
  }, [coords, methodId, school, load]);

  if (!coords) {
    return (
      <View style={styles.fill}>
        <LocationPrompt
          message="Sakina needs your location to calculate prayer times for where you are. Nothing leaves your device except the coordinates sent to the free Aladhan API."
          onRequest={() => void requestLocation()}
          busy={locStatus === 'requesting'}
          error={locError}
          onSetManually={() => navigation.navigate('LocationSearch')}
        />
      </View>
    );
  }

  if (prayerStatus === 'loading' && today.length === 0) {
    return <LoadingState message="Calculating prayer times…" />;
  }

  if (prayerStatus === 'error' && today.length === 0) {
    return (
      <ErrorState
        title="Could not load prayer times"
        message={prayerError ?? 'Please try again.'}
        onRetry={onRefresh}
      />
    );
  }

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={prayerStatus === 'loading'}
          onRefresh={onRefresh}
          tintColor={palette.gold}
          colors={[palette.gold]}
          progressBackgroundColor={palette.surface}
        />
      }
    >
      {/* ── The living sky ─────────────────────────────────────────── */}
      <GradientSky phase={phase} style={styles.hero}>
        <KhatamPattern tile={94} opacity={0.09} color={accent} />

        <View style={[styles.heroInner, { paddingTop: insets.top + space.md }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroTopText}>
              <Text variant="label" color="rgba(255,255,255,0.72)">
                {phaseLabel[phase]} · {label || 'Your location'}
              </Text>
              <Text variant="h2" color={palette.white} style={styles.heroDate}>
                {hijri ? formatHijri(hijri) : formatGregorian(now)}
              </Text>
              {hijri ? (
                <ArabicText
                  variant="inline"
                  color="rgba(255,255,255,0.78)"
                  style={styles.heroArabic}
                >
                  {formatHijriArabic(hijri)}
                </ArabicText>
              ) : null}
            </View>

            <Pressable
              onPress={() => navigation.navigate('Settings')}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <SettingsIcon size={20} color={palette.white} strokeWidth={1.8} />
            </Pressable>
          </View>

          {/* ── The arc + countdown ──────────────────────────────── */}
          {next ? (
            <View style={styles.countdownBlock}>
              <PrayerRing
                progress={next.progress}
                size={220}
                strokeWidth={9}
                color={palette.white}
                trackColor="rgba(255,255,255,0.18)"
              >
                <Text variant="label" color="rgba(255,255,255,0.72)">
                  {next.isTomorrow ? 'Tomorrow' : 'Next prayer'}
                </Text>
                <Text
                  variant="h1"
                  color={palette.white}
                  style={styles.nextName}
                >
                  {next.next.label}
                </Text>
                <Text
                  variant="display"
                  color={palette.white}
                  style={styles.countdown}
                  // Announce minute changes, not every tick.
                  accessibilityLabel={`${formatCountdown(next.msRemaining)} until ${next.next.label}`}
                >
                  {formatCountdown(next.msRemaining)}
                </Text>
                <Text variant="bodySm" color="rgba(255,255,255,0.82)">
                  at {formatClock(next.next.date, use24Hour, timeZone)}
                </Text>
              </PrayerRing>

              <ArabicText
                variant="inline"
                color="rgba(255,255,255,0.9)"
                style={styles.nextArabic}
              >
                {next.next.arabic}
              </ArabicText>
            </View>
          ) : (
            <View style={styles.countdownBlock}>
              <Text variant="body" color={palette.white}>
                Prayer times unavailable for today.
              </Text>
            </View>
          )}
        </View>
      </GradientSky>

      <View style={styles.body}>
        {isStale ? (
          <Card style={styles.staleCard} padded>
            <View style={styles.staleRow}>
              <WifiOff size={17} color={palette.amber} strokeWidth={1.8} />
              <Text variant="caption" color={palette.textSoft} style={styles.flex}>
                Showing saved times — could not reach the server. Pull down to retry.
              </Text>
            </View>
          </Card>
        ) : null}

        {/* ── Today's timeline ───────────────────────────────────── */}
        <SectionHeader
          title="Today"
          action={{ label: 'All times', onPress: () => navigation.navigate('Tabs', { screen: 'Prayers' }) }}
        />
        <Card padded={false} style={styles.timelineCard}>
          {today.map((event, index) => (
            <TimelineRow
              key={event.key}
              event={event}
              isNext={next?.next.key === event.key && !next.isTomorrow}
              isPast={event.date.getTime() < now.getTime()}
              use24Hour={use24Hour}
              timeZone={timeZone}
              accent={accent}
              isLast={index === today.length - 1}
            />
          ))}
        </Card>

        {/* ── Quick actions ──────────────────────────────────────── */}
        <SectionHeader title="Explore" style={styles.sectionSpacing} />
        <View style={styles.grid}>
          <ActionTile
            icon={<Compass size={22} color={palette.gold} strokeWidth={1.8} />}
            title="Qibla"
            subtitle="Find the direction"
            onPress={() => navigation.navigate('Tabs', { screen: 'Qibla' })}
          />
          <ActionTile
            icon={<BookOpen size={22} color={palette.jade} strokeWidth={1.8} />}
            title="Al-Qur'an"
            subtitle="114 surahs"
            onPress={() => navigation.navigate('Tabs', { screen: 'Quran' })}
          />
          <ActionTile
            icon={<Hand size={22} color={palette.gold} strokeWidth={1.8} />}
            title="Tasbih & Du'a"
            subtitle="Count and recite"
            onPress={() => navigation.navigate('Dhikr')}
          />
          <ActionTile
            icon={<Landmark size={22} color={palette.jade} strokeWidth={1.8} />}
            title="Mosques"
            subtitle="Nearby on OSM"
            onPress={() => navigation.navigate('Mosques')}
          />
          <ActionTile
            icon={<Calculator size={22} color={palette.gold} strokeWidth={1.8} />}
            title="Zakat"
            subtitle="Calculate 2.5%"
            onPress={() => navigation.navigate('Zakat')}
          />
          <ActionTile
            icon={<RefreshCw size={22} color={palette.textSoft} strokeWidth={1.8} />}
            title="Refresh"
            subtitle="Reload times"
            onPress={onRefresh}
          />
        </View>
      </View>
    </ScrollView>
  );
}

/** One row of the day's timeline. */
function TimelineRow({
  event,
  isNext,
  isPast,
  use24Hour,
  timeZone,
  accent,
  isLast,
}: {
  event: PrayerEvent;
  isNext: boolean;
  isPast: boolean;
  use24Hour: boolean;
  timeZone: string | null;
  accent: string;
  isLast: boolean;
}) {
  const dim = isPast && !isNext;

  return (
    <View
      style={[
        styles.timelineRow,
        !isLast && styles.timelineDivider,
        isNext && { backgroundColor: palette.goldGlow },
      ]}
      accessibilityLabel={`${event.label} at ${formatClock(event.date, use24Hour, timeZone)}${isNext ? ', next prayer' : ''}`}
    >
      <View
        style={[
          styles.timelineDot,
          { backgroundColor: isNext ? accent : dim ? palette.textFaint : palette.textMuted },
        ]}
      />
      <View style={styles.flex}>
        <Text
          variant="body"
          weight={isNext ? 'bold' : 'medium'}
          color={dim ? palette.textMuted : palette.text}
        >
          {event.label}
        </Text>
        {!event.isFard ? (
          <Text variant="caption" color={palette.textFaint}>
            End of Fajr — not a prayer
          </Text>
        ) : null}
      </View>

      {isNext ? <Pill label="Next" tone="gold" /> : null}

      <Text
        variant="numeric"
        weight={isNext ? 'bold' : 'medium'}
        color={dim ? palette.textMuted : palette.text}
      >
        {formatClock(event.date, use24Hour, timeZone)}
      </Text>
    </View>
  );
}

function ActionTile({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={styles.tileIcon}>{icon}</View>
      <Text variant="body" weight="semibold" numberOfLines={1}>
        {title}
      </Text>
      <Text variant="caption" color={palette.textMuted} numberOfLines={1}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },

  hero: {
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    ...shadow.lifted,
  },
  heroInner: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  heroTopText: {
    flex: 1,
    gap: 4,
  },
  heroDate: {
    marginTop: 2,
  },
  heroArabic: {
    textAlign: 'left',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.65 },

  countdownBlock: {
    alignItems: 'center',
    marginTop: space.xl,
    gap: space.md,
  },
  nextName: {
    marginTop: 2,
  },
  countdown: {
    marginVertical: 2,
    fontVariant: ['tabular-nums'],
  },
  nextArabic: {
    textAlign: 'center',
  },

  body: {
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
  },
  sectionSpacing: {
    marginTop: space.xl,
  },

  staleCard: {
    marginBottom: space.base,
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.amber,
  },
  staleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },

  timelineCard: {
    overflow: 'hidden',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
    minHeight: 56,
  },
  timelineDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairlineFaint,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  tile: {
    // Two per row, accounting for the 12pt gap.
    width: '47.8%',
    flexGrow: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    padding: space.base,
    gap: 3,
    minHeight: 104,
  },
  tilePressed: {
    backgroundColor: palette.surfaceRaised,
  },
  tileIcon: {
    marginBottom: space.sm,
  },
});

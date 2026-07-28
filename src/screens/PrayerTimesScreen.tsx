import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell, BellOff, CalendarDays, Info, MapPin } from 'lucide-react-native';

import { Text, ArabicText } from '@/components/Text';
import { Card } from '@/components/Card';
import { Segmented, SectionHeader, Pill, ToggleRow } from '@/components/Controls';
import { LoadingState, ErrorState, LocationPrompt } from '@/components/StateViews';
import { Screen, useTabBarClearance } from '@/components/Screen';

import { useLocationStore } from '@/store/useLocationStore';
import {
  usePrayerStore,
  selectTimeline,
  selectHijri,
  selectUpcomingDays,
  selectTimeZone,
} from '@/store/usePrayerStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNow } from '@/hooks/useNow';

import { formatHijri } from '@/api/aladhan';
import { findMethod } from '@/data/methods';
import {
  resolveNextPrayer,
  formatClock,
  formatGregorian,
  formatRelative,
  addDays,
  isSameDay,
  type PrayerEvent,
} from '@/utils/time';
import {
  schedulePrayerNotifications,
  cancelAllPrayerNotifications,
} from '@/services/notifications';
import { palette, space, radius } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Range = 'today' | 'tomorrow' | 'week';
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function PrayerTimesScreen() {
  const navigation = useNavigation<Nav>();
  const bottomPad = useTabBarClearance();
  const now = useNow(30_000);
  const [range, setRange] = useState<Range>('today');
  const [scheduling, setScheduling] = useState(false);
  const [scheduleNote, setScheduleNote] = useState<string | null>(null);

  const {
    coords,
    label,
    status: locStatus,
    error: locError,
    requestLocation,
  } = useLocationStore();
  const settings = useSettingsStore();
  const { days, status, error, isStale, load } = usePrayerStore();

  useEffect(() => {
    if (!coords) return;
    void load(coords, settings.methodId, settings.school);
  }, [coords, settings.methodId, settings.school, load]);

  const today = useMemo(() => selectTimeline({ days }, now), [days, now]);
  const tomorrow = useMemo(
    () => selectTimeline({ days }, addDays(now, 1)),
    [days, now]
  );
  const week = useMemo(() => selectUpcomingDays({ days }, 7, now), [days, now]);
  const hijri = useMemo(() => selectHijri({ days }, now), [days, now]);
  // Set when the timings belong to a manually chosen city in another zone.
  const timeZone = useMemo(() => selectTimeZone({ days }, now), [days, now]);
  const next = useMemo(
    () => resolveNextPrayer(today, tomorrow, now),
    [today, tomorrow, now]
  );

  const onRefresh = useCallback(() => {
    if (coords) void load(coords, settings.methodId, settings.school, { force: true });
  }, [coords, settings.methodId, settings.school, load]);

  /** Reschedules the whole pending set whenever the toggle or times change. */
  const onToggleNotifications = useCallback(
    async (enabled: boolean) => {
      setScheduling(true);
      setScheduleNote(null);

      try {
        if (!enabled) {
          await cancelAllPrayerNotifications();
          settings.update({ notificationsEnabled: false });
          setScheduleNote('Reminders turned off.');
          return;
        }

        const result = await schedulePrayerNotifications(
          week.map((d) => ({ date: d.date, timeline: d.timeline })),
          settings.notificationLeadMinutes
        );

        if (!result.granted) {
          settings.update({ notificationsEnabled: false });
          setScheduleNote(
            'Notification permission was declined. Enable it in system settings to get reminders.'
          );
          return;
        }

        settings.update({ notificationsEnabled: true });
        setScheduleNote(
          `${result.scheduled} reminders scheduled for the week ahead.`
        );
      } catch {
        settings.update({ notificationsEnabled: false });
        setScheduleNote('Could not schedule reminders on this device.');
      } finally {
        setScheduling(false);
      }
    },
    [settings, week]
  );

  if (!coords) {
    return (
      <Screen>
        <LocationPrompt
          message="Prayer times are calculated from your coordinates. Grant access, or pick a city by hand."
          onRequest={() => void requestLocation()}
          busy={locStatus === 'requesting'}
          error={locError}
          onSetManually={() => navigation.navigate('LocationSearch')}
        />
      </Screen>
    );
  }

  if (status === 'loading' && today.length === 0) {
    return (
      <Screen>
        <LoadingState message="Loading the month's timetable…" />
      </Screen>
    );
  }

  if (status === 'error' && today.length === 0) {
    return (
      <Screen>
        <ErrorState message={error ?? 'Please try again.'} onRetry={onRefresh} />
      </Screen>
    );
  }

  const method = findMethod(settings.methodId);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={status === 'loading'}
            onRefresh={onRefresh}
            tintColor={palette.gold}
            colors={[palette.gold]}
            progressBackgroundColor={palette.surface}
          />
        }
      >
        <View style={styles.header}>
          <Text variant="h1">Prayer Times</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={palette.textMuted} strokeWidth={2} />
            <Text variant="bodySm" color={palette.textMuted} numberOfLines={1}>
              {label || 'Current location'}
            </Text>
          </View>
          {hijri ? (
            <Text variant="caption" color={palette.gold}>
              {formatHijri(hijri)}
            </Text>
          ) : null}
        </View>

        {next ? (
          <Card style={styles.nextCard} elevated>
            <View style={styles.nextRow}>
              <View style={styles.flex}>
                <Text variant="label" color={palette.textMuted}>
                  {next.isTomorrow ? 'Tomorrow' : 'Up next'}
                </Text>
                <Text variant="h2" style={styles.nextName}>
                  {next.next.label}
                </Text>
                <Text variant="bodySm" color={palette.textSoft}>
                  {formatClock(next.next.date, settings.use24Hour, timeZone)} ·{' '}
                  {formatRelative(next.msRemaining)}
                </Text>
              </View>
              <ArabicText variant="inline" color={palette.gold}>
                {next.next.arabic}
              </ArabicText>
            </View>
          </Card>
        ) : null}

        {isStale ? (
          <Card style={styles.warnCard}>
            <Text variant="caption" color={palette.amber}>
              Offline — showing saved times. Pull down to refresh.
            </Text>
          </Card>
        ) : null}

        <Segmented
          options={[
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
            { value: 'week', label: '7 days' },
          ]}
          value={range}
          onChange={setRange}
          style={styles.segmented}
        />

        {range === 'week' ? (
          <View style={styles.weekList}>
            {week.map((day) => (
              <View key={day.date.toISOString()} style={styles.weekBlock}>
                <SectionHeader
                  title={
                    isSameDay(day.date, now)
                      ? `Today · ${formatGregorian(day.date)}`
                      : formatGregorian(day.date)
                  }
                />
                <Card padded={false}>
                  {day.timeline.map((event, i) => (
                    <PrayerRow
                      key={event.key}
                      event={event}
                      use24Hour={settings.use24Hour}
                      timeZone={timeZone}
                      isLast={i === day.timeline.length - 1}
                      isNext={false}
                      isPast={false}
                    />
                  ))}
                </Card>
              </View>
            ))}
            {week.length === 0 ? (
              <Text variant="bodySm" color={palette.textMuted}>
                No upcoming days loaded yet.
              </Text>
            ) : null}
          </View>
        ) : (
          <Card padded={false} style={styles.dayCard}>
            {(range === 'today' ? today : tomorrow).map((event, i, arr) => (
              <PrayerRow
                key={event.key}
                event={event}
                use24Hour={settings.use24Hour}
                timeZone={timeZone}
                isLast={i === arr.length - 1}
                isNext={
                  range === 'today' &&
                  next?.next.key === event.key &&
                  !next.isTomorrow
                }
                isPast={range === 'today' && event.date.getTime() < now.getTime()}
              />
            ))}
          </Card>
        )}

        {/* ── Reminders ──────────────────────────────────────────── */}
        <SectionHeader title="Reminders" style={styles.sectionSpacing} />
        <Card>
          <ToggleRow
            label="Adhan reminders"
            description="A local notification at each prayer time for the week ahead."
            value={settings.notificationsEnabled}
            onValueChange={(v) => void onToggleNotifications(v)}
            disabled={scheduling}
          />
          {settings.notificationsEnabled ? (
            <>
              <Text variant="caption" color={palette.textMuted} style={styles.leadLabel}>
                Notify me
              </Text>
              <Segmented
                options={[
                  { value: 0, label: 'On time' },
                  { value: 5, label: '5 min before' },
                  { value: 15, label: '15 min before' },
                ]}
                value={settings.notificationLeadMinutes}
                onChange={(v) => {
                  settings.update({ notificationLeadMinutes: v });
                  void onToggleNotifications(true);
                }}
              />
            </>
          ) : null}

          {scheduleNote ? (
            <View style={styles.noteRow}>
              {settings.notificationsEnabled ? (
                <Bell size={14} color={palette.jade} strokeWidth={2} />
              ) : (
                <BellOff size={14} color={palette.textMuted} strokeWidth={2} />
              )}
              <Text variant="caption" color={palette.textMuted} style={styles.flex}>
                {scheduleNote}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* ── Method disclosure ──────────────────────────────────── */}
        <SectionHeader title="Calculation" style={styles.sectionSpacing} />
        <Card>
          <View style={styles.methodRow}>
            <Info size={16} color={palette.textMuted} strokeWidth={2} />
            <View style={styles.flex}>
              <Text variant="bodySm" weight="semibold">
                {method.name}
              </Text>
              <Text variant="caption" color={palette.textMuted}>
                {method.region} · Asr:{' '}
                {settings.school === 1 ? 'Ḥanafī (shadow ×2)' : 'Standard (shadow ×1)'}
              </Text>
            </View>
          </View>
          <Text variant="caption" color={palette.textFaint} style={styles.disclaimer}>
            Times are computed by the Aladhan API from your coordinates. Authorities
            differ on the Fajr and Isha twilight angles — if these disagree with your
            local mosque, change the method in Settings.
          </Text>
        </Card>

        <View style={styles.attribution}>
          <CalendarDays size={13} color={palette.textFaint} strokeWidth={2} />
          <Text variant="caption" color={palette.textFaint}>
            Prayer times &amp; Hijri dates from api.aladhan.com
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function PrayerRow({
  event,
  use24Hour,
  timeZone,
  isLast,
  isNext,
  isPast,
}: {
  event: PrayerEvent;
  use24Hour: boolean;
  timeZone: string | null;
  isLast: boolean;
  isNext: boolean;
  isPast: boolean;
}) {
  const dim = isPast && !isNext;

  return (
    <View
      style={[
        styles.prayerRow,
        !isLast && styles.rowDivider,
        isNext && styles.rowHighlight,
      ]}
    >
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
            End of Fajr
          </Text>
        ) : null}
      </View>

      <ArabicText
        variant="inline"
        color={dim ? palette.textFaint : palette.textSoft}
        style={styles.rowArabic}
      >
        {event.arabic}
      </ArabicText>

      {isNext ? <Pill label="Next" tone="gold" style={styles.rowPill} /> : null}

      <Text
        variant="numeric"
        weight={isNext ? 'bold' : 'medium'}
        color={dim ? palette.textMuted : palette.text}
        style={styles.rowTime}
      >
        {formatClock(event.date, use24Hour, timeZone)}
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
  nextCard: {
    marginBottom: space.base,
    borderColor: palette.goldDeep,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.base,
  },
  nextName: {
    marginVertical: 2,
  },
  warnCard: {
    marginBottom: space.base,
    borderColor: palette.amber,
  },
  segmented: {
    marginBottom: space.base,
  },
  dayCard: {
    overflow: 'hidden',
  },
  weekList: {
    gap: space.lg,
  },
  weekBlock: {
    gap: 0,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
    minHeight: 58,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairlineFaint,
  },
  rowHighlight: {
    backgroundColor: palette.goldGlow,
  },
  rowArabic: {
    textAlign: 'right',
  },
  rowPill: {
    marginLeft: 2,
  },
  rowTime: {
    minWidth: 78,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  sectionSpacing: {
    marginTop: space.xl,
  },
  leadLabel: {
    marginTop: space.md,
    marginBottom: space.sm,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairlineFaint,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  disclaimer: {
    marginTop: space.md,
    lineHeight: 17,
  },
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: space.xl,
    paddingBottom: space.base,
  },
});

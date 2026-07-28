import type { PrayerPhase } from '@/theme/colors';

/** The five obligatory prayers, in order. Sunrise is tracked but is not one. */
export const FARD_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type FardPrayer = (typeof FARD_PRAYERS)[number];

export const TIMELINE_KEYS = [
  'Fajr',
  'Sunrise',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha',
] as const;
export type TimelineKey = (typeof TIMELINE_KEYS)[number];

export interface PrayerEvent {
  key: TimelineKey;
  label: string;
  /** Arabic name, for the secondary line. */
  arabic: string;
  date: Date;
  /** Sunrise marks the end of Fajr's window; it is not a prayer. */
  isFard: boolean;
}

export const PRAYER_ARABIC: Record<TimelineKey, string> = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

/* ── Timezone handling ────────────────────────────────────────────────
 *
 * Aladhan reports wall-clock times for the *queried coordinates*. When the
 * device is at those coordinates — the usual case — interpreting them as local
 * time is correct. But once a user picks a city manually, it is not: "04:01"
 * for Istanbul is not 04:01 in London, and a countdown built from the device's
 * clock would be wrong by the whole offset between the two zones.
 *
 * So a timeline can be built against an explicit IANA zone. Everything falls
 * back to local construction if Intl lacks timezone data, which keeps the
 * common path fast and the uncommon path safe.
 */

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

/** Offset of `timeZone` from UTC at instant `at`, in minutes (east positive). */
function zoneOffsetMinutes(timeZone: string, at: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(at);

    const pick = (type: string): number => {
      const raw = parts.find((p) => p.type === type)?.value;
      return raw === undefined ? NaN : Number(raw);
    };

    // Some ICU builds emit hour "24" for midnight under hour12: false.
    const hour = pick('hour') === 24 ? 0 : pick('hour');

    const asIfUTC = Date.UTC(
      pick('year'),
      pick('month') - 1,
      pick('day'),
      hour,
      pick('minute'),
      pick('second')
    );
    if (!Number.isFinite(asIfUTC)) return null;

    // `at` may carry milliseconds the formatter dropped; floor to the second.
    return (asIfUTC - Math.floor(at.getTime() / 1000) * 1000) / 60000;
  } catch {
    return null;
  }
}

/**
 * The real instant at which a given wall-clock time occurs in `timeZone`.
 *
 * Two passes: guess by treating the wall time as UTC, then correct using the
 * zone's offset at that guess. The second pass matters across DST boundaries,
 * where the offset at the guess differs from the offset at the true instant.
 */
export function zonedWallTimeToDate(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timeZone: string
): Date | null {
  const guess = Date.UTC(year, month - 1, day, hours, minutes);

  const firstOffset = zoneOffsetMinutes(timeZone, new Date(guess));
  if (firstOffset === null) return null;

  let instant = guess - firstOffset * 60000;

  const secondOffset = zoneOffsetMinutes(timeZone, new Date(instant));
  if (secondOffset !== null && secondOffset !== firstOffset) {
    instant = guess - secondOffset * 60000;
  }

  return new Date(instant);
}

/** Extracts HH:MM, tolerating Aladhan's occasional " (BST)" suffix. */
function parseHoursMinutes(time: string): { hours: number; minutes: number } | null {
  const match = /(\d{1,2}):(\d{2})/.exec(time ?? '');
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;

  return { hours, minutes };
}

/**
 * Aladhan returns times as "03:12", sometimes as "03:12 (BST)". Builds the
 * instant on `onDay`, in the device's local zone.
 */
export function parseTimeToDate(time: string, onDay: Date): Date | null {
  const parsed = parseHoursMinutes(time);
  if (!parsed) return null;

  const d = new Date(onDay);
  d.setHours(parsed.hours, parsed.minutes, 0, 0);
  return d;
}

/**
 * Builds the ordered timeline for one calendar day.
 *
 * `timeZone` is the zone the timings belong to. Pass it whenever the location
 * may not be where the device is; omit it to interpret them locally.
 */
export function buildTimeline(
  timings: Record<string, string>,
  day: Date,
  timeZone?: string | null
): PrayerEvent[] {
  const events: PrayerEvent[] = [];

  // Skip the Intl work entirely when the zone is absent or already local.
  const needsZone = Boolean(timeZone) && timeZone !== deviceTimeZone();

  for (const key of TIMELINE_KEYS) {
    const raw = timings[key];
    if (!raw) continue;

    let date: Date | null = null;

    if (needsZone && timeZone) {
      const parsed = parseHoursMinutes(raw);
      if (parsed) {
        date = zonedWallTimeToDate(
          day.getFullYear(),
          day.getMonth() + 1,
          day.getDate(),
          parsed.hours,
          parsed.minutes,
          timeZone
        );
      }
    }

    // Falls through to local construction when no zone applies, or when Intl
    // could not resolve one.
    date ??= parseTimeToDate(raw, day);
    if (!date) continue;

    events.push({
      key,
      label: key,
      arabic: PRAYER_ARABIC[key],
      date,
      isFard: key !== 'Sunrise',
    });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface NextPrayerInfo {
  /** The upcoming obligatory prayer. */
  next: PrayerEvent;
  /** The obligatory prayer whose window we are currently inside. */
  current: PrayerEvent | null;
  /** 0..1 progress through the window between `current` and `next`. */
  progress: number;
  msRemaining: number;
  /** True when `next` falls on the following calendar day. */
  isTomorrow: boolean;
}

/**
 * Determines the next obligatory prayer, rolling over to tomorrow's Fajr once
 * Isha has passed. `tomorrow` is required for that rollover to produce a real
 * countdown rather than a negative one.
 */
export function resolveNextPrayer(
  today: PrayerEvent[],
  tomorrow: PrayerEvent[],
  now: Date = new Date()
): NextPrayerInfo | null {
  const fardToday = today.filter((e) => e.isFard);
  if (fardToday.length === 0) return null;

  const t = now.getTime();
  const upcomingIdx = fardToday.findIndex((e) => e.date.getTime() > t);

  let next: PrayerEvent;
  let current: PrayerEvent | null;
  let isTomorrow = false;

  if (upcomingIdx === -1) {
    // Isha has passed. Next is tomorrow's Fajr.
    const tomorrowFajr = tomorrow.find((e) => e.key === 'Fajr');
    if (!tomorrowFajr) return null;
    next = tomorrowFajr;
    current = fardToday[fardToday.length - 1] ?? null;
    isTomorrow = true;
  } else {
    next = fardToday[upcomingIdx]!;
    if (upcomingIdx === 0) {
      // Before Fajr — we are still inside yesterday's Isha window.
      current = null;
    } else {
      current = fardToday[upcomingIdx - 1] ?? null;
    }
  }

  const windowStart = current
    ? current.date.getTime()
    : // Before Fajr: measure from yesterday's Isha, approximated by today's.
      next.date.getTime() - 6 * 60 * 60 * 1000;

  const windowEnd = next.date.getTime();
  const span = Math.max(windowEnd - windowStart, 1);
  const progress = Math.min(Math.max((t - windowStart) / span, 0), 1);

  return {
    next,
    current,
    progress,
    msRemaining: Math.max(windowEnd - t, 0),
    isTomorrow,
  };
}

/** Which sky to paint, based on where `now` sits in the day's timeline. */
export function resolvePhase(
  timeline: PrayerEvent[],
  now: Date = new Date()
): PrayerPhase {
  const at = (key: TimelineKey): number | null =>
    timeline.find((e) => e.key === key)?.date.getTime() ?? null;

  const t = now.getTime();
  const fajr = at('Fajr');
  const sunrise = at('Sunrise');
  const dhuhr = at('Dhuhr');
  const asr = at('Asr');
  const maghrib = at('Maghrib');
  const isha = at('Isha');

  if (fajr !== null && t < fajr) return 'isha';
  if (sunrise !== null && t < sunrise) return 'fajr';
  if (dhuhr !== null && t < dhuhr) return 'sunrise';
  if (asr !== null && t < asr) return 'dhuhr';
  if (maghrib !== null && t < maghrib) return 'asr';
  if (isha !== null && t < isha) return 'maghrib';
  return 'isha';
}

export interface CountdownParts {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

export function splitDuration(ms: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
  };
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** "2:04:19" while far out, "04:19" inside the last hour. */
export function formatCountdown(ms: number): string {
  const { hours, minutes, seconds } = splitDuration(ms);
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** Human phrasing for the "in ..." line. */
export function formatRelative(ms: number): string {
  const { hours, minutes } = splitDuration(ms);
  if (hours === 0 && minutes === 0) return 'now';
  if (hours === 0) return `in ${minutes} min`;
  if (minutes === 0) return `in ${hours} hr`;
  return `in ${hours} hr ${minutes} min`;
}

/**
 * Renders a clock time. With `timeZone`, shows the wall time a person *at that
 * location* would read — so a Londoner checking Istanbul sees Istanbul's 04:01,
 * not their own 02:01, while the countdown still runs on the true instant.
 */
export function formatClock(
  date: Date,
  use24Hour: boolean,
  timeZone?: string | null
): string {
  if (timeZone && timeZone !== deviceTimeZone()) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      }).formatToParts(date);

      const rawHour = Number(parts.find((p) => p.type === 'hour')?.value);
      const rawMinute = Number(parts.find((p) => p.type === 'minute')?.value);

      if (Number.isFinite(rawHour) && Number.isFinite(rawMinute)) {
        return formatHourMinute(rawHour === 24 ? 0 : rawHour, rawMinute, use24Hour);
      }
    } catch {
      // Fall through to local rendering.
    }
  }

  return formatHourMinute(date.getHours(), date.getMinutes(), use24Hour);
}

function formatHourMinute(h: number, m: number, use24Hour: boolean): string {
  if (use24Hour) return `${pad(h)}:${pad(m)}`;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** Aladhan wants DD-MM-YYYY. */
export function toApiDate(date: Date): string {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

/** Stable YYYY-MM-DD key for caching and day comparisons. */
export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDayKey(a) === toDayKey(b);
}

export function formatGregorian(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

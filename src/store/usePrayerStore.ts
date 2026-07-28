import { create } from 'zustand';
import { fetchMonth, type AladhanDay, type HijriDate } from '@/api/aladhan';
import { describeError } from '@/api/client';
import { readCache, writeCache, readStaleCache } from '@/utils/storage';
import {
  buildTimeline,
  toApiDate,
  addDays,
  type PrayerEvent,
} from '@/utils/time';
import type { Coords } from '@/utils/geo';
import type { MadhabSchool } from '@/data/methods';

/**
 * Prayer times are fetched a month at a time. One request then covers today,
 * tomorrow's Fajr (needed so the countdown rolls over correctly after Isha)
 * and the week-ahead list — and the result is cacheable for a long time,
 * because for a fixed coordinate and method the timings are deterministic.
 */

const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export type PrayerStatus = 'idle' | 'loading' | 'ready' | 'error';

interface FetchKey {
  lat: number;
  lon: number;
  method: number;
  school: MadhabSchool;
  month: number;
  year: number;
}

interface PrayerState {
  /** Keyed by Aladhan's DD-MM-YYYY gregorian date string. */
  days: Record<string, AladhanDay>;
  status: PrayerStatus;
  error: string | null;
  /** True when showing cached data because the network failed. */
  isStale: boolean;
  lastKey: string | null;

  load: (
    coords: Coords,
    methodId: number,
    school: MadhabSchool,
    options?: { force?: boolean }
  ) => Promise<void>;
  clear: () => void;
}

const keyOf = (k: FetchKey): string =>
  `${k.lat.toFixed(3)},${k.lon.toFixed(3)}/${k.method}/${k.school}/${k.year}-${k.month}`;

const cacheKeyOf = (k: FetchKey): string => `prayers/month/${keyOf(k)}`;

function indexDays(days: AladhanDay[]): Record<string, AladhanDay> {
  const map: Record<string, AladhanDay> = {};
  for (const day of days) {
    const date = day?.date?.gregorian?.date;
    if (typeof date === 'string') map[date] = day;
  }
  return map;
}

export const usePrayerStore = create<PrayerState>((set, get) => ({
  days: {},
  status: 'idle',
  error: null,
  isStale: false,
  lastKey: null,

  load: async (coords, methodId, school, options) => {
    const now = new Date();

    // Two months are loaded whenever "tomorrow" would fall outside the current
    // one, so the post-Isha rollover on the 31st still has a Fajr to point at.
    const tomorrow = addDays(now, 1);
    const months: FetchKey[] = [
      {
        lat: coords.latitude,
        lon: coords.longitude,
        method: methodId,
        school,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
    ];

    if (tomorrow.getMonth() !== now.getMonth()) {
      months.push({
        lat: coords.latitude,
        lon: coords.longitude,
        method: methodId,
        school,
        month: tomorrow.getMonth() + 1,
        year: tomorrow.getFullYear(),
      });
    }

    const combinedKey = months.map(keyOf).join('|');
    if (!options?.force && get().lastKey === combinedKey && get().status === 'ready') {
      return;
    }

    set({ status: 'loading', error: null });

    // Serve any fresh cache first so the UI paints immediately.
    const cachedParts = await Promise.all(
      months.map((m) => readCache<AladhanDay[]>(cacheKeyOf(m), CACHE_TTL))
    );

    if (cachedParts.every((part) => part !== null)) {
      const merged = indexDays(cachedParts.flat() as AladhanDay[]);
      set({ days: merged, status: 'ready', isStale: false, lastKey: combinedKey });
      return;
    }

    try {
      const results = await Promise.all(
        months.map(async (m) => {
          const cached = await readCache<AladhanDay[]>(cacheKeyOf(m), CACHE_TTL);
          if (cached) return cached;

          const fresh = await fetchMonth({
            latitude: m.lat,
            longitude: m.lon,
            method: m.method,
            school: m.school,
            year: m.year,
            month: m.month,
          });
          void writeCache(cacheKeyOf(m), fresh);
          return fresh;
        })
      );

      set({
        days: indexDays(results.flat()),
        status: 'ready',
        error: null,
        isStale: false,
        lastKey: combinedKey,
      });
    } catch (error) {
      // Network failed — fall back to expired cache rather than an empty
      // screen. Prayer times from last month are still approximately right,
      // and we tell the user they are stale.
      const staleParts = await Promise.all(
        months.map((m) => readStaleCache<AladhanDay[]>(cacheKeyOf(m)))
      );
      const usable = staleParts.filter((p): p is AladhanDay[] => Array.isArray(p));

      if (usable.length > 0) {
        set({
          days: indexDays(usable.flat()),
          status: 'ready',
          isStale: true,
          error: describeError(error),
          lastKey: combinedKey,
        });
      } else {
        set({ status: 'error', error: describeError(error), isStale: false });
      }
    }
  },

  clear: () => set({ days: {}, status: 'idle', error: null, isStale: false, lastKey: null }),
}));

/** Raw Aladhan record for a calendar day, or null if not loaded. */
export function selectDay(
  state: Pick<PrayerState, 'days'>,
  date: Date
): AladhanDay | null {
  return state.days[toApiDate(date)] ?? null;
}

/**
 * The IANA zone the loaded timings belong to. This is the zone of the queried
 * coordinates, which is not the device's zone once a city is picked by hand.
 */
export function selectTimeZone(
  state: Pick<PrayerState, 'days'>,
  date: Date
): string | null {
  return selectDay(state, date)?.meta?.timezone ?? null;
}

export function selectTimeline(
  state: Pick<PrayerState, 'days'>,
  date: Date
): PrayerEvent[] {
  const day = selectDay(state, date);
  if (!day?.timings) return [];
  // Build against the location's own zone so instants — and therefore the
  // countdown — stay correct for a manually chosen city.
  return buildTimeline(day.timings, date, day.meta?.timezone ?? null);
}

export function selectHijri(
  state: Pick<PrayerState, 'days'>,
  date: Date
): HijriDate | null {
  return selectDay(state, date)?.date?.hijri ?? null;
}

/** The next `count` days that have data, starting today. */
export function selectUpcomingDays(
  state: Pick<PrayerState, 'days'>,
  count: number,
  from: Date = new Date()
): { date: Date; timeline: PrayerEvent[]; hijri: HijriDate | null }[] {
  const out: { date: Date; timeline: PrayerEvent[]; hijri: HijriDate | null }[] = [];

  for (let i = 0; i < count; i++) {
    const date = addDays(from, i);
    const timeline = selectTimeline(state, date);
    if (timeline.length === 0) continue;
    out.push({ date, timeline, hijri: selectHijri(state, date) });
  }

  return out;
}

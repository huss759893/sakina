import { requestJSON, USER_AGENT } from './client';
import { toApiDate } from '@/utils/time';

/** Prayer times and the Hijri calendar, from the free api.aladhan.com. */

const BASE = 'https://api.aladhan.com/v1';

export interface HijriDate {
  day: string;
  month: { number: number; en: string; ar: string };
  year: string;
  weekday: { en: string; ar: string };
  designation: { abbreviated: string };
  holidays: string[];
}

export interface AladhanDay {
  timings: Record<string, string>;
  date: {
    readable: string;
    timestamp: string;
    hijri: HijriDate;
    gregorian: { date: string; weekday: { en: string } };
  };
  meta: {
    timezone: string;
    method: { id: number; name: string };
  };
}

interface AladhanEnvelope<T> {
  code: number;
  status: string;
  data: T;
}

export interface TimingsParams {
  latitude: number;
  longitude: number;
  method: number;
  school: 0 | 1;
  date: Date;
}

function buildQuery(params: Omit<TimingsParams, 'date'>): string {
  return new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    method: String(params.method),
    school: String(params.school),
  }).toString();
}

function unwrap<T>(envelope: AladhanEnvelope<T>): T {
  if (envelope.code !== 200 || !envelope.data) {
    throw new Error(envelope.status || 'Aladhan returned an unexpected response');
  }
  return envelope.data;
}

/** Timings for a single day at a coordinate. */
export async function fetchTimings(
  params: TimingsParams,
  signal?: AbortSignal
): Promise<AladhanDay> {
  const url = `${BASE}/timings/${toApiDate(params.date)}?${buildQuery(params)}`;
  const json = await requestJSON<AladhanEnvelope<AladhanDay>>(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal,
  });
  return unwrap(json);
}

/**
 * A full month of timings in one request. Cheaper than one call per day and it
 * gives the week-ahead view and tomorrow's Fajr (needed for the post-Isha
 * countdown rollover) for free.
 */
export async function fetchMonth(
  params: Omit<TimingsParams, 'date'> & { year: number; month: number },
  signal?: AbortSignal
): Promise<AladhanDay[]> {
  const { year, month, ...rest } = params;
  const url = `${BASE}/calendar/${year}/${month}?${buildQuery(rest)}`;
  const json = await requestJSON<AladhanEnvelope<AladhanDay[]>>(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal,
    timeoutMs: 20000,
  });
  const data = unwrap(json);
  if (!Array.isArray(data)) {
    throw new Error('Aladhan returned an unexpected calendar shape');
  }
  return data;
}

export interface HijriConversion {
  hijri: HijriDate;
  gregorian: { date: string };
}

/** Gregorian to Hijri, used when prayer data is unavailable. */
export async function fetchHijri(
  date: Date,
  signal?: AbortSignal
): Promise<HijriDate> {
  const url = `${BASE}/gToH/${toApiDate(date)}`;
  const json = await requestJSON<AladhanEnvelope<HijriConversion>>(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal,
  });
  return unwrap(json).hijri;
}

/** "13 Ṣafar 1448 AH" */
export function formatHijri(hijri: HijriDate): string {
  return `${hijri.day} ${hijri.month.en} ${hijri.year} ${hijri.designation.abbreviated}`;
}

export function formatHijriArabic(hijri: HijriDate): string {
  return `${hijri.day} ${hijri.month.ar} ${hijri.year}`;
}

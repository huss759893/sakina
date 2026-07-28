import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * JSON-typed AsyncStorage wrapper. Every call swallows its own failure —
 * persistence is a convenience here, never a correctness requirement, and a
 * corrupt cache entry must not take the app down.
 */

const PREFIX = '@sakina/';

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — non-fatal.
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // Non-fatal.
  }
}

/** A cache entry that knows when it was written. */
export interface Cached<T> {
  value: T;
  savedAt: number;
}

export async function readCache<T>(
  key: string,
  maxAgeMs: number
): Promise<T | null> {
  const entry = await readJSON<Cached<T> | null>(key, null);
  if (!entry || typeof entry.savedAt !== 'number') return null;
  if (Date.now() - entry.savedAt > maxAgeMs) return null;
  return entry.value;
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  await writeJSON(key, { value, savedAt: Date.now() } satisfies Cached<T>);
}

/** Reads a cache entry regardless of age — the offline fallback path. */
export async function readStaleCache<T>(key: string): Promise<T | null> {
  const entry = await readJSON<Cached<T> | null>(key, null);
  return entry ? entry.value : null;
}

export const StorageKeys = {
  settings: 'settings',
  location: 'location',
  tasbih: 'tasbih',
  quranBookmarks: 'quran-bookmarks',
  quranProgress: 'quran-progress',
  zakat: 'zakat-input',
  prayerCache: (dayKey: string, lat: number, lon: number): string =>
    `prayers/${dayKey}/${lat.toFixed(2)},${lon.toFixed(2)}`,
  surahListCache: 'quran/surah-list',
  surahCache: (n: number, edition: string): string => `quran/surah/${n}/${edition}`,
  mosqueCache: (lat: number, lon: number, radius: number): string =>
    `mosques/${lat.toFixed(2)},${lon.toFixed(2)}/${radius}`,
} as const;

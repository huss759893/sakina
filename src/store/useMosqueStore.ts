import { create } from 'zustand';
import { fetchNearbyMosques, type Mosque } from '@/api/overpass';
import { describeError } from '@/api/client';
import { readCache, writeCache, StorageKeys } from '@/utils/storage';
import type { Coords } from '@/utils/geo';

/**
 * Overpass mirrors are volunteer infrastructure. Results are cached for a day
 * and requests are deduplicated by coordinate + radius so that navigating back
 * to the screen does not hammer them.
 */
const CACHE_TTL = 24 * 60 * 60 * 1000;

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface MosqueState {
  mosques: Mosque[];
  status: Status;
  error: string | null;
  lastKey: string | null;
  search: (coords: Coords, radiusMeters: number, force?: boolean) => Promise<void>;
  clear: () => void;
}

const keyOf = (coords: Coords, radius: number): string =>
  `${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}/${radius}`;

export const useMosqueStore = create<MosqueState>((set, get) => ({
  mosques: [],
  status: 'idle',
  error: null,
  lastKey: null,

  search: async (coords, radiusMeters, force = false) => {
    const key = keyOf(coords, radiusMeters);
    if (!force && get().lastKey === key && get().status === 'ready') return;

    set({ status: 'loading', error: null });

    const storageKey = StorageKeys.mosqueCache(
      coords.latitude,
      coords.longitude,
      radiusMeters
    );

    if (!force) {
      const cached = await readCache<Mosque[]>(storageKey, CACHE_TTL);
      if (cached) {
        set({ mosques: cached, status: 'ready', lastKey: key });
        return;
      }
    }

    try {
      const results = await fetchNearbyMosques(coords, radiusMeters);
      void writeCache(storageKey, results);
      set({ mosques: results, status: 'ready', error: null, lastKey: key });
    } catch (error) {
      set({ status: 'error', error: describeError(error), mosques: [] });
    }
  },

  clear: () => set({ mosques: [], status: 'idle', error: null, lastKey: null }),
}));

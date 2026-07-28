import { create } from 'zustand';
import * as Location from 'expo-location';
import { readJSON, writeJSON, StorageKeys } from '@/utils/storage';
import type { Coords } from '@/utils/geo';

export type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable';

export interface StoredPlace extends Coords {
  label: string;
  /** True when the user picked the place instead of the GPS providing it. */
  manual: boolean;
}

interface LocationState {
  coords: Coords | null;
  label: string;
  status: LocationStatus;
  error: string | null;
  manual: boolean;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  requestLocation: () => Promise<void>;
  setManualLocation: (place: StoredPlace) => void;
  clearError: () => void;
}

async function reverseGeocodeLabel(coords: Coords): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync(coords);
    const place = results[0];
    if (!place) return 'Current location';
    const city = place.city ?? place.subregion ?? place.region;
    const country = place.country;
    if (city && country) return `${city}, ${country}`;
    return city ?? country ?? 'Current location';
  } catch {
    // Reverse geocoding is a nicety; never let it break the location flow.
    return 'Current location';
  }
}

export const useLocationStore = create<LocationState>((set, get) => ({
  coords: null,
  label: '',
  status: 'idle',
  error: null,
  manual: false,
  hydrated: false,

  hydrate: async () => {
    const stored = await readJSON<StoredPlace | null>(StorageKeys.location, null);
    if (stored && Number.isFinite(stored.latitude) && Number.isFinite(stored.longitude)) {
      set({
        coords: { latitude: stored.latitude, longitude: stored.longitude },
        label: stored.label,
        manual: stored.manual,
        // A cached coordinate is enough to render, but it is not a permission
        // grant — leave status idle so the app still asks.
        hydrated: true,
      });
    } else {
      set({ hydrated: true });
    }
  },

  requestLocation: async () => {
    set({ status: 'requesting', error: null });

    try {
      const services = await Location.hasServicesEnabledAsync();
      if (!services) {
        set({
          status: 'unavailable',
          error:
            'Location services are turned off on this device. Enable them, or set your city manually.',
        });
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        set({
          status: 'denied',
          error:
            'Location permission was declined. You can set your city manually instead.',
        });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: Coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const label = await reverseGeocodeLabel(coords);

      set({ coords, label, status: 'granted', manual: false, error: null });
      void writeJSON(StorageKeys.location, { ...coords, label, manual: false });
    } catch (error) {
      // A GPS fix can fail indoors even with permission granted. If we have a
      // cached coordinate we stay usable and only surface a soft warning.
      const hasFallback = get().coords !== null;
      set({
        status: hasFallback ? 'granted' : 'unavailable',
        error: hasFallback
          ? null
          : error instanceof Error
            ? `Could not get a location fix: ${error.message}`
            : 'Could not get a location fix.',
      });
    }
  },

  setManualLocation: (place) => {
    set({
      coords: { latitude: place.latitude, longitude: place.longitude },
      label: place.label,
      manual: true,
      status: 'granted',
      error: null,
    });
    void writeJSON(StorageKeys.location, { ...place, manual: true });
  },

  clearError: () => set({ error: null }),
}));

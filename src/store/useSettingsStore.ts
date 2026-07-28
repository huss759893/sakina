import { create } from 'zustand';
import { readJSON, writeJSON, StorageKeys } from '@/utils/storage';
import { DEFAULT_METHOD_ID, type MadhabSchool } from '@/data/methods';
import { DEFAULT_RECITER, DEFAULT_TRANSLATION } from '@/data/methods';
import type { NisabStandard } from '@/utils/zakat';

export interface Settings {
  methodId: number;
  school: MadhabSchool;
  use24Hour: boolean;
  translationEdition: string;
  reciter: string;
  /** Multiplier applied to the Arabic type scale in the reader. */
  arabicScale: number;
  showTranslation: boolean;
  showTransliteration: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  /** Minutes before the adhan to fire the reminder. 0 = at the time. */
  notificationLeadMinutes: number;
  searchRadiusMeters: number;
  currencySymbol: string;
  nisabStandard: NisabStandard;
}

const DEFAULTS: Settings = {
  methodId: DEFAULT_METHOD_ID,
  school: 0,
  use24Hour: false,
  translationEdition: DEFAULT_TRANSLATION,
  reciter: DEFAULT_RECITER,
  arabicScale: 1,
  showTranslation: true,
  showTransliteration: false,
  hapticsEnabled: true,
  notificationsEnabled: false,
  notificationLeadMinutes: 0,
  searchRadiusMeters: 5000,
  currencySymbol: '$',
  nisabStandard: 'silver',
};

interface SettingsState extends Settings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    const stored = await readJSON<Partial<Settings>>(StorageKeys.settings, {});
    // Spread over defaults so a settings file written by an older build, or a
    // partially corrupt one, still produces a complete valid object.
    set({ ...DEFAULTS, ...stored, hydrated: true });
  },

  update: (patch) => {
    set(patch);
    const { hydrated: _hydrated, hydrate: _h, update: _u, reset: _r, ...rest } = get();
    void writeJSON(StorageKeys.settings, rest);
  },

  reset: () => {
    set({ ...DEFAULTS });
    void writeJSON(StorageKeys.settings, DEFAULTS);
  },
}));

/** Stable selector for the subset the prayer fetcher depends on. */
export function selectCalcParams(state: SettingsState): {
  methodId: number;
  school: MadhabSchool;
} {
  return { methodId: state.methodId, school: state.school };
}

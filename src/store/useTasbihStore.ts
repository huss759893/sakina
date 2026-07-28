import { create } from 'zustand';
import { readJSON, writeJSON, StorageKeys } from '@/utils/storage';
import { DEFAULT_DHIKR_ID } from '@/data/dhikr';

interface TasbihPersisted {
  activeId: string;
  /** Current in-progress count per dhikr. */
  counts: Record<string, number>;
  /** Lifetime total across all dhikr, never reset by the round button. */
  lifetime: number;
  /** Completed rounds per dhikr. */
  rounds: Record<string, number>;
}

const DEFAULTS: TasbihPersisted = {
  activeId: DEFAULT_DHIKR_ID,
  counts: {},
  lifetime: 0,
  rounds: {},
};

interface TasbihState extends TasbihPersisted {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setActive: (id: string) => void;
  /** Returns the new count so callers can react to hitting the target. */
  increment: (id: string) => number;
  decrement: (id: string) => void;
  resetCurrent: (id: string) => void;
  completeRound: (id: string) => void;
  resetAll: () => void;
}

function persist(state: TasbihPersisted): void {
  void writeJSON(StorageKeys.tasbih, state);
}

export const useTasbihStore = create<TasbihState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    const stored = await readJSON<Partial<TasbihPersisted>>(StorageKeys.tasbih, {});
    set({
      activeId: stored.activeId ?? DEFAULTS.activeId,
      counts: stored.counts ?? {},
      lifetime: typeof stored.lifetime === 'number' ? stored.lifetime : 0,
      rounds: stored.rounds ?? {},
      hydrated: true,
    });
  },

  setActive: (id) => {
    set({ activeId: id });
    const { counts, lifetime, rounds } = get();
    persist({ activeId: id, counts, lifetime, rounds });
  },

  increment: (id) => {
    const state = get();
    const next = (state.counts[id] ?? 0) + 1;
    const counts = { ...state.counts, [id]: next };
    const lifetime = state.lifetime + 1;

    set({ counts, lifetime });
    persist({ activeId: state.activeId, counts, lifetime, rounds: state.rounds });
    return next;
  },

  decrement: (id) => {
    const state = get();
    const current = state.counts[id] ?? 0;
    if (current === 0) return;

    const counts = { ...state.counts, [id]: current - 1 };
    // Lifetime is a record of dhikr actually made; undoing a mis-tap should
    // walk it back too, but never below zero.
    const lifetime = Math.max(0, state.lifetime - 1);

    set({ counts, lifetime });
    persist({ activeId: state.activeId, counts, lifetime, rounds: state.rounds });
  },

  resetCurrent: (id) => {
    const state = get();
    const counts = { ...state.counts, [id]: 0 };
    set({ counts });
    persist({ activeId: state.activeId, counts, lifetime: state.lifetime, rounds: state.rounds });
  },

  completeRound: (id) => {
    const state = get();
    const counts = { ...state.counts, [id]: 0 };
    const rounds = { ...state.rounds, [id]: (state.rounds[id] ?? 0) + 1 };
    set({ counts, rounds });
    persist({ activeId: state.activeId, counts, lifetime: state.lifetime, rounds });
  },

  resetAll: () => {
    set({ ...DEFAULTS });
    persist(DEFAULTS);
  },
}));

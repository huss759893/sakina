import { create } from 'zustand';
import {
  fetchSurahList,
  fetchSurah,
  type SurahSummary,
  type SurahContent,
} from '@/api/alquran';
import { describeError } from '@/api/client';
import {
  readCache,
  writeCache,
  readStaleCache,
  readJSON,
  writeJSON,
  StorageKeys,
} from '@/utils/storage';

/** Qur'an text is immutable, so it is cached aggressively and served offline. */
const LIST_TTL = 90 * 24 * 60 * 60 * 1000;
const SURAH_TTL = 365 * 24 * 60 * 60 * 1000;

export interface Bookmark {
  surah: number;
  ayah: number;
  surahName: string;
  savedAt: number;
}

export interface ReadingProgress {
  surah: number;
  ayah: number;
  surahName: string;
  updatedAt: number;
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface QuranState {
  surahs: SurahSummary[];
  listStatus: Status;
  listError: string | null;

  /** Cache of loaded surah bodies, keyed `${surah}:${translationEdition}`. */
  contents: Record<string, SurahContent>;
  contentStatus: Record<string, Status>;
  contentError: Record<string, string | null>;

  bookmarks: Bookmark[];
  progress: ReadingProgress | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  loadList: (force?: boolean) => Promise<void>;
  loadSurah: (n: number, translationEdition: string, force?: boolean) => Promise<void>;
  toggleBookmark: (bookmark: Omit<Bookmark, 'savedAt'>) => void;
  isBookmarked: (surah: number, ayah: number) => boolean;
  setProgress: (progress: Omit<ReadingProgress, 'updatedAt'>) => void;
  clearBookmarks: () => void;
}

const contentKey = (n: number, edition: string): string => `${n}:${edition}`;

export const useQuranStore = create<QuranState>((set, get) => ({
  surahs: [],
  listStatus: 'idle',
  listError: null,
  contents: {},
  contentStatus: {},
  contentError: {},
  bookmarks: [],
  progress: null,
  hydrated: false,

  hydrate: async () => {
    const [bookmarks, progress] = await Promise.all([
      readJSON<Bookmark[]>(StorageKeys.quranBookmarks, []),
      readJSON<ReadingProgress | null>(StorageKeys.quranProgress, null),
    ]);
    set({
      bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
      progress,
      hydrated: true,
    });
  },

  loadList: async (force = false) => {
    if (!force && get().surahs.length === 114) return;
    set({ listStatus: 'loading', listError: null });

    const cached = await readCache<SurahSummary[]>(StorageKeys.surahListCache, LIST_TTL);
    if (cached && cached.length > 0 && !force) {
      set({ surahs: cached, listStatus: 'ready' });
      return;
    }

    try {
      const list = await fetchSurahList();
      void writeCache(StorageKeys.surahListCache, list);
      set({ surahs: list, listStatus: 'ready', listError: null });
    } catch (error) {
      const stale = await readStaleCache<SurahSummary[]>(StorageKeys.surahListCache);
      if (stale && stale.length > 0) {
        set({ surahs: stale, listStatus: 'ready', listError: null });
      } else {
        set({ listStatus: 'error', listError: describeError(error) });
      }
    }
  },

  loadSurah: async (n, translationEdition, force = false) => {
    const key = contentKey(n, translationEdition);
    const state = get();

    if (!force && state.contents[key]) return;
    if (state.contentStatus[key] === 'loading') return;

    set({
      contentStatus: { ...state.contentStatus, [key]: 'loading' },
      contentError: { ...state.contentError, [key]: null },
    });

    const storageKey = StorageKeys.surahCache(n, translationEdition);
    const cached = await readCache<SurahContent>(storageKey, SURAH_TTL);

    if (cached && !force) {
      set((s) => ({
        contents: { ...s.contents, [key]: cached },
        contentStatus: { ...s.contentStatus, [key]: 'ready' },
      }));
      return;
    }

    try {
      const content = await fetchSurah(n, translationEdition);
      void writeCache(storageKey, content);
      set((s) => ({
        contents: { ...s.contents, [key]: content },
        contentStatus: { ...s.contentStatus, [key]: 'ready' },
        contentError: { ...s.contentError, [key]: null },
      }));
    } catch (error) {
      const stale = await readStaleCache<SurahContent>(storageKey);
      if (stale) {
        set((s) => ({
          contents: { ...s.contents, [key]: stale },
          contentStatus: { ...s.contentStatus, [key]: 'ready' },
        }));
      } else {
        set((s) => ({
          contentStatus: { ...s.contentStatus, [key]: 'error' },
          contentError: { ...s.contentError, [key]: describeError(error) },
        }));
      }
    }
  },

  toggleBookmark: (bookmark) => {
    const { bookmarks } = get();
    const exists = bookmarks.some(
      (b) => b.surah === bookmark.surah && b.ayah === bookmark.ayah
    );

    const next = exists
      ? bookmarks.filter(
          (b) => !(b.surah === bookmark.surah && b.ayah === bookmark.ayah)
        )
      : [{ ...bookmark, savedAt: Date.now() }, ...bookmarks];

    set({ bookmarks: next });
    void writeJSON(StorageKeys.quranBookmarks, next);
  },

  isBookmarked: (surah, ayah) =>
    get().bookmarks.some((b) => b.surah === surah && b.ayah === ayah),

  setProgress: (progress) => {
    const next: ReadingProgress = { ...progress, updatedAt: Date.now() };
    set({ progress: next });
    void writeJSON(StorageKeys.quranProgress, next);
  },

  clearBookmarks: () => {
    set({ bookmarks: [] });
    void writeJSON(StorageKeys.quranBookmarks, []);
  },
}));

/**
 * Key under which a surah body is cached. Screens select `contents[key]`
 * directly so they subscribe to just that slice rather than the whole store.
 */
export const surahCacheKey = contentKey;

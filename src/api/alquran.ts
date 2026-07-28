import { requestJSON, USER_AGENT } from './client';

/**
 * Qur'an text and audio from api.alquran.cloud — the Uthmani script is public
 * domain and the recitations are distributed free of charge from
 * cdn.islamic.network. No key, no quota, no attribution obligation beyond
 * courtesy.
 */

const BASE = 'https://api.alquran.cloud/v1';
const AUDIO_CDN = 'https://cdn.islamic.network/quran';

export const UTHMANI_EDITION = 'quran-uthmani';

export interface SurahSummary {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  sajda: boolean | { recommended: boolean; obligatory: boolean };
}

interface SurahEdition extends SurahSummary {
  ayahs: Ayah[];
  edition: { identifier: string; language: string; name: string };
}

interface Envelope<T> {
  code: number;
  status: string;
  data: T;
}

function unwrap<T>(envelope: Envelope<T>): T {
  if (envelope.code !== 200 || !envelope.data) {
    throw new Error(envelope.status || 'AlQuran Cloud returned an error');
  }
  return envelope.data;
}

export async function fetchSurahList(
  signal?: AbortSignal
): Promise<SurahSummary[]> {
  const json = await requestJSON<Envelope<SurahSummary[]>>(`${BASE}/surah`, {
    headers: { 'User-Agent': USER_AGENT },
    signal,
    timeoutMs: 20000,
  });
  const data = unwrap(json);
  if (!Array.isArray(data)) throw new Error('Unexpected surah list shape');
  return data;
}

export interface SurahContent {
  surah: SurahSummary;
  /** Arabic and translation zipped by ayah number. */
  verses: {
    numberInSurah: number;
    globalNumber: number;
    arabic: string;
    translation: string;
    juz: number;
    page: number;
    sajda: boolean;
  }[];
}

const isSajda = (value: Ayah['sajda']): boolean =>
  typeof value === 'boolean' ? value : Boolean(value?.obligatory || value?.recommended);

/**
 * Fetches Arabic and translation in a single request. The multi-edition
 * endpoint keeps the two arrays index-aligned, but we zip defensively by
 * `numberInSurah` in case an edition ever ships a gap.
 */
export async function fetchSurah(
  surahNumber: number,
  translationEdition: string,
  signal?: AbortSignal
): Promise<SurahContent> {
  const editions = `${UTHMANI_EDITION},${translationEdition}`;
  const json = await requestJSON<Envelope<SurahEdition[]>>(
    `${BASE}/surah/${surahNumber}/editions/${editions}`,
    { headers: { 'User-Agent': USER_AGENT }, signal, timeoutMs: 25000 }
  );

  const data = unwrap(json);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Unexpected surah shape');
  }

  const arabicEdition =
    data.find((d) => d.edition?.identifier === UTHMANI_EDITION) ?? data[0]!;
  const translationEd =
    data.find((d) => d.edition?.identifier === translationEdition) ?? data[1];

  const translationByAyah = new Map<number, string>();
  for (const ayah of translationEd?.ayahs ?? []) {
    translationByAyah.set(ayah.numberInSurah, ayah.text);
  }

  return {
    surah: {
      number: arabicEdition.number,
      name: arabicEdition.name,
      englishName: arabicEdition.englishName,
      englishNameTranslation: arabicEdition.englishNameTranslation,
      numberOfAyahs: arabicEdition.numberOfAyahs,
      revelationType: arabicEdition.revelationType,
    },
    verses: (arabicEdition.ayahs ?? []).map((ayah) => ({
      numberInSurah: ayah.numberInSurah,
      globalNumber: ayah.number,
      arabic: ayah.text,
      translation: translationByAyah.get(ayah.numberInSurah) ?? '',
      juz: ayah.juz,
      page: ayah.page,
      sajda: isSajda(ayah.sajda),
    })),
  };
}

/** Whole-surah recitation. One stream beats 286 chained ayah requests. */
export function surahAudioUrl(surahNumber: number, reciter: string): string {
  return `${AUDIO_CDN}/audio-surah/128/${reciter}/${surahNumber}.mp3`;
}

/** Single-ayah audio, keyed by the global ayah number (1..6236). */
export function ayahAudioUrl(globalAyahNumber: number, reciter: string): string {
  return `${AUDIO_CDN}/audio/128/${reciter}/${globalAyahNumber}.mp3`;
}

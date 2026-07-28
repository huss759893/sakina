/** Display formatting helpers. */

/** Parses free-text numeric input, tolerating commas, spaces and stray signs. */
export function parseNumber(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  const normalized =
    parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

export function formatCurrency(value: number, symbol: string): string {
  if (!Number.isFinite(value)) return `${symbol}0`;
  const rounded = Math.round(value * 100) / 100;
  const hasCents = Math.abs(rounded % 1) > 0.0001;
  return `${symbol}${rounded.toLocaleString(undefined, {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Arabic-Indic numerals, for ayah markers inside the Arabic text flow. */
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicNumerals(value: number): string {
  return String(Math.trunc(Math.abs(value)))
    .split('')
    .map((d) => ARABIC_DIGITS[Number(d)] ?? d)
    .join('');
}

/** "1" -> "001", for surah numbering in lists. */
export function padNumber(value: number, width = 3): string {
  return String(value).padStart(width, '0');
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The Basmala is prefixed to every surah in the Uthmani text except Al-Fatiha
 * (where it is ayah 1) and At-Tawba (where it is absent). For surahs 2-113 it
 * is duplicated at the head of ayah 1, so we strip it and render it separately.
 */
export const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/**
 * Harakat, quranic annotation marks, and tatweel — everything that decorates a
 * letter without changing which letter it is.
 */
const MARKS = /[ً-ٰٟۖ-ۭـ﻿]/;

/**
 * Reduces a character to its bare consonantal identity, or '' if it carries no
 * identity of its own.
 *
 * Matching the Basmala by string equality does not work against real mushaf
 * text: the Uthmani edition writes shadda before fatha (َّ) where
 * most keyboards produce the reverse, so two visually identical strings
 * compare unequal. Comparing skeletons sidesteps ordering entirely.
 */
function skeletonChar(ch: string): string {
  if (MARKS.test(ch)) return '';
  if (ch === ' ' || ch === ' ') return '';
  // Alef wasla and the hamza-bearing alefs all reduce to plain alef.
  if (ch === 'ٱ' || ch === 'آ' || ch === 'أ' || ch === 'إ') {
    return 'ا';
  }
  return ch;
}

function skeleton(text: string): string {
  let out = '';
  for (const ch of text) out += skeletonChar(ch);
  return out;
}

const BASMALA_SKELETON = skeleton(BASMALA);

export function stripBasmala(text: string, surahNumber: number): string {
  // In Al-Fatiha the Basmala *is* ayah 1, and At-Tawba has none to begin with.
  if (surahNumber === 1 || surahNumber === 9) return text;

  const normalized = text.replace(/^﻿/, '');

  // Walk the original alongside its skeleton so that, once the skeleton
  // matches, we know exactly where to cut the original — diacritics included.
  let built = '';
  let cutIndex = -1;

  for (let i = 0; i < normalized.length; i++) {
    built += skeletonChar(normalized[i]!);
    if (built.length >= BASMALA_SKELETON.length) {
      cutIndex = i + 1;
      break;
    }
  }

  if (cutIndex === -1 || built !== BASMALA_SKELETON) return normalized;

  // The loop stops on the last *letter* of the Basmala, so any diacritics
  // hanging off it are still ahead of the cut. Absorb them.
  while (cutIndex < normalized.length && MARKS.test(normalized[cutIndex]!)) {
    cutIndex++;
  }

  const remainder = normalized.slice(cutIndex).trimStart();
  // A surah whose first ayah is only the Basmala must not be blanked out.
  return remainder.length > 0 ? remainder : normalized;
}

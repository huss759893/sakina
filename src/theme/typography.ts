import { Platform, TextStyle } from 'react-native';

/**
 * Plus Jakarta Sans for UI (geometric humanist — modern without the Inter
 * ubiquity), Amiri for Arabic (a proper naskh; the Quran deserves better than
 * a system fallback). Both SIL Open Font License.
 *
 * Every family here is resolved through `fontFamily()` so that if font loading
 * fails we degrade to the platform default instead of rendering nothing.
 */

export const fontFamilies = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
} as const;

export type FontKey = keyof typeof fontFamilies;

/** Flipped to true by App.tsx once useFonts resolves. */
let fontsReady = false;

export function setFontsReady(ready: boolean): void {
  fontsReady = ready;
}

const systemFallbackWeight: Record<FontKey, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  arabic: '400',
  arabicBold: '700',
};

/**
 * Returns a style fragment rather than a bare string: when the custom font is
 * unavailable we still need to communicate weight, which a missing fontFamily
 * would otherwise drop.
 */
export function font(key: FontKey): TextStyle {
  if (fontsReady) {
    return { fontFamily: fontFamilies[key] };
  }
  return {
    fontWeight: systemFallbackWeight[key],
    ...Platform.select({
      ios: { fontFamily: key.startsWith('arabic') ? 'Geeza Pro' : 'System' },
      android: { fontFamily: key.startsWith('arabic') ? 'sans-serif' : 'sans-serif' },
      default: {},
    }),
  };
}

export const type = {
  /** The countdown. Big, tight, unmissable. */
  display: {
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -2,
  },
  h1: { fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  h2: { fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  h3: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodySm: { fontSize: 14, lineHeight: 21, letterSpacing: 0 },
  /** Eyebrow labels — uppercase, tracked out. */
  label: { fontSize: 11, lineHeight: 14, letterSpacing: 1.4 },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  /** Tabular-ish numerals for time columns. */
  numeric: { fontSize: 17, lineHeight: 22, letterSpacing: 0.4 },
} as const;

/** Arabic needs far more leading than Latin at the same optical size. */
export const arabicType = {
  ayah: { fontSize: 30, lineHeight: 62 },
  ayahLarge: { fontSize: 36, lineHeight: 74 },
  ayahSmall: { fontSize: 25, lineHeight: 52 },
  dua: { fontSize: 26, lineHeight: 54 },
  inline: { fontSize: 20, lineHeight: 40 },
} as const;

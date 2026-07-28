/**
 * Sakina palette — dark-first.
 *
 * A prayer app is opened at Fajr and at Isha, in the dark, often in bed or in a
 * quiet room. A light UI is the wrong instrument for that. Everything here is
 * built on deep ink with a *warm* off-white for text (never #FFF, which reads
 * clinical against a blue-black) and two accents: brushed gold for the sacred
 * register, jade for progress and confirmation.
 */

export const palette = {
  // Base surfaces, darkest to lightest
  ink: '#060912',
  inkSoft: '#0B1122',
  surface: '#101A2E',
  surfaceRaised: '#16233C',
  surfaceHigh: '#1E2C48',

  // Hairlines — warm-tinted so they don't read as pure grey holes
  hairline: 'rgba(233,226,213,0.10)',
  hairlineStrong: 'rgba(233,226,213,0.18)',
  hairlineFaint: 'rgba(233,226,213,0.06)',

  // Accents
  gold: '#E8C48A',
  goldBright: '#F5DCAE',
  goldDeep: '#B98F4F',
  goldGlow: 'rgba(232,196,138,0.16)',

  jade: '#3FD6A8',
  jadeDeep: '#17997A',
  jadeGlow: 'rgba(63,214,168,0.14)',

  rose: '#FF7A85',
  roseGlow: 'rgba(255,122,133,0.14)',
  amber: '#FFB86B',

  // Type — warm off-white against cool dark is the whole trick
  text: '#F2ECE1',
  textSoft: '#B9C0D4',
  textMuted: '#7C8AA6',
  textFaint: '#4E5A72',

  // Fixed
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(6,9,18,0.72)',
} as const;

/**
 * The signature element: the sky behind the home dashboard shifts with the
 * prayer cycle. Each phase is a three-stop vertical gradient sampled from what
 * the sky actually does at that hour — pre-dawn indigo bleeding to blush at
 * Fajr, hard blue at Dhuhr, brass at Asr, ember at Maghrib, near-black at Isha.
 */
export type PrayerPhase =
  | 'fajr'
  | 'sunrise'
  | 'dhuhr'
  | 'asr'
  | 'maghrib'
  | 'isha';

export const phaseGradients: Record<PrayerPhase, readonly [string, string, string]> = {
  fajr: ['#131A3A', '#3A2E63', '#8E5A72'],
  sunrise: ['#1D2A55', '#5C5090', '#D99A6C'],
  dhuhr: ['#0E2A50', '#1E5E92', '#5AA9CE'],
  asr: ['#1A2B47', '#6B5535', '#C89152'],
  maghrib: ['#2C1740', '#7A3454', '#D4694A'],
  isha: ['#05080F', '#0E1730', '#233054'],
};

/** Accent colour that reads correctly on top of each phase gradient. */
export const phaseAccent: Record<PrayerPhase, string> = {
  fajr: '#F0B9C4',
  sunrise: '#FFD3A8',
  dhuhr: '#B9E4F5',
  asr: '#F3CE95',
  maghrib: '#FFC0A2',
  isha: '#E8C48A',
};

export const phaseLabel: Record<PrayerPhase, string> = {
  fajr: 'Dawn',
  sunrise: 'Morning',
  dhuhr: 'Midday',
  asr: 'Afternoon',
  maghrib: 'Dusk',
  isha: 'Night',
};

/** Gradient used for the app-wide background outside the dashboard hero. */
export const baseGradient = ['#060912', '#0B1122', '#0E1526'] as const;

/**
 * Runtime verification of the pure logic. Bundling proves the app compiles;
 * this proves the maths is right.
 */
import {
  qiblaBearing,
  distanceToKaabaKm,
  haversineKm,
  compassPoint,
  angleDelta,
  normalizeDegrees,
  polarToXY,
  formatDistance,
} from '@/utils/geo';
import {
  buildTimeline,
  resolveNextPrayer,
  resolvePhase,
  formatCountdown,
  formatClock,
  parseTimeToDate,
  toApiDate,
  addDays,
  deviceTimeZone,
  zonedWallTimeToDate,
} from '@/utils/time';
import {
  calculateZakat,
  EMPTY_ZAKAT_INPUT,
} from '@/utils/zakat';
import {
  parseNumber,
  toArabicNumerals,
  stripBasmala,
  formatCurrency,
} from '@/utils/format';
import {
  SURAH_NAMES,
  canonicalSurahName,
  foldTransliteration,
} from '@/data/surahNames';

let pass = 0;
let fail = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  const ok = Object.is(actual, expected) || actual === expected;
  if (ok) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}\n         expected: ${String(expected)}\n         actual:   ${String(actual)}`);
  }
}

function near(name: string, actual: number, expected: number, tol: number): void {
  const ok = Math.abs(actual - expected) <= tol;
  if (ok) {
    pass++;
    console.log(`  ok   ${name}  (${actual.toFixed(2)} ≈ ${expected})`);
  } else {
    fail++;
    console.log(`  FAIL ${name}\n         expected: ${expected} ±${tol}\n         actual:   ${actual}`);
  }
}

console.log('\n── Qibla bearings (vs. published values) ──────────────────');
// Reference values from published Qibla tables for each city.
near('London → Qibla', qiblaBearing({ latitude: 51.5074, longitude: -0.1278 }), 118.99, 0.5);
near('New York → Qibla', qiblaBearing({ latitude: 40.7128, longitude: -74.006 }), 58.48, 0.7);
near('Jakarta → Qibla', qiblaBearing({ latitude: -6.2088, longitude: 106.8456 }), 295.15, 0.7);
near('Sydney → Qibla', qiblaBearing({ latitude: -33.8688, longitude: 151.2093 }), 277.5, 1.0);
near('Cape Town → Qibla', qiblaBearing({ latitude: -33.9249, longitude: 18.4241 }), 22.6, 1.0);
near('Tokyo → Qibla', qiblaBearing({ latitude: 35.6762, longitude: 139.6503 }), 293.0, 1.0);

console.log('\n── Distances ─────────────────────────────────────────────');
near('London → Kaaba km', distanceToKaabaKm({ latitude: 51.5074, longitude: -0.1278 }), 4787, 15);
near('Haversine London→Paris', haversineKm({ latitude: 51.5074, longitude: -0.1278 }, { latitude: 48.8566, longitude: 2.3522 }), 343, 3);
check('Zero distance', Math.round(haversineKm({ latitude: 10, longitude: 20 }, { latitude: 10, longitude: 20 })), 0);

console.log('\n── Angle helpers ─────────────────────────────────────────');
check('normalizeDegrees(-30)', normalizeDegrees(-30), 330);
check('normalizeDegrees(400)', normalizeDegrees(400), 40);
check('angleDelta 350→10 (short way)', angleDelta(350, 10), 20);
check('angleDelta 10→350 (short way)', angleDelta(10, 350), -20);
check('compassPoint(0)', compassPoint(0), 'N');
check('compassPoint(119)', compassPoint(119), 'ESE');
check('compassPoint(315)', compassPoint(315), 'NW');
const xy = polarToXY(0, 5, 10, 100); // due north, half the max range
check('polarToXY north x≈0', Math.round(xy.x), 0);
check('polarToXY north y=-50 (screen up)', Math.round(xy.y), -50);
check('formatDistance 0.4km', formatDistance(0.4), '400 m');
check('formatDistance 3.25km', formatDistance(3.25), '3.3 km');

console.log('\n── Prayer timeline ───────────────────────────────────────');
const day = new Date(2026, 6, 27); // 27 July 2026, local
const timings = {
  Fajr: '03:12',
  Sunrise: '05:17',
  Dhuhr: '13:07',
  Asr: '17:20',
  Maghrib: '20:57',
  Isha: '23:02',
};
const timeline = buildTimeline(timings, day);
check('timeline length', timeline.length, 6);
check('timeline is ordered', timeline.map((e) => e.key).join(','), 'Fajr,Sunrise,Dhuhr,Asr,Maghrib,Isha');
check('Sunrise flagged not-fard', timeline.find((e) => e.key === 'Sunrise')!.isFard, false);
check('Fajr flagged fard', timeline.find((e) => e.key === 'Fajr')!.isFard, true);

check('parse "03:12 (BST)" hour', parseTimeToDate('03:12 (BST)', day)!.getHours(), 3);
check('parse garbage returns null', parseTimeToDate('not a time', day), null);
check('parse "25:00" rejected', parseTimeToDate('25:00', day), null);

const tomorrowTimeline = buildTimeline(timings, addDays(day, 1));

// Midday: next should be Asr.
const midday = new Date(2026, 6, 27, 14, 0, 0);
const atMidday = resolveNextPrayer(timeline, tomorrowTimeline, midday)!;
check('14:00 → next is Asr', atMidday.next.key, 'Asr');
check('14:00 → current is Dhuhr', atMidday.current!.key, 'Dhuhr');
check('14:00 → not tomorrow', atMidday.isTomorrow, false);
near('14:00 → progress through Dhuhr window', atMidday.progress, 53 / 253, 0.02);

// Sunrise must be skipped as a "next prayer" candidate.
const afterFajr = new Date(2026, 6, 27, 4, 0, 0);
check('04:00 → next skips Sunrise, is Dhuhr', resolveNextPrayer(timeline, tomorrowTimeline, afterFajr)!.next.key, 'Dhuhr');

// Post-Isha rollover — the case that produces a negative countdown if wrong.
const afterIsha = new Date(2026, 6, 27, 23, 40, 0);
const rolled = resolveNextPrayer(timeline, tomorrowTimeline, afterIsha)!;
check('23:40 → next is Fajr', rolled.next.key, 'Fajr');
check('23:40 → flagged tomorrow', rolled.isTomorrow, true);
check('23:40 → countdown is positive', rolled.msRemaining > 0, true);
near('23:40 → ~3h32m remaining', rolled.msRemaining / 60000, 3 * 60 + 32, 1);

// Before Fajr — still inside the previous night.
const preDawn = new Date(2026, 6, 27, 2, 0, 0);
const beforeFajr = resolveNextPrayer(timeline, tomorrowTimeline, preDawn)!;
check('02:00 → next is Fajr', beforeFajr.next.key, 'Fajr');
check('02:00 → not tomorrow', beforeFajr.isTomorrow, false);
check('02:00 → countdown positive', beforeFajr.msRemaining > 0, true);

console.log('\n── Cross-timezone timings (manual city picker) ───────────');
// The device runs in one zone; the user picks a city in another. Aladhan
// returns that city's wall-clock times, so the instants must be built in the
// city's zone or the countdown is wrong by the whole offset.
const deviceZone = deviceTimeZone();
check('device timezone resolves', deviceZone.length > 0, true);

// 04:01 in Istanbul on 27 Jul 2026 (UTC+3) is 01:01 UTC.
const istanbulFajr = zonedWallTimeToDate(2026, 7, 27, 4, 1, 'Europe/Istanbul');
check('Istanbul 04:01 → 01:01 UTC', istanbulFajr?.toISOString(), '2026-07-27T01:01:00.000Z');

// 03:12 in London on 27 Jul 2026 (BST, UTC+1) is 02:12 UTC.
const londonFajr = zonedWallTimeToDate(2026, 7, 27, 3, 12, 'Europe/London');
check('London 03:12 BST → 02:12 UTC', londonFajr?.toISOString(), '2026-07-27T02:12:00.000Z');

// Winter, so GMT rather than BST — proves DST is handled, not hardcoded.
const londonWinter = zonedWallTimeToDate(2026, 1, 15, 6, 0, 'Europe/London');
check('London 06:00 GMT → 06:00 UTC', londonWinter?.toISOString(), '2026-01-15T06:00:00.000Z');

// A zone with a half-hour offset.
const kolkata = zonedWallTimeToDate(2026, 7, 27, 5, 30, 'Asia/Kolkata');
check('Kolkata 05:30 IST → 00:00 UTC', kolkata?.toISOString(), '2026-07-27T00:00:00.000Z');

// An unknown zone must degrade rather than throw.
check('bogus timezone returns null', zonedWallTimeToDate(2026, 7, 27, 4, 0, 'Not/AZone'), null);

// Timeline built in a remote zone yields different instants than a local build.
const istanbulTimings = { Fajr: '04:01', Sunrise: '05:50', Dhuhr: '13:15', Asr: '17:10', Maghrib: '20:32', Isha: '22:12' };
const zoned = buildTimeline(istanbulTimings, new Date(2026, 6, 27), 'Europe/Istanbul');
check('zoned timeline built', zoned.length, 6);
check('zoned Fajr is the correct instant', zoned[0]!.date.toISOString(), '2026-07-27T01:01:00.000Z');
check('zoned timeline still ordered', zoned.map((e) => e.key).join(','), 'Fajr,Sunrise,Dhuhr,Asr,Maghrib,Isha');

// The clock face must show the *city's* wall time, not the device's.
check('clock renders in the city zone (24h)', formatClock(zoned[0]!.date, true, 'Europe/Istanbul'), '04:01');
check('clock renders in the city zone (12h)', formatClock(zoned[0]!.date, false, 'Europe/Istanbul'), '4:01 AM');
check('same instant reads differently in UTC', formatClock(zoned[0]!.date, true, 'UTC'), '01:01');

// No zone, or the device's own zone, must take the original local path.
const localBuilt = buildTimeline(timings, day, null);
check('null timezone → local construction', localBuilt[0]!.date.getHours(), 3);
const sameZone = buildTimeline(timings, day, deviceZone);
check('device timezone → same as local', sameZone[0]!.date.getTime(), localBuilt[0]!.date.getTime());

console.log('\n── Phase (sky gradient selection) ────────────────────────');
check('02:00 → isha', resolvePhase(timeline, new Date(2026, 6, 27, 2, 0)), 'isha');
check('04:00 → fajr', resolvePhase(timeline, new Date(2026, 6, 27, 4, 0)), 'fajr');
check('09:00 → sunrise', resolvePhase(timeline, new Date(2026, 6, 27, 9, 0)), 'sunrise');
check('14:00 → dhuhr', resolvePhase(timeline, new Date(2026, 6, 27, 14, 0)), 'dhuhr');
check('19:00 → asr', resolvePhase(timeline, new Date(2026, 6, 27, 19, 0)), 'asr');
check('21:30 → maghrib', resolvePhase(timeline, new Date(2026, 6, 27, 21, 30)), 'maghrib');
check('23:30 → isha', resolvePhase(timeline, new Date(2026, 6, 27, 23, 30)), 'isha');

console.log('\n── Formatting ────────────────────────────────────────────');
check('countdown 2h4m19s', formatCountdown((2 * 3600 + 4 * 60 + 19) * 1000), '2:04:19');
check('countdown 4m9s', formatCountdown((4 * 60 + 9) * 1000), '04:09');
check('countdown zero', formatCountdown(0), '00:00');
check('clock 12h evening', formatClock(new Date(2026, 6, 27, 20, 57), false), '8:57 PM');
check('clock 24h evening', formatClock(new Date(2026, 6, 27, 20, 57), true), '20:57');
check('clock 12h midnight', formatClock(new Date(2026, 6, 27, 0, 5), false), '12:05 AM');
check('clock 12h noon', formatClock(new Date(2026, 6, 27, 12, 0), false), '12:00 PM');
check('toApiDate DD-MM-YYYY', toApiDate(new Date(2026, 6, 5)), '05-07-2026');
check('parseNumber "1,250.50"', parseNumber('1,250.50'), 1250.5);
check('parseNumber "abc"', parseNumber('abc'), 0);
check('parseNumber "12.3.4" salvages', parseNumber('12.3.4'), 12.34);
check('toArabicNumerals(255)', toArabicNumerals(255), '٢٥٥');
check('formatCurrency whole', formatCurrency(1250, '$'), '$1,250');
check('formatCurrency cents', formatCurrency(1250.5, '$'), '$1,250.50');

console.log('\n── Basmala stripping ─────────────────────────────────────');
// Keyboard ordering: fatha before shadda.
const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
// Mushaf ordering: shadda before fatha. Visually identical, different bytes —
// this is the exact codepoint sequence api.alquran.cloud serves for 2:1.
// Built from codepoints because source-file literals get normalized by tooling.
const BASMALA_MUSHAF = String.fromCodePoint(
  0x0628, 0x0650, 0x0633, 0x0652, 0x0645, 0x0650, 0x0020,
  0x0671, 0x0644, 0x0644, 0x0651, 0x064e, 0x0647, 0x0650, 0x0020,
  0x0671, 0x0644, 0x0631, 0x0651, 0x064e, 0x062d, 0x0652, 0x0645, 0x064e, 0x0670, 0x0646, 0x0650, 0x0020,
  0x0671, 0x0644, 0x0631, 0x0651, 0x064e, 0x062d, 0x0650, 0x064a, 0x0645, 0x0650
);
check('the two orderings really do differ in bytes', BASMALA === BASMALA_MUSHAF, false);
check('surah 2 strips basmala (keyboard order)', stripBasmala(`${BASMALA} الٓمٓ`, 2), 'الٓمٓ');
check('surah 2 strips basmala (mushaf order)', stripBasmala(`${BASMALA_MUSHAF} الٓمٓ`, 2), 'الٓمٓ');
check('leading BOM tolerated', stripBasmala(`﻿${BASMALA_MUSHAF} الٓمٓ`, 2), 'الٓمٓ');
check('surah 1 keeps basmala (it is ayah 1)', stripBasmala(BASMALA, 1), BASMALA);
check('surah 9 untouched (has none)', stripBasmala('بَرَآءَةٌ', 9), 'بَرَآءَةٌ');
check('non-basmala opening untouched', stripBasmala('الٓمٓ', 2), 'الٓمٓ');
check('basmala-only ayah not blanked', stripBasmala(BASMALA_MUSHAF, 2), BASMALA_MUSHAF);

console.log('\n── Surah names ───────────────────────────────────────────');
check('all 114 surahs named', Object.keys(SURAH_NAMES).length, 114);
check(
  'every number 1-114 present',
  Array.from({ length: 114 }, (_, i) => SURAH_NAMES[i + 1]).every(
    (n) => typeof n === 'string' && n.length > 0
  ),
  true
);
check('surah 30 is Ar-Rūm, not Ar-Room', SURAH_NAMES[30], 'Ar-Rūm');
check('canonical name overrides API spelling', canonicalSurahName(30, 'Ar-Room'), 'Ar-Rūm');
check('unknown number falls back to API name', canonicalSurahName(999, 'Whatever'), 'Whatever');
check('fold matches plain typing', foldTransliteration('Ar-Rūm'), 'arrum');
check('fold handles ayn + macrons', foldTransliteration('Āl ʿImrān'), 'al imran');
check('fold strips hamza', foldTransliteration('An-Nisāʾ'), 'annisa');

console.log('\n── Zakat ─────────────────────────────────────────────────');
// Silver nisab: 612.36g × $0.90 = $551.12. Net $10,000 → due $250.
const wealthy = calculateZakat(
  { ...EMPTY_ZAKAT_INPUT, cash: 10000, silverPricePerGram: 0.9 },
  'silver'
);
near('nisab (silver)', wealthy.nisabValue, 551.12, 0.05);
check('eligible above nisab', wealthy.isEligible, true);
near('zakat due = 2.5%', wealthy.zakatDue, 250, 0.01);

// Below the threshold.
const modest = calculateZakat(
  { ...EMPTY_ZAKAT_INPUT, cash: 300, silverPricePerGram: 0.9 },
  'silver'
);
check('not eligible below nisab', modest.isEligible, false);
check('nothing due below nisab', modest.zakatDue, 0);
near('shortfall reported', modest.shortfall, 251.12, 0.05);

// Liabilities reduce the base.
const leveraged = calculateZakat(
  { ...EMPTY_ZAKAT_INPUT, cash: 10000, liabilities: 9800, silverPricePerGram: 0.9 },
  'silver'
);
check('liabilities push below nisab', leveraged.isEligible, false);
check('net worth after debts', leveraged.netWorth, 200);

// Gold valuation and the gold standard.
const withGold = calculateZakat(
  { ...EMPTY_ZAKAT_INPUT, goldGrams: 100, goldPricePerGram: 75 },
  'gold'
);
check('gold value = grams × price', withGold.goldValue, 7500);
near('gold nisab = 87.48 × 75', withGold.nisabValue, 6561, 0.5);
check('eligible on gold standard', withGold.isEligible, true);
near('zakat on gold', withGold.zakatDue, 187.5, 0.01);

// No price entered — must not claim eligibility either way.
const unknown = calculateZakat({ ...EMPTY_ZAKAT_INPUT, cash: 999999 }, 'silver');
check('no price → not marked eligible', unknown.isEligible, false);
check('no price → nothing due', unknown.zakatDue, 0);
check('no price → no bogus shortfall', unknown.shortfall, 0);

// Negative / garbage input must not poison the total.
const junk = calculateZakat(
  { ...EMPTY_ZAKAT_INPUT, cash: -500, bank: NaN, investments: 1000, silverPricePerGram: 0.9 },
  'silver'
);
check('negative and NaN inputs ignored', junk.totalAssets, 1000);

console.log(`\n${'─'.repeat(58)}`);
console.log(`  ${pass} passed, ${fail} failed`);
console.log(`${'─'.repeat(58)}\n`);

if (fail > 0) process.exit(1);

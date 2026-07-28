/**
 * End-to-end test of the real API client code against the live free services.
 * This exercises the actual parsing, envelope-unwrapping and mirror-fallback
 * paths the app ships, not a reimplementation of them.
 */
import { fetchMonth, fetchTimings, formatHijri } from '@/api/aladhan';
import { fetchSurahList, fetchSurah, surahAudioUrl } from '@/api/alquran';
import { fetchNearbyMosques } from '@/api/overpass';
import { searchPlaces } from '@/api/nominatim';
import { buildTimeline, resolveNextPrayer, addDays } from '@/utils/time';
import { stripBasmala } from '@/utils/format';

const LONDON = { latitude: 51.5074, longitude: -0.1278 };

let pass = 0;
let fail = 0;
let skipped = 0;

function ok(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    pass++;
    console.log(`  ok   ${name}${detail ? `  — ${detail}` : ''}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}${detail ? `  — ${detail}` : ''}`);
  }
}

async function main(): Promise<void> {
  console.log('\n── Aladhan: single day ───────────────────────────────────');
  const today = await fetchTimings({
    ...LONDON,
    method: 3,
    school: 0,
    date: new Date(),
  });
  ok('timings returned', typeof today.timings.Fajr === 'string', `Fajr ${today.timings.Fajr}`);
  ok('hijri date parsed', Boolean(today.date.hijri.year), formatHijri(today.date.hijri));
  ok('timezone reported', Boolean(today.meta.timezone), today.meta.timezone);

  console.log('\n── Aladhan: month calendar + next-prayer pipeline ────────');
  const now = new Date();
  const month = await fetchMonth({
    ...LONDON,
    method: 3,
    school: 0,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  ok('calendar is an array', Array.isArray(month), `${month.length} days`);
  ok('calendar covers the month', month.length >= 28);

  const byDate: Record<string, (typeof month)[number]> = {};
  for (const d of month) byDate[d.date.gregorian.date] = d;

  const pad = (n: number) => String(n).padStart(2, '0');
  const key = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;

  const todayRec = byDate[key(now)];
  const tomorrowRec = byDate[key(addDays(now, 1))];
  ok('today present in calendar', Boolean(todayRec));

  if (todayRec) {
    const timeline = buildTimeline(todayRec.timings, now);
    ok('timeline built from live data', timeline.length === 6, timeline.map((e) => e.key).join(', '));

    const tomorrowTimeline = tomorrowRec
      ? buildTimeline(tomorrowRec.timings, addDays(now, 1))
      : [];
    const next = resolveNextPrayer(timeline, tomorrowTimeline, now);
    ok('next prayer resolved', next !== null, next ? `${next.next.label} in ${Math.round(next.msRemaining / 60000)} min` : '');
    ok('countdown is non-negative', (next?.msRemaining ?? -1) >= 0);
    ok('progress within 0..1', (next?.progress ?? -1) >= 0 && (next?.progress ?? 2) <= 1);
  }

  console.log('\n── AlQuran Cloud: index ──────────────────────────────────');
  const surahs = await fetchSurahList();
  ok('114 surahs', surahs.length === 114);
  ok('first is Al-Faatiha', surahs[0]?.englishName === 'Al-Faatiha');
  ok('last is An-Naas', surahs[113]?.englishName === 'An-Naas');

  console.log('\n── AlQuran Cloud: surah body + translation zip ───────────');
  const fatiha = await fetchSurah(1, 'en.pickthall');
  ok('Al-Faatiha has 7 ayahs', fatiha.verses.length === 7);
  ok('Arabic present', (fatiha.verses[0]?.arabic.length ?? 0) > 5);
  ok('translation zipped in', (fatiha.verses[0]?.translation.length ?? 0) > 5, `"${fatiha.verses[0]?.translation.slice(0, 46)}…"`);

  const baqara = await fetchSurah(2, 'en.pickthall');
  ok('Al-Baqara has 286 ayahs', baqara.verses.length === 286);
  const firstAyah = baqara.verses[0]!;
  const stripped = stripBasmala(firstAyah.arabic, 2);
  ok('duplicate Basmala stripped from 2:1', stripped.length < firstAyah.arabic.length, `"${stripped}"`);
  ok('sajda flag is boolean', typeof baqara.verses[0]?.sajda === 'boolean');
  const sajdaVerse = baqara.verses.find((v) => v.sajda);
  ok('no sajda in Al-Baqara', sajdaVerse === undefined);

  const sajdaSurah = await fetchSurah(32, 'en.pickthall');
  ok('Sajda detected in As-Sajda', sajdaSurah.verses.some((v) => v.sajda));

  console.log('\n── Audio CDN ─────────────────────────────────────────────');
  const audio = surahAudioUrl(1, 'ar.alafasy');
  const head = await fetch(audio, { headers: { Range: 'bytes=0-64' } });
  ok('surah audio reachable', head.status === 206 || head.status === 200, `${head.status} ${head.headers.get('content-type')}`);

  console.log('\n── Overpass: mosque search with mirror fallback ──────────');
  // The public Overpass instances are volunteer-run and regularly saturated.
  // An outage there is a fact about their capacity, not a defect in this code,
  // so it is reported as a skip rather than failing the suite. (See
  // LICENSES.md: production use needs a self-hosted instance.)
  try {
    const mosques = await fetchNearbyMosques(LONDON, 4000);
    ok('mosques returned', mosques.length > 0, `${mosques.length} within 4 km`);
    ok('sorted by distance', mosques.every((m, i) => i === 0 || m.distanceKm >= mosques[i - 1]!.distanceKm));
    ok('bearings in range', mosques.every((m) => m.bearing >= 0 && m.bearing < 360));
    ok('distances within radius (+slack)', mosques.every((m) => m.distanceKm <= 4.5));
    ok('names resolved', mosques.every((m) => m.name.length > 0));
    console.log(`         nearest: ${mosques[0]?.name} — ${mosques[0]?.distanceKm.toFixed(2)} km @ ${Math.round(mosques[0]?.bearing ?? 0)}°`);
  } catch (error) {
    skipped++;
    console.log(`  SKIP every Overpass mirror is unreachable right now`);
    console.log(`         ${error instanceof Error ? error.message : String(error)}`);
    console.log(`         the app surfaces this as a retryable error state`);
  }

  console.log('\n── Nominatim: manual city search ─────────────────────────');
  const places = await searchPlaces('Istanbul');
  ok('places returned', places.length > 0, `${places.length} matches`);
  const first = places[0];
  ok('has usable coordinates', Number.isFinite(first?.latitude) && Number.isFinite(first?.longitude));
  ok('coordinates are plausible for Istanbul',
    Math.abs((first?.latitude ?? 0) - 41.0) < 1 && Math.abs((first?.longitude ?? 0) - 29.0) < 1,
    `${first?.latitude.toFixed(3)}, ${first?.longitude.toFixed(3)}`);
  ok('label is condensed, not a full display_name', (first?.label.length ?? 999) < 60, `"${first?.label}"`);
  ok('label has no duplicated segments', (() => {
    const parts = (first?.label ?? '').split(', ');
    return new Set(parts).size === parts.length;
  })());

  // Short queries must not hit the network at all.
  const tooShort = await searchPlaces('a');
  ok('sub-2-char query short-circuits', tooShort.length === 0);

  // A manually picked city must produce prayer times, which is the whole point.
  if (first) {
    const manual = await fetchTimings({
      latitude: first.latitude,
      longitude: first.longitude,
      method: 13,
      school: 0,
      date: new Date(),
    });
    ok('manual city yields prayer times', typeof manual.timings.Fajr === 'string',
      `${first.name}: Fajr ${manual.timings.Fajr}, tz ${manual.meta.timezone}`);
  }

  console.log(`\n${'─'.repeat(58)}`);
  console.log(`  ${pass} passed, ${fail} failed${skipped ? `, ${skipped} skipped (third-party outage)` : ''}`);
  console.log(`${'─'.repeat(58)}\n`);
  if (fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error('\nIntegration run threw:', error);
  process.exit(1);
});

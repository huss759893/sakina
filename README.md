# Sakina · سكينة

An Islamic lifestyle app built entirely on free, open, and public-domain sources.
No API keys, no accounts, no analytics, no paid services.

React Native · Expo SDK 57 · TypeScript · React Navigation · Zustand

---

## Running it

```bash
npm install
npm start          # then press i / a, or scan the QR with Expo Go
```

```bash
npm run typecheck  # tsc --noEmit
npm run verify     # 98 assertions over the pure logic — no network
npm run verify:api # 34 assertions against the live free APIs
```

The compass, haptics and notifications need a **physical device**; simulators
have no magnetometer and iOS simulators cannot receive local notifications.

---

## Features

| Screen | What it does |
|---|---|
| **Today** | Hijri date, next-prayer countdown with a progress ring, the day's timeline, quick actions |
| **Prayers** | Today / tomorrow / 7-day timetable, adhan reminders, calculation-method disclosure |
| **Qibla** | Live compass dial with a Kaaba marker, true-north corrected, haptic on alignment |
| **Qur'an** | All 114 surahs, Uthmani script + translation, full-surah recitation, bookmarks, resume-reading |
| **Dhikr** | Tasbih counter with haptics and round tracking, plus 10 daily du'as |
| **Mosques** | Nearby mosques from OpenStreetMap, as a polar radar and a list, with directions |
| **Zakat** | Cash, metals, business assets and liabilities → the 2.5% obligation against nisab |
| **Set location** | GPS, or manual city search via Nominatim — with correct cross-timezone prayer times |

---

## Data sources — all free, no keys

| Source | Used for | Licence |
|---|---|---|
| `api.aladhan.com` | Prayer times, Hijri calendar | Free, no key |
| `api.alquran.cloud` | Uthmani text, translations | Text is public domain |
| `cdn.islamic.network` | Recitation audio | Freely distributed |
| Overpass API (OSM) | Mosque locations | ODbL |
| Nominatim (OSM) | Manual city search | ODbL |
| Plus Jakarta Sans, Amiri | Typography | SIL Open Font License |
| Lucide | Icons | ISC |

**Translations** default to Pickthall (1930) and Yusuf Ali (1934), both public domain.

**No copyrighted assets ship with the app.** Every graphic is drawn at runtime —
the eight-pointed khatam pattern is generated from its geometric construction,
the compass dial and radar are SVG, and all colour is procedural gradient.

---

## Architecture

```
App.tsx                    font loading, store hydration, splash gating
src/
├── theme/                 palette, prayer-phase gradients, type scale, spacing
├── navigation/            root stack + floating bottom tabs, typed params
├── screens/               one file per screen
├── components/            Text, Card, Button, Controls, GradientSky,
│                          KhatamPattern, PrayerRing, StateViews, Screen
├── store/                 Zustand: settings, location, prayers, quran,
│                          mosques, tasbih — each hydrates from AsyncStorage
├── api/                   client (timeout/retry/mirrors), aladhan,
│                          alquran, overpass
├── hooks/                 useNow, useCompassHeading
├── services/              notifications, haptics
├── utils/                 geo, time, zakat, format, storage
└── data/                  duas, dhikr presets, calculation methods, reciters
```

### Design system

Dark-first, because a prayer app is opened at Fajr and Isha. Deep ink surfaces,
a **warm** off-white for text (`#F2ECE1` — never pure white, which reads
clinical against blue-black), brushed gold for the sacred register, jade for
progress.

The signature element is the **living sky**: the dashboard background is a
three-stop gradient sampled from what the sky actually does at the current
point in the prayer cycle — indigo before Fajr, blush at dawn, hard blue at
Dhuhr, brass at Asr, ember at Maghrib, near-black at Isha. It cross-fades when
the phase changes, animated through opacity so it runs on the native driver.

Behind it sits a procedurally generated **khatam** tessellation — the
eight-pointed star formed by two squares offset by 45°, with inner vertices at
the true `cos45°/cos22.5° = 0.765` ratio of the classical figure.

---

## Notes on some decisions

**Qibla uses the great-circle initial bearing**, not a flat-map heading. From
London that is 119°, where naive "point southeast" reasoning gives ~135°. The
values are asserted in `npm run verify` against published Qibla tables for six
cities.

**Heading prefers `Location.watchHeadingAsync` over the raw magnetometer.** Both
read the same hardware, but the Location API applies magnetic declination to
give *true* north — which is what the Qibla bearing is computed against.
Declination exceeds 15° in parts of North America. The magnetometer remains a
fallback.

**Mosques are plotted on a polar radar, not a map.** A real map means either
Google Maps (API key + billing) or OSM raster tiles, whose usage policy
discourages bulk app traffic. A bearing-and-distance plot answers the actual
question with no third-party tiles. A list view and maps deep-links sit
alongside it.

**Overpass requests walk a list of mirrors.** The main endpoint returns an HTML
error page — at HTTP 200 — when busy, so the API client detects non-JSON bodies
and fails over.

**Metal prices are entered by hand in the Zakat calculator.** Every reliable
spot-price feed is paywalled, and a stale hardcoded rate would quietly produce
the wrong religious obligation.

**No adhan recording ships.** Every well-known one is a specific muezzin's
copyrighted performance. Reminders are local notifications using the system
alert sound.

**Prayer times are cached for 30 days and served stale when offline**, with the
UI saying so. For a fixed coordinate and method the timings are deterministic,
so this costs nothing in accuracy.

---

**SVG def ids are per-instance** (`useSvgId`). react-native-svg resolves
`url(#name)` against a registry shared across mounted trees, and the bottom
tabs keep every visited screen mounted — so the khatam pattern, which renders
on three screens in different colours, collided on a hardcoded id and the last
one mounted won.

**Timings are built in the location's timezone, not the device's.** Aladhan
returns wall-clock times for the queried coordinates. That is the same thing
while you are there, but not once you pick a city by hand: Istanbul's "04:01"
is not 04:01 in London. `buildTimeline` takes an IANA zone and resolves each
time to a true instant via a two-pass offset calculation that handles DST, so
the countdown stays right while the clock face still shows the city's own wall
time. It falls back to local construction when no zone applies.

---

## Known limitations

- Recitation is per-surah, not per-ayah highlighted.
- Nominatim search is debounced to ~1 req/s to respect its usage policy, so
  results lag typing slightly. This is deliberate.

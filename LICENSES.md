# Third-party content and licences

An audit of everything in Itminan that someone else owns, and what each licence
requires of you before publishing.

**Short answer: nothing in this repository is copyright-encumbered as it
stands. Two items were removed to keep it that way, and three items need
action from you before a store release — all flagged as ⚠️ below.**

---

## Code dependencies

| Package | Licence | Obligation |
|---|---|---|
| React, React Native, Expo | MIT | Retain notice |
| React Navigation | MIT | Retain notice |
| Zustand | MIT | Retain notice |
| react-native-svg | MIT | Retain notice |
| lucide-react-native | ISC | Retain notice |
| @react-native-async-storage/async-storage | MIT | Retain notice |

All permissive. Attribution is satisfied by shipping this file.

## Fonts — both SIL Open Font License 1.1

| Font | Copyright |
|---|---|
| Plus Jakarta Sans | © 2020 The Plus Jakarta Sans Project Authors |
| Amiri | © 2010–2022 The Amiri Project Authors |

OFL explicitly permits embedding in an application, including a commercial
one. The two conditions that matter: the fonts must not be sold on their own,
and the copyright notice must travel with them — which this file does. The
full licence text ships inside each package (`LICENSE_FONT`).

## Artwork

Every graphic is generated at runtime or from geometric construction — there
are no licensed images anywhere in the app.

- **App icon, adaptive icon, splash mark** — original, generated from the
  khatam construction in `scripts/`. Not the Expo template artwork.
- **Khatam pattern, compass dial, mosque radar, prayer ring** — drawn as SVG
  at runtime.
- **All colour** — procedural gradients.

## Religious texts

| Content | Status |
|---|---|
| Qur'anic Arabic (Uthmani) | The text itself is not subject to copyright. |
| Pickthall translation, 1930 | Public domain — translator died 1936. |
| Yusuf Ali translation, 1934 | Public domain — translator died 1953. |
| Du'a texts | Classical; from the Qur'an and canonical hadith collections. Long out of copyright. |
| English renderings of the du'as | Written for this app. |

### Deliberately excluded

These are reachable through the AlQuran Cloud API but are **not** offered in
the app, because an API exposing something is not a licence to redistribute it:

- **Saheeh International** — in copyright (Abul Qasim Publishing House).
- **Arberry** — A. J. Arberry died 1969; in copyright until ~2040 in life+70
  jurisdictions.
- Hilali-Khan, Maududi, and other modern renderings.

⚠️ **If you add another translation, check the translator's death date first.**
Life + 70 years is the rule in the US, UK and EU.

---

## Services — read this before publishing

### ⚠️ 1. Recitation audio

`cdn.islamic.network` distributes recitations by Mishary Alafasy, Abdul Basit
and others free of charge. Free distribution is not the same as a licence to
redistribute commercially: a recitation is a **performance**, and performances
attract copyright in most jurisdictions independently of the text.

Nearly every Qur'an app streams these, and takedowns are rare — but the
position is genuinely untested, not clearly safe. If that risk is unacceptable
to you, either remove the audio feature or obtain written permission from the
reciters' publishers.

### ⚠️ 2. Nominatim (manual city search)

The OSMF usage policy for the public instance says:

> "No heavy uses (an absolute maximum of 1 request per second)" — counted as
> "the sum of traffic by all your users".

> "Auto-complete search ... you must not implement such a service on the
> client side using the API."

The autocomplete prohibition is already handled: search runs on explicit
submit, never as you type. **The rate limit is not something client code can
solve** — a published app with real users will exceed 1 req/s in aggregate.

**Before release:** point `BASE` in `src/api/nominatim.ts` at your own
Nominatim instance, or a commercial geocoder.

### ⚠️ 3. Overpass API (mosque search)

The Overpass documentation is explicit that the public instances are not for
this:

> "Setting up an app for more than just OSM mappers and relying on the public
> instances as backend" — listed as problematic. "Only running your own
> instance sustainably serves your mission."

The app already caches results for 24 hours and fails over between mirrors,
which is polite but does not make it compliant at scale.

**Before release:** run your own Overpass instance, or pre-import mosque data
into your own backend.

### Aladhan API (prayer times, Hijri calendar)

Free, no key, no published hard rate limit. The app caches a month per request
and stores it for 30 days, so real-world traffic is roughly one request per
user per month. No action needed.

### OpenStreetMap data — ODbL

Mosque and place data is © OpenStreetMap contributors under the Open Database
Licence. Displaying it produces a "Produced Work", which requires attribution
only — the share-alike clause does not reach into your app's source. The
required credit is shown on the Mosques and Set Location screens and in
Settings.

---

## Trademarks

"Itminan" (اطمئنان, *tranquility of the heart*, Qur'an 13:28) is a common
Arabic noun, but ⚠️ **search your target markets' trademark registers before
release** — app names are the most common cause of store rejection after
privacy policies.

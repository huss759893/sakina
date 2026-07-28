import { requestJSON, USER_AGENT } from './client';

/**
 * Place search via OpenStreetMap's Nominatim — free, keyless, ODbL.
 *
 * Two hard constraints from the OSMF usage policy, both of which shape the UI:
 *
 *   1. "Auto-complete search ... you must not implement such a service on the
 *      client side using the API." So search fires on explicit submit only —
 *      never as the user types.
 *   2. "No heavy uses (an absolute maximum of 1 request per second)", counted
 *      as the sum across all of an application's users.
 *
 * (2) means the public instance is not a lawful backend for an app with real
 * distribution. Before shipping to a store, point BASE at your own Nominatim
 * instance or a commercial geocoder. See LICENSES.md.
 */

const BASE = 'https://nominatim.openstreetmap.org';

/** Minimum gap between submitted searches, to honour the 1 req/s ceiling. */
export const MIN_SEARCH_INTERVAL_MS = 1100;

export interface PlaceResult {
  id: string;
  /** Short name for the header, e.g. "Istanbul". */
  name: string;
  /** Full descriptor, e.g. "Istanbul, Marmara Region, Türkiye". */
  label: string;
  latitude: number;
  longitude: number;
}

interface NominatimPlace {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  addresstype?: string;
  address?: Record<string, string>;
}

/** Trims Nominatim's very long display_name to the parts a person recognises. */
function condense(place: NominatimPlace): string {
  const address = place.address ?? {};
  const locality =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    place.name;
  const region = address.state ?? address.region ?? address.province;
  const country = address.country;

  const parts = [locality, region, country].filter(
    (part): part is string => Boolean(part)
  );

  // De-duplicate: "İstanbul, İstanbul, Türkiye" reads badly.
  const unique = parts.filter((part, i) => parts.indexOf(part) === i);
  return unique.length > 0
    ? unique.join(', ')
    : (place.display_name ?? 'Unknown place');
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal
): Promise<PlaceResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    limit: '8',
    addressdetails: '1',
  });

  const results = await requestJSON<NominatimPlace[]>(
    `${BASE}/search?${params.toString()}`,
    {
      headers: { 'User-Agent': USER_AGENT },
      signal,
      // The policy asks for restraint; do not hammer it with retries.
      retries: 0,
      timeoutMs: 15000,
    }
  );

  if (!Array.isArray(results)) return [];

  // Nominatim commonly returns the same place several times — a node and the
  // administrative relation for one city both match "Istanbul" — which would
  // otherwise show as identical, indistinguishable rows.
  const seen = new Set<string>();

  return results
    .map((place) => {
      const latitude = Number.parseFloat(place.lat);
      const longitude = Number.parseFloat(place.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

      const address = place.address ?? {};
      return {
        id: String(place.place_id),
        name:
          address.city ??
          address.town ??
          address.village ??
          place.name ??
          condense(place),
        label: condense(place),
        latitude,
        longitude,
      } satisfies PlaceResult;
    })
    .filter((p): p is PlaceResult => p !== null)
    .filter((p) => {
      const key = p.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

import { requestJSON, ApiError, USER_AGENT } from './client';
import { haversineKm, initialBearing, type Coords } from '@/utils/geo';

/**
 * Mosque search over OpenStreetMap via the Overpass API. Open data (ODbL),
 * no key, no billing — unlike the Google Places API this replaces.
 *
 * The public instances are volunteer-run and genuinely do fall over: the main
 * endpoint answers "Dispatcher_Client::request_read_and_idx::timeout. The
 * server is probably too busy" under load. So we walk a list of mirrors and
 * take the first that answers with real JSON.
 */

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
] as const;

export interface Mosque {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  bearing: number;
  /** Assembled from OSM address tags, when present. */
  address: string | null;
  denomination: string | null;
  website: string | null;
  phone: string | null;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

/**
 * `out center` makes ways and relations (mosque buildings, which are far more
 * common in OSM than single nodes) report a centroid we can plot.
 */
function buildQuery(coords: Coords, radiusMeters: number): string {
  const filter = '["amenity"="place_of_worship"]["religion"="muslim"]';
  const around = `(around:${radiusMeters},${coords.latitude},${coords.longitude})`;
  return `[out:json][timeout:25];
(
  node${filter}${around};
  way${filter}${around};
  relation${filter}${around};
);
out center 80;`;
}

function toMosque(element: OverpassElement, origin: Coords): Mosque | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;

  const tags = element.tags ?? {};
  const point: Coords = { latitude: lat, longitude: lon };

  const addressParts = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:city'],
    tags['addr:postcode'],
  ].filter((part): part is string => Boolean(part && part.length > 0));

  return {
    id: `${element.type}/${element.id}`,
    name:
      tags['name:en'] ??
      tags.name ??
      tags['name:ar'] ??
      'Unnamed place of worship',
    latitude: lat,
    longitude: lon,
    distanceKm: haversineKm(origin, point),
    bearing: initialBearing(origin, point),
    address: addressParts.length > 0 ? addressParts.join(', ') : null,
    denomination: tags.denomination ?? null,
    website: tags.website ?? tags['contact:website'] ?? null,
    phone: tags.phone ?? tags['contact:phone'] ?? null,
  };
}

export async function fetchNearbyMosques(
  coords: Coords,
  radiusMeters: number,
  signal?: AbortSignal
): Promise<Mosque[]> {
  const body = `data=${encodeURIComponent(buildQuery(coords, radiusMeters))}`;
  let lastError: unknown = new ApiError('No Overpass mirror was reachable');

  for (const mirror of MIRRORS) {
    try {
      const json = await requestJSON<OverpassResponse>(mirror, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        // Mirrors that are busy should be abandoned quickly so the next one
        // gets a turn, rather than retried in place.
        timeoutMs: 25000,
        retries: 0,
        signal,
      });

      const elements = Array.isArray(json.elements) ? json.elements : [];
      return elements
        .map((element) => toMosque(element, coords))
        .filter((m): m is Mosque => m !== null)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    } catch (error) {
      lastError = error;
      if (signal?.aborted) throw error;
      // Try the next mirror.
    }
  }

  throw lastError;
}

/** Deep link into whichever maps app the platform provides. */
export function mapsUrl(mosque: Mosque, platform: 'ios' | 'android' | 'web'): string {
  const label = encodeURIComponent(mosque.name);
  const coords = `${mosque.latitude},${mosque.longitude}`;

  if (platform === 'ios') {
    return `https://maps.apple.com/?ll=${coords}&q=${label}`;
  }
  if (platform === 'android') {
    return `geo:${coords}?q=${coords}(${label})`;
  }
  return `https://www.openstreetmap.org/?mlat=${mosque.latitude}&mlon=${mosque.longitude}#map=17/${coords.replace(',', '/')}`;
}

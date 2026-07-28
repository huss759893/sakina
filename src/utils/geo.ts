/** Spherical geometry. All bearings are degrees clockwise from true north. */

export const KAABA = { latitude: 21.4225, longitude: 39.8262 } as const;

const EARTH_RADIUS_KM = 6371.0088;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export interface Coords {
  latitude: number;
  longitude: number;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Initial bearing along the great circle from `a` to `b`.
 *
 * This is the correct Qibla calculation — a rhumb line (constant compass
 * heading) would point somewhere else entirely from high latitudes. From
 * London the great-circle Qibla is ~119°, whereas naive "point southeast
 * toward Mecca on a flat map" reasoning gives ~135°.
 */
export function initialBearing(a: Coords, b: Coords): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return normalizeDegrees(toDeg(Math.atan2(y, x)));
}

/** Bearing from the user's position to the Kaaba. */
export function qiblaBearing(from: Coords): number {
  return initialBearing(from, KAABA);
}

export function distanceToKaabaKm(from: Coords): number {
  return haversineKm(from, KAABA);
}

/** Wrap any angle into [0, 360). */
export function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Shortest signed rotation from `from` to `to`, in (-180, 180].
 * Used so the compass needle never spins the long way round.
 */
export function angleDelta(from: number, to: number): number {
  let delta = normalizeDegrees(to) - normalizeDegrees(from);
  if (delta > 180) delta -= 360;
  if (delta <= -180) delta += 360;
  return delta;
}

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
] as const;

export function compassPoint(deg: number): string {
  const idx = Math.round(normalizeDegrees(deg) / 22.5) % 16;
  return COMPASS_POINTS[idx] ?? 'N';
}

/** Formats a distance for display, switching units at the useful threshold. */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

/**
 * Converts a polar position (bearing + distance) into x/y offsets on a radar
 * plot of `radius` px representing `maxKm`. Screen y is inverted so that
 * bearing 0 (north) points up.
 */
export function polarToXY(
  bearingDeg: number,
  distanceKm: number,
  maxKm: number,
  radius: number
): { x: number; y: number } {
  const clamped = Math.min(distanceKm / Math.max(maxKm, 0.0001), 1);
  const r = clamped * radius;
  const theta = toRad(bearingDeg - 90);
  return { x: Math.cos(theta) * r, y: Math.sin(theta) * r };
}

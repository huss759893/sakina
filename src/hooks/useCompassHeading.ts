import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { normalizeDegrees, angleDelta } from '@/utils/geo';

export type HeadingSource = 'location' | 'magnetometer';

export interface HeadingState {
  /** Degrees clockwise from true north, or null before the first reading. */
  heading: number | null;
  /**
   * iOS reports accuracy in degrees (lower is better); Android reports a 0-3
   * quality enum. `calibrationNeeded` normalizes both.
   */
  accuracy: number | null;
  calibrationNeeded: boolean;
  source: HeadingSource | null;
  error: string | null;
}

/** Exponential smoothing — raw magnetometer output is far too jittery to render. */
const SMOOTHING = 0.18;

/**
 * Device heading, preferring `Location.watchHeadingAsync` over the raw
 * magnetometer.
 *
 * Both read the same hardware, but the Location API additionally applies
 * magnetic declination to produce *true* north. That matters: the Qibla
 * bearing is computed against true north, so feeding it a magnetic heading
 * would be off by the local declination — over 15° in parts of North America.
 * The raw Magnetometer is kept as a fallback for devices where the heading
 * service refuses to start.
 */
export function useCompassHeading(enabled: boolean): HeadingState {
  const [state, setState] = useState<HeadingState>({
    heading: null,
    accuracy: null,
    calibrationNeeded: false,
    source: null,
    error: null,
  });

  // Smoothed value lives in a ref so the effect never re-subscribes on tick.
  const smoothed = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let headingSub: Location.LocationSubscription | null = null;
    let magSub: { remove: () => void } | null = null;

    const push = (
      raw: number,
      source: HeadingSource,
      accuracy: number | null,
      calibrationNeeded: boolean
    ): void => {
      if (cancelled) return;

      const target = normalizeDegrees(raw);
      const previous = smoothed.current;

      // Interpolate along the *shortest* arc so the needle never spins the
      // long way round when crossing 360/0.
      const next =
        previous === null
          ? target
          : normalizeDegrees(previous + angleDelta(previous, target) * SMOOTHING);

      smoothed.current = next;
      setState({
        heading: next,
        accuracy,
        calibrationNeeded,
        source,
        error: null,
      });
    };

    const startMagnetometer = async (): Promise<void> => {
      try {
        const available = await Magnetometer.isAvailableAsync();
        if (!available) {
          if (!cancelled) {
            setState((s) => ({
              ...s,
              error:
                'This device has no compass sensor. Use the fixed bearing below and a physical compass.',
            }));
          }
          return;
        }

        Magnetometer.setUpdateInterval(80);
        magSub = Magnetometer.addListener(({ x, y }) => {
          // atan2(y, x) gives the angle of the horizontal field vector; the
          // -90° rotation maps it onto a north-up compass rose.
          const degrees = Math.atan2(y, x) * (180 / Math.PI);
          push(normalizeDegrees(degrees - 90), 'magnetometer', null, false);
        });
      } catch (error) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            error:
              error instanceof Error
                ? `Compass unavailable: ${error.message}`
                : 'Compass unavailable.',
          }));
        }
      }
    };

    const start = async (): Promise<void> => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();

        // The heading service needs location permission; without it we can
        // still read the magnetometer, just without declination correction.
        if (status !== 'granted') {
          await startMagnetometer();
          return;
        }

        headingSub = await Location.watchHeadingAsync((reading) => {
          // Android returns -1 for trueHeading when it cannot resolve
          // declination; magHeading is then the best we have.
          const value =
            reading.trueHeading >= 0 ? reading.trueHeading : reading.magHeading;
          if (!Number.isFinite(value)) return;

          const accuracy = reading.accuracy ?? null;
          // iOS: accuracy in degrees, >25 is poor. Android: enum, <2 is poor.
          const poor =
            accuracy !== null && (accuracy > 25 || (accuracy >= 0 && accuracy < 2));

          push(value, 'location', accuracy, poor);
        });
      } catch {
        await startMagnetometer();
      }
    };

    void start();

    return () => {
      cancelled = true;
      headingSub?.remove();
      magSub?.remove();
      smoothed.current = null;
    };
  }, [enabled]);

  return state;
}

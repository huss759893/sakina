import { useState } from 'react';

/**
 * Per-instance identifiers for SVG `<Defs>` entries.
 *
 * react-native-svg resolves `url(#name)` against a registry shared across
 * mounted Svg trees, so two components that hardcode the same def id collide
 * and the last one mounted wins. That bites here because the bottom tabs keep
 * every visited screen mounted, and the khatam pattern renders on three of
 * them with different colours.
 *
 * `useId` is deliberately not used: React emits delimiter characters (`:` in
 * React 18, `«»` in 19) that are invalid in XML identifiers and inside
 * `url(#…)` references.
 */
let counter = 0;

export function useSvgId(prefix: string): string {
  // Lazy initialiser so the counter advances once per instance, not per render.
  const [id] = useState(() => `${prefix}_${++counter}`);
  return id;
}

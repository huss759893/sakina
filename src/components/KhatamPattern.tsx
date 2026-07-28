import React, { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, G, Line, Pattern, Polygon, Rect } from 'react-native-svg';
import { palette } from '@/theme';
import { useSvgId } from '@/utils/svgId';

/**
 * The khatam — the eight-pointed star formed by two overlapping squares, one
 * rotated 45°. It is the most widespread motif in Islamic geometric ornament
 * and, being pure construction, carries no licensing question at all: it is
 * generated here from first principles rather than traced from an image.
 *
 * Used at low opacity as a texture behind headers.
 */

/**
 * For two squares of circumradius R offset by 45°, the star's inner vertices
 * sit where their edges cross. A square's edge lies at its apothem R·cos45°;
 * travelling out along 22.5° reaches it at R·cos45°/cos22.5° = 0.7654·R.
 * Using the true value keeps the proportions of the classical figure.
 */
const INNER_RATIO = Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8);

/** 16 alternating outer/inner vertices, starting at a point facing up. */
function starPoints(cx: number, cy: number, radius: number): string {
  const points: string[] = [];

  for (let i = 0; i < 16; i++) {
    const isOuter = i % 2 === 0;
    const r = isOuter ? radius : radius * INNER_RATIO;
    // -90° so the figure sits point-up rather than point-right.
    const angle = (i * 22.5 - 90) * (Math.PI / 180);
    points.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }

  return points.join(' ');
}

interface KhatamPatternProps {
  /** Edge length of one repeating tile, in px. */
  tile?: number;
  opacity?: number;
  color?: string;
  style?: ViewStyle;
}

export const KhatamPattern = React.memo(function KhatamPattern({
  tile = 88,
  opacity = 0.07,
  color = palette.gold,
  style,
}: KhatamPatternProps) {
  // Unique per instance: Home, Zakat and More each render this pattern in a
  // different colour, and all three can be mounted at the same time.
  const patternId = useSvgId('khatam');

  const { center, corners } = useMemo(() => {
    const r = tile * 0.4;
    return {
      center: starPoints(tile / 2, tile / 2, r),
      // Corner stars are clipped by the tile edge and completed by the
      // neighbouring tiles, which is what makes the lattice read as continuous.
      corners: [
        starPoints(0, 0, r),
        starPoints(tile, 0, r),
        starPoints(0, tile, r),
        starPoints(tile, tile, r),
      ],
    };
  }, [tile]);

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%" opacity={opacity}>
        <Defs>
          <Pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={tile}
            height={tile}
          >
            <G stroke={color} strokeWidth={1} fill="none">
              <Polygon points={center} />
              {corners.map((points, i) => (
                <Polygon key={i} points={points} />
              ))}
              {/* Lattice rules tying the stars together. */}
              <Line x1={0} y1={tile / 2} x2={tile} y2={tile / 2} strokeOpacity={0.35} />
              <Line x1={tile / 2} y1={0} x2={tile / 2} y2={tile} strokeOpacity={0.35} />
            </G>
            <Polygon
              points={center}
              fill={color}
              fillOpacity={0.14}
              stroke="none"
            />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
});

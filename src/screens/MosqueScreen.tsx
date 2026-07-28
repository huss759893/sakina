import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import {
  ArrowLeft,
  Globe,
  Navigation,
  Phone,
  RefreshCw,
} from 'lucide-react-native';

import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Segmented, SectionHeader, Pill } from '@/components/Controls';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  LocationPrompt,
} from '@/components/StateViews';

import { useLocationStore } from '@/store/useLocationStore';
import { useMosqueStore } from '@/store/useMosqueStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { mapsUrl, type Mosque } from '@/api/overpass';
import { compassPoint, formatDistance, polarToXY } from '@/utils/geo';
import { selection, tapLight } from '@/services/haptics';
import { palette, space, radius, font, HIT_SLOP, MIN_TOUCH } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

const RADAR = 300;
const RADAR_CENTER = RADAR / 2;
const RADAR_RADIUS = RADAR_CENTER - 26;

export function MosqueScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'radar' | 'list'>('radar');

  const {
    coords,
    label,
    status: locStatus,
    error: locError,
    requestLocation,
  } = useLocationStore();
  const { searchRadiusMeters, update } = useSettingsStore();
  const { mosques, status, error, search } = useMosqueStore();

  useEffect(() => {
    if (!coords) return;
    void search(coords, searchRadiusMeters);
  }, [coords, searchRadiusMeters, search]);

  const onRefresh = useCallback(() => {
    if (coords) void search(coords, searchRadiusMeters, true);
  }, [coords, searchRadiusMeters, search]);

  const openDirections = useCallback(async (mosque: Mosque) => {
    tapLight();
    const platform =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const url = mapsUrl(mosque, platform);

    try {
      const supported = await Linking.canOpenURL(url);
      // The geo: scheme has no handler on some Android builds; the OSM web
      // page always opens.
      await Linking.openURL(supported ? url : mapsUrl(mosque, 'web'));
    } catch {
      Alert.alert(
        'Could not open maps',
        'No maps application is available to handle this location.'
      );
    }
  }, []);

  const openLink = useCallback(async (url: string) => {
    try {
      const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      await Linking.openURL(normalized);
    } catch {
      Alert.alert('Could not open link', 'That address could not be opened.');
    }
  }, []);

  const maxKm = useMemo(() => searchRadiusMeters / 1000, [searchRadiusMeters]);

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
      >
        <ArrowLeft size={20} color={palette.text} strokeWidth={2} />
      </Pressable>
      <Text variant="h3" style={styles.headerTitle}>
        Mosques
      </Text>
      <Pressable
        onPress={onRefresh}
        hitSlop={HIT_SLOP}
        disabled={status === 'loading'}
        accessibilityRole="button"
        accessibilityLabel="Refresh mosque search"
        style={({ pressed }) => [
          styles.headerButton,
          pressed && styles.pressed,
          status === 'loading' && styles.disabled,
        ]}
      >
        <RefreshCw size={18} color={palette.text} strokeWidth={2} />
      </Pressable>
    </View>
  );

  if (!coords) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {header}
        <LocationPrompt
          message="Itminan searches OpenStreetMap for mosques around you, so it needs your coordinates."
          onRequest={() => void requestLocation()}
          busy={locStatus === 'requesting'}
          error={locError}
          onSetManually={() => navigation.navigate('LocationSearch')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {header}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="bodySm" color={palette.textMuted} style={styles.locationLine}>
          Around {label || 'your location'}
        </Text>

        <Segmented
          options={[
            { value: 2000, label: '2 km' },
            { value: 5000, label: '5 km' },
            { value: 10000, label: '10 km' },
            { value: 25000, label: '25 km' },
          ]}
          value={searchRadiusMeters}
          onChange={(value) => {
            selection();
            update({ searchRadiusMeters: value });
          }}
          style={styles.radiusRow}
        />

        {status === 'loading' ? (
          <View style={styles.stateWrap}>
            <LoadingState message="Searching OpenStreetMap…" />
          </View>
        ) : status === 'error' ? (
          <View style={styles.stateWrap}>
            <ErrorState
              title="Search failed"
              message={
                error ??
                'The Overpass service could not be reached. It is volunteer-run and sometimes busy.'
              }
              onRetry={onRefresh}
            />
          </View>
        ) : mosques.length === 0 ? (
          <View style={styles.stateWrap}>
            <EmptyState
              title="No mosques found"
              message={`Nothing tagged as a Muslim place of worship within ${formatDistance(maxKm)} on OpenStreetMap. Try a wider radius — OSM coverage varies by region.`}
              actionLabel="Widen to 25 km"
              onAction={() => update({ searchRadiusMeters: 25000 })}
            />
          </View>
        ) : (
          <>
            <Segmented
              options={[
                { value: 'radar', label: 'Radar' },
                { value: 'list', label: 'List' },
              ]}
              value={view}
              onChange={setView}
              style={styles.viewToggle}
            />

            {view === 'radar' ? (
              <RadarView mosques={mosques} maxKm={maxKm} onSelect={openDirections} />
            ) : null}

            <SectionHeader
              title={`${mosques.length} nearby`}
              style={styles.listHeader}
            />

            <View style={styles.list}>
              {mosques.map((mosque) => (
                <Card key={mosque.id} style={styles.mosqueCard}>
                  <View style={styles.mosqueTop}>
                    <View style={styles.flex}>
                      <Text variant="body" weight="semibold">
                        {mosque.name}
                      </Text>
                      {mosque.address ? (
                        <Text variant="caption" color={palette.textMuted}>
                          {mosque.address}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.distanceBlock}>
                      <Text style={[styles.distance, font('bold')]}>
                        {formatDistance(mosque.distanceKm)}
                      </Text>
                      <Text variant="caption" color={palette.textFaint}>
                        {compassPoint(mosque.bearing)}
                      </Text>
                    </View>
                  </View>

                  {mosque.denomination ? (
                    <Pill
                      label={capitalize(mosque.denomination)}
                      tone="jade"
                      style={styles.denomination}
                    />
                  ) : null}

                  <View style={styles.mosqueActions}>
                    <Pressable
                      onPress={() => void openDirections(mosque)}
                      accessibilityRole="button"
                      accessibilityLabel={`Directions to ${mosque.name}`}
                      style={({ pressed }) => [
                        styles.mosqueAction,
                        styles.primaryAction,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Navigation size={15} color={palette.ink} strokeWidth={2.2} />
                      <Text variant="caption" weight="semibold" color={palette.ink}>
                        Directions
                      </Text>
                    </Pressable>

                    {mosque.phone ? (
                      <Pressable
                        onPress={() => void openLink(`tel:${mosque.phone}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`Call ${mosque.name}`}
                        style={({ pressed }) => [
                          styles.mosqueAction,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Phone size={15} color={palette.textSoft} strokeWidth={2.2} />
                        <Text variant="caption" weight="semibold" color={palette.textSoft}>
                          Call
                        </Text>
                      </Pressable>
                    ) : null}

                    {mosque.website ? (
                      <Pressable
                        onPress={() => void openLink(mosque.website!)}
                        accessibilityRole="button"
                        accessibilityLabel={`Open the website for ${mosque.name}`}
                        style={({ pressed }) => [
                          styles.mosqueAction,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Globe size={15} color={palette.textSoft} strokeWidth={2.2} />
                        <Text variant="caption" weight="semibold" color={palette.textSoft}>
                          Website
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}

        <Text variant="caption" color={palette.textFaint} align="center" style={styles.attribution}>
          Mosque data © OpenStreetMap contributors, ODbL. Queried live via the
          Overpass API — no tracking, no API key.
        </Text>
      </ScrollView>
    </View>
  );
}

/**
 * A polar plot of the surroundings instead of a tile map.
 *
 * A real map would mean either Google Maps (an API key and a billing account)
 * or raster tiles from OSM's own servers, whose tile-usage policy discourages
 * bulk app traffic. Plotting bearing and distance directly answers the actual
 * question — "which way, and how far" — with no third-party tiles at all.
 */
function RadarView({
  mosques,
  maxKm,
  onSelect,
}: {
  mosques: Mosque[];
  maxKm: number;
  onSelect: (mosque: Mosque) => void;
}) {
  const [selected, setSelected] = useState<Mosque | null>(null);

  // Beyond a couple of dozen the plot turns to noise.
  const plotted = useMemo(() => mosques.slice(0, 24), [mosques]);

  return (
    <View style={styles.radarWrap}>
      <Svg width={RADAR} height={RADAR}>
        {/* Distance rings at ¼, ½, ¾ and the full radius. */}
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <Circle
            key={fraction}
            cx={RADAR_CENTER}
            cy={RADAR_CENTER}
            r={RADAR_RADIUS * fraction}
            fill="none"
            stroke={fraction === 1 ? palette.hairlineStrong : palette.hairlineFaint}
            strokeWidth={1}
          />
        ))}

        {/* Cardinal cross. */}
        <Line
          x1={RADAR_CENTER}
          y1={RADAR_CENTER - RADAR_RADIUS}
          x2={RADAR_CENTER}
          y2={RADAR_CENTER + RADAR_RADIUS}
          stroke={palette.hairlineFaint}
        />
        <Line
          x1={RADAR_CENTER - RADAR_RADIUS}
          y1={RADAR_CENTER}
          x2={RADAR_CENTER + RADAR_RADIUS}
          y2={RADAR_CENTER}
          stroke={palette.hairlineFaint}
        />

        <SvgText
          x={RADAR_CENTER}
          y={14}
          fill={palette.textMuted}
          fontSize={12}
          fontWeight="700"
          textAnchor="middle"
        >
          N
        </SvgText>
        <SvgText
          x={RADAR_CENTER + RADAR_RADIUS * 0.52}
          y={RADAR_CENTER - 6}
          fill={palette.textFaint}
          fontSize={10}
          textAnchor="middle"
        >
          {formatDistance(maxKm / 2)}
        </SvgText>

        {plotted.map((mosque) => {
          const { x, y } = polarToXY(
            mosque.bearing,
            mosque.distanceKm,
            maxKm,
            RADAR_RADIUS
          );
          const isSelected = selected?.id === mosque.id;
          return (
            <G key={mosque.id}>
              <Circle
                cx={RADAR_CENTER + x}
                cy={RADAR_CENTER + y}
                r={isSelected ? 9 : 6}
                fill={isSelected ? palette.jade : palette.gold}
                opacity={isSelected ? 1 : 0.85}
              />
              {isSelected ? (
                <Circle
                  cx={RADAR_CENTER + x}
                  cy={RADAR_CENTER + y}
                  r={14}
                  fill="none"
                  stroke={palette.jade}
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              ) : null}
            </G>
          );
        })}

        {/* The user, at the origin. */}
        <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={5} fill={palette.text} />
        <Circle
          cx={RADAR_CENTER}
          cy={RADAR_CENTER}
          r={11}
          fill="none"
          stroke={palette.text}
          strokeWidth={1}
          opacity={0.35}
        />
      </Svg>

      {/*
        Touch targets sit in an overlay rather than on the SVG nodes: a 6px
        circle is far below the 44pt minimum, so each marker gets a real,
        finger-sized hit area centred on it.
      */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {plotted.map((mosque) => {
          const { x, y } = polarToXY(
            mosque.bearing,
            mosque.distanceKm,
            maxKm,
            RADAR_RADIUS
          );
          return (
            <Pressable
              key={mosque.id}
              onPress={() => {
                selection();
                setSelected((current) => (current?.id === mosque.id ? null : mosque));
              }}
              accessibilityRole="button"
              accessibilityLabel={`${mosque.name}, ${formatDistance(mosque.distanceKm)} to the ${compassPoint(mosque.bearing)}`}
              style={[
                styles.radarHit,
                {
                  left: RADAR_CENTER + x - MIN_TOUCH / 2,
                  top: RADAR_CENTER + y - MIN_TOUCH / 2,
                },
              ]}
            />
          );
        })}
      </View>

      {selected ? (
        <Card style={styles.radarCallout} onPress={() => onSelect(selected)}>
          <View style={styles.calloutRow}>
            <View style={styles.flex}>
              <Text variant="bodySm" weight="semibold" numberOfLines={1}>
                {selected.name}
              </Text>
              <Text variant="caption" color={palette.textMuted}>
                {formatDistance(selected.distanceKm)} ·{' '}
                {compassPoint(selected.bearing)} · {Math.round(selected.bearing)}°
              </Text>
            </View>
            <Navigation size={17} color={palette.gold} strokeWidth={2} />
          </View>
        </Card>
      ) : (
        <Text variant="caption" color={palette.textFaint} align="center" style={styles.radarHint}>
          Tap a marker for details · rings are {formatDistance(maxKm / 4)} apart
        </Text>
      )}
    </View>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
  },
  headerButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },

  content: {
    paddingHorizontal: space.lg,
  },
  locationLine: {
    marginBottom: space.md,
  },
  radiusRow: {
    marginBottom: space.base,
  },
  viewToggle: {
    marginBottom: space.lg,
  },
  stateWrap: {
    minHeight: 320,
  },

  radarWrap: {
    alignItems: 'center',
  },
  radarHit: {
    position: 'absolute',
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
  },
  radarCallout: {
    marginTop: space.base,
    alignSelf: 'stretch',
    borderColor: palette.goldDeep,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  radarHint: {
    marginTop: space.base,
  },

  listHeader: {
    marginTop: space.xl,
  },
  list: {
    gap: space.md,
  },
  mosqueCard: {
    gap: space.md,
  },
  mosqueTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  distanceBlock: {
    alignItems: 'flex-end',
  },
  distance: {
    fontSize: 15,
    color: palette.gold,
  },
  denomination: {
    marginTop: -space.xs,
  },
  mosqueActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  mosqueAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.base,
    minHeight: MIN_TOUCH - 6,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  primaryAction: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  attribution: {
    marginTop: space.xl,
    lineHeight: 17,
  },
});

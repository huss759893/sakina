import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Crosshair, MapPin, Search, X } from 'lucide-react-native';

import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/StateViews';

import { useLocationStore } from '@/store/useLocationStore';
import {
  searchPlaces,
  MIN_SEARCH_INTERVAL_MS,
  type PlaceResult,
} from '@/api/nominatim';
import { describeError } from '@/api/client';
import { selection } from '@/services/haptics';
import { palette, space, radius, font, HIT_SLOP, MIN_TOUCH } from '@/theme';

type Status = 'idle' | 'searching' | 'done' | 'error';

/**
 * Manual city picker, for when location permission is declined or the user
 * wants times for somewhere else. Backed by Nominatim (OSM) — free and
 * keyless, like everything else in this app.
 */
export function LocationSearchScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { setManualLocation, requestLocation, status: gpsStatus } =
    useLocationStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  // One in-flight request at a time; a newer keystroke cancels the older call.
  const controllerRef = useRef<AbortController | null>(null);

  const lastSearchAt = useRef(0);

  /**
   * Runs on explicit submit only. Nominatim's usage policy forbids
   * implementing autocomplete against the public API from the client, so this
   * is deliberately *not* wired to the query state.
   */
  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    // Enforce the 1 req/s ceiling even against impatient repeat taps.
    const sinceLast = Date.now() - lastSearchAt.current;
    if (sinceLast < MIN_SEARCH_INTERVAL_MS) return;
    lastSearchAt.current = Date.now();

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setStatus('searching');
    setError(null);

    try {
      const found = await searchPlaces(trimmed, controller.signal);
      if (controller.signal.aborted) return;
      setResults(found);
      setStatus('done');
    } catch (err) {
      if (controller.signal.aborted) return;
      setResults([]);
      setStatus('error');
      setError(describeError(err));
    }
  }, [query]);

  // Clearing the field resets the view without touching the network.
  useEffect(() => {
    if (query.trim().length === 0) {
      controllerRef.current?.abort();
      setResults([]);
      setStatus('idle');
      setError(null);
    }
  }, [query]);

  // Abort any pending request when leaving the screen.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const choose = useCallback(
    (place: PlaceResult) => {
      selection();
      setManualLocation({
        latitude: place.latitude,
        longitude: place.longitude,
        label: place.label,
        manual: true,
      });
      navigation.goBack();
    },
    [setManualLocation, navigation]
  );

  const useGps = useCallback(async () => {
    await requestLocation();
    // Only dismiss if a fix actually landed; otherwise the error stays visible.
    if (useLocationStore.getState().coords && !useLocationStore.getState().manual) {
      navigation.goBack();
    }
  }, [requestLocation, navigation]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm }]}>
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
          Set location
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <View style={styles.searchRow}>
          <Search size={17} color={palette.textMuted} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for a city or town"
            placeholderTextColor={palette.textFaint}
            style={[styles.searchInput, font('medium')]}
            selectionColor={palette.gold}
            autoCorrect={false}
            autoCapitalize="words"
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => void runSearch()}
            accessibilityLabel="Search for a city"
          />
          {status === 'searching' ? (
            <ActivityIndicator size="small" color={palette.gold} />
          ) : query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={17} color={palette.textMuted} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        <Button
          label="Search"
          onPress={() => void runSearch()}
          loading={status === 'searching'}
          disabled={query.trim().length < 2}
          size="sm"
          fullWidth
          icon={<Search size={15} color={palette.ink} strokeWidth={2.4} />}
          style={styles.searchButton}
        />

        <Button
          label="Use my current location"
          onPress={() => void useGps()}
          loading={gpsStatus === 'requesting'}
          variant="secondary"
          size="sm"
          fullWidth
          icon={<Crosshair size={15} color={palette.text} strokeWidth={2} />}
          style={styles.gpsButton}
        />

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + space.xxl },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card
              style={styles.resultCard}
              onPress={() => choose(item)}
              accessibilityLabel={`Use ${item.label}`}
            >
              <View style={styles.resultRow}>
                <MapPin size={17} color={palette.gold} strokeWidth={1.9} />
                <View style={styles.flex}>
                  <Text variant="body" weight="semibold" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="caption" color={palette.textMuted} numberOfLines={2}>
                    {item.label}
                  </Text>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            status === 'error' ? (
              <ErrorState
                title="Search failed"
                message={error ?? 'Could not reach the place-search service.'}
              />
            ) : status === 'done' ? (
              <EmptyState
                title="Nothing found"
                message={`No place matches "${query.trim()}". Try a larger nearby city.`}
              />
            ) : status === 'idle' ? (
              <View style={styles.hint}>
                <Text variant="bodySm" color={palette.textMuted} align="center">
                  Type a city name, then press Search.
                </Text>
                <Text variant="caption" color={palette.textFaint} align="center">
                  Useful if you declined location access, or want prayer times for
                  somewhere you are travelling to. Search runs on submit rather
                  than as you type, which is what OpenStreetMap's usage policy
                  requires.
                </Text>
              </View>
            ) : null
          }
        />

        <Text variant="caption" color={palette.textFaint} align="center" style={styles.attribution}>
          Place search © OpenStreetMap contributors via Nominatim, ODbL.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.base,
    paddingBottom: space.md,
  },
  headerButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Balances the header row without looking like a tappable button.
  headerSpacer: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },

  body: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    paddingHorizontal: space.base,
    minHeight: MIN_TOUCH + 2,
  },
  searchInput: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    paddingVertical: space.md,
  },
  searchButton: {
    marginTop: space.md,
  },
  gpsButton: {
    marginTop: space.sm,
  },
  list: {
    paddingTop: space.lg,
    gap: space.sm,
  },
  resultCard: {
    paddingVertical: space.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  hint: {
    paddingTop: space.xxl,
    gap: space.sm,
    paddingHorizontal: space.base,
  },
  attribution: {
    paddingVertical: space.md,
  },
});

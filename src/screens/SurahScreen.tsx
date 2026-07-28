import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Minus,
  Pause,
  Play,
  Plus,
  Type,
} from 'lucide-react-native';

import { Text, ArabicText } from '@/components/Text';
import { LoadingState, ErrorState } from '@/components/StateViews';
import { Pill } from '@/components/Controls';

import { useQuranStore, surahCacheKey } from '@/store/useQuranStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { surahAudioUrl } from '@/api/alquran';
import { RECITERS } from '@/data/methods';
import { BASMALA, stripBasmala, toArabicNumerals } from '@/utils/format';
import { selection as hapticSelection, tapLight } from '@/services/haptics';
import { palette, space, radius, HIT_SLOP, MIN_TOUCH } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type SurahRoute = RouteProp<RootStackParamList, 'Surah'>;

const MIN_SCALE = 0.8;
const MAX_SCALE = 1.6;

export function SurahScreen() {
  const route = useRoute<SurahRoute>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { number, scrollToAyah } = route.params;

  const settings = useSettingsStore();
  const listRef = useRef<FlatList>(null);
  const [showTypeControls, setShowTypeControls] = useState(false);

  /*
   * Actions are selected individually rather than pulled off the whole store.
   * Zustand action identities are stable, so they are safe effect dependencies;
   * subscribing to the entire store would make every write — including the
   * reading-position write below — invalidate the effects that caused it.
   */
  const loadSurah = useQuranStore((s) => s.loadSurah);
  const setProgress = useQuranStore((s) => s.setProgress);
  const toggleBookmark = useQuranStore((s) => s.toggleBookmark);
  const bookmarks = useQuranStore((s) => s.bookmarks);

  const cacheKey = surahCacheKey(number, settings.translationEdition);
  const content = useQuranStore((s) => s.contents[cacheKey]);
  const status = useQuranStore((s) => s.contentStatus[cacheKey] ?? 'idle');
  const error = useQuranStore((s) => s.contentError[cacheKey] ?? null);

  useEffect(() => {
    void loadSurah(number, settings.translationEdition);
  }, [number, settings.translationEdition, loadSurah]);

  /* ── Audio ─────────────────────────────────────────────────────── */

  const audioUrl = useMemo(
    () => surahAudioUrl(number, settings.reciter),
    [number, settings.reciter]
  );

  const player = useAudioPlayer({ uri: audioUrl });
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    // Keep playing when the phone is on silent — a recitation the user
    // deliberately started should not be muted by the ringer switch.
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Swapping reciter or surah swaps the stream under the same player.
    player.replace({ uri: audioUrl });
  }, [audioUrl, player]);

  const togglePlayback = useCallback(() => {
    tapLight();
    try {
      if (playerStatus.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      // Player not ready yet; the next tap will work.
    }
  }, [player, playerStatus.playing]);

  /* ── Reading position ──────────────────────────────────────────── */

  const verses = content?.verses ?? [];

  useEffect(() => {
    if (!content || !scrollToAyah) return;
    const index = verses.findIndex((v) => v.numberInSurah === scrollToAyah);
    if (index < 0) return;

    // Wait a frame so the list has measured before scrolling.
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
    }, 350);
    return () => clearTimeout(timer);
  }, [content, scrollToAyah, verses]);

  const pendingIndex = useRef<number | null>(null);

  // FlatList keeps this callback for its lifetime, so it must not be recreated.
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const first = viewableItems[0]?.index;
      if (typeof first !== 'number') return;
      pendingIndex.current = first;
    }
  ).current;

  // Latest content, read from the unmount cleanup without making it a dependency.
  const contentRef = useRef(content);
  contentRef.current = content;

  // Persist the reading position once, on leaving — not on every scroll frame.
  useEffect(() => {
    return () => {
      const index = pendingIndex.current;
      const current = contentRef.current;
      if (index === null || !current) return;

      const verse = current.verses[index];
      if (!verse) return;

      setProgress({
        surah: number,
        ayah: verse.numberInSurah,
        surahName: current.surah.englishName,
      });
    };
  }, [number, setProgress]);

  const adjustScale = useCallback(
    (delta: number) => {
      hapticSelection();
      const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, Math.round((settings.arabicScale + delta) * 10) / 10)
      );
      settings.update({ arabicScale: next });
    },
    [settings]
  );

  if (status === 'loading' && !content) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Header
          title={route.params.name}
          subtitle="Loading…"
          onBack={() => navigation.goBack()}
        />
        <LoadingState message="Fetching the surah…" />
      </View>
    );
  }

  if (status === 'error' && !content) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Header
          title={route.params.name}
          subtitle=""
          onBack={() => navigation.goBack()}
        />
        <ErrorState
          message={error ?? 'Could not load this surah.'}
          onRetry={() => void loadSurah(number, settings.translationEdition, true)}
        />
      </View>
    );
  }

  if (!content) return null;

  const { surah } = content;
  const showBasmala = surah.number !== 1 && surah.number !== 9;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Header
        title={surah.englishName}
        subtitle={`${surah.englishNameTranslation} · ${surah.numberOfAyahs} ayahs`}
        onBack={() => navigation.goBack()}
        onToggleType={() => setShowTypeControls((v) => !v)}
        typeActive={showTypeControls}
      />

      {showTypeControls ? (
        <View style={styles.typeBar}>
          <Text variant="caption" color={palette.textMuted} style={styles.flex}>
            Arabic size · {Math.round(settings.arabicScale * 100)}%
          </Text>
          <Pressable
            onPress={() => adjustScale(-0.1)}
            hitSlop={HIT_SLOP}
            disabled={settings.arabicScale <= MIN_SCALE}
            accessibilityRole="button"
            accessibilityLabel="Decrease Arabic text size"
            style={({ pressed }) => [
              styles.typeButton,
              pressed && styles.pressed,
              settings.arabicScale <= MIN_SCALE && styles.disabled,
            ]}
          >
            <Minus size={16} color={palette.text} strokeWidth={2.4} />
          </Pressable>
          <Pressable
            onPress={() => adjustScale(0.1)}
            hitSlop={HIT_SLOP}
            disabled={settings.arabicScale >= MAX_SCALE}
            accessibilityRole="button"
            accessibilityLabel="Increase Arabic text size"
            style={({ pressed }) => [
              styles.typeButton,
              pressed && styles.pressed,
              settings.arabicScale >= MAX_SCALE && styles.disabled,
            ]}
          >
            <Plus size={16} color={palette.text} strokeWidth={2.4} />
          </Pressable>
          <Pressable
            onPress={() => {
              hapticSelection();
              settings.update({ showTranslation: !settings.showTranslation });
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.showTranslation }}
            accessibilityLabel="Show translation"
            style={({ pressed }) => [
              styles.typeToggle,
              settings.showTranslation && styles.typeToggleOn,
              pressed && styles.pressed,
            ]}
          >
            <Text
              variant="caption"
              weight="semibold"
              color={settings.showTranslation ? palette.ink : palette.textSoft}
            >
              Translation
            </Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={verses}
        keyExtractor={(item) => String(item.numberInSurah)}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={9}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
        // Long surahs have wildly variable row heights; if a programmatic
        // scroll overshoots, retry once the real offsets are known.
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }, 120);
        }}
        ListHeaderComponent={
          <View style={styles.surahHeader}>
            <ArabicText variant="ayah" color={palette.gold} style={styles.centered}>
              {surah.name}
            </ArabicText>
            <View style={styles.metaRow}>
              <Pill
                label={surah.revelationType === 'Meccan' ? 'Makkī' : 'Madanī'}
                tone={surah.revelationType === 'Meccan' ? 'gold' : 'jade'}
              />
              <Pill label={`Surah ${surah.number}`} tone="neutral" />
            </View>
            {showBasmala ? (
              <ArabicText
                variant="dua"
                color={palette.text}
                scale={settings.arabicScale}
                style={styles.basmala}
              >
                {BASMALA}
              </ArabicText>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <VerseBlock
            surahNumber={surah.number}
            surahName={surah.englishName}
            numberInSurah={item.numberInSurah}
            arabic={stripBasmala(item.arabic, surah.number)}
            translation={item.translation}
            sajda={item.sajda}
            scale={settings.arabicScale}
            showTranslation={settings.showTranslation}
            bookmarked={bookmarks.some(
              (b) => b.surah === surah.number && b.ayah === item.numberInSurah
            )}
            onToggleBookmark={() => {
              tapLight();
              toggleBookmark({
                surah: surah.number,
                ayah: item.numberInSurah,
                surahName: surah.englishName,
              });
            }}
          />
        )}
      />

      {/* ── Playback bar ───────────────────────────────────────────── */}
      <View style={[styles.playerBar, { paddingBottom: insets.bottom + space.md }]}>
        <Pressable
          onPress={togglePlayback}
          accessibilityRole="button"
          accessibilityLabel={playerStatus.playing ? 'Pause recitation' : 'Play recitation'}
          accessibilityState={{ busy: playerStatus.isBuffering }}
          style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
        >
          {playerStatus.isBuffering && !playerStatus.playing ? (
            <ActivityIndicator size="small" color={palette.ink} />
          ) : playerStatus.playing ? (
            <Pause size={20} color={palette.ink} fill={palette.ink} />
          ) : (
            <Play size={20} color={palette.ink} fill={palette.ink} />
          )}
        </Pressable>

        <View style={styles.flex}>
          <Text variant="bodySm" weight="semibold" numberOfLines={1}>
            {findReciterName(settings.reciter)}
          </Text>
          <Text variant="caption" color={palette.textMuted} numberOfLines={1}>
            {playerStatus.error
              ? 'Audio unavailable — check your connection'
              : playerStatus.isLoaded
                ? `${formatSeconds(playerStatus.currentTime)} / ${formatSeconds(playerStatus.duration)}`
                : 'Full surah recitation'}
          </Text>
        </View>

        {/* Progress hairline across the bar's top edge. */}
        <View style={styles.progressTrack} pointerEvents="none">
          <View
            style={[
              styles.progressFill,
              {
                width: `${
                  playerStatus.duration > 0
                    ? Math.min(
                        100,
                        (playerStatus.currentTime / playerStatus.duration) * 100
                      )
                    : 0
                }%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const VerseBlock = React.memo(function VerseBlock({
  numberInSurah,
  arabic,
  translation,
  sajda,
  scale,
  showTranslation,
  bookmarked,
  onToggleBookmark,
}: {
  surahNumber: number;
  surahName: string;
  numberInSurah: number;
  arabic: string;
  translation: string;
  sajda: boolean;
  scale: number;
  showTranslation: boolean;
  bookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  return (
    <View style={styles.verse}>
      <View style={styles.verseTop}>
        <View style={styles.ayahBadge}>
          <Text variant="caption" weight="bold" color={palette.gold}>
            {numberInSurah}
          </Text>
        </View>

        {sajda ? <Pill label="Sajda" tone="jade" /> : null}

        <View style={styles.flex} />

        <Pressable
          onPress={onToggleBookmark}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={
            bookmarked ? `Remove bookmark on ayah ${numberInSurah}` : `Bookmark ayah ${numberInSurah}`
          }
          accessibilityState={{ selected: bookmarked }}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {bookmarked ? (
            <BookmarkCheck size={18} color={palette.gold} strokeWidth={2} />
          ) : (
            <Bookmark size={18} color={palette.textFaint} strokeWidth={2} />
          )}
        </Pressable>
      </View>

      <ArabicText variant="ayah" scale={scale} style={styles.ayahText}>
        {arabic}
        <ArabicText variant="ayah" scale={scale * 0.7} color={palette.gold}>
          {` ﴿${toArabicNumerals(numberInSurah)}﴾`}
        </ArabicText>
      </ArabicText>

      {showTranslation && translation ? (
        <Text variant="bodySm" color={palette.textSoft} style={styles.translation}>
          {translation}
        </Text>
      ) : null}
    </View>
  );
});

function Header({
  title,
  subtitle,
  onBack,
  onToggleType,
  typeActive,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  onToggleType?: () => void;
  typeActive?: boolean;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
      >
        <ArrowLeft size={20} color={palette.text} strokeWidth={2} />
      </Pressable>

      <View style={styles.headerText}>
        <Text variant="h3" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color={palette.textMuted} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {onToggleType ? (
        <Pressable
          onPress={onToggleType}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Text settings"
          accessibilityState={{ expanded: typeActive }}
          style={({ pressed }) => [
            styles.headerButton,
            typeActive && styles.headerButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <Type
            size={18}
            color={typeActive ? palette.ink : palette.text}
            strokeWidth={2}
          />
        </Pressable>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

function findReciterName(id: string): string {
  return RECITERS.find((r) => r.id === id)?.name ?? 'Recitation';
}

function formatSeconds(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  centered: { textAlign: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairline,
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
  headerButtonActive: {
    backgroundColor: palette.gold,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },

  typeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
    backgroundColor: palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairline,
  },
  typeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeToggle: {
    paddingHorizontal: space.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeToggleOn: {
    backgroundColor: palette.gold,
  },

  list: {
    paddingHorizontal: space.lg,
  },
  surahHeader: {
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xl,
  },
  metaRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  basmala: {
    textAlign: 'center',
    marginTop: space.md,
  },

  verse: {
    paddingVertical: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairlineFaint,
  },
  verseTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.md,
  },
  ayahBadge: {
    minWidth: 30,
    height: 26,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    backgroundColor: palette.goldGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayahText: {
    textAlign: 'right',
  },
  translation: {
    marginTop: space.md,
    lineHeight: 23,
  },

  playerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairlineStrong,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: palette.hairlineFaint,
  },
  progressFill: {
    height: 2,
    backgroundColor: palette.gold,
  },
});

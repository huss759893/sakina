import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bookmark, History, Search, X } from 'lucide-react-native';

import { Text, ArabicText } from '@/components/Text';
import { Card } from '@/components/Card';
import { Pill, SectionHeader } from '@/components/Controls';
import { LoadingState, ErrorState, EmptyState } from '@/components/StateViews';
import { Screen, useTabBarClearance } from '@/components/Screen';

import { useQuranStore } from '@/store/useQuranStore';
import type { SurahSummary } from '@/api/alquran';
import { padNumber } from '@/utils/format';
import { palette, space, radius, font, HIT_SLOP, MIN_TOUCH } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function QuranScreen() {
  const navigation = useNavigation<Nav>();
  const bottomPad = useTabBarClearance();
  const [query, setQuery] = useState('');

  const { surahs, listStatus, listError, loadList, progress, bookmarks } =
    useQuranStore();

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahs;

    return surahs.filter(
      (s) =>
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        s.name.includes(query.trim()) ||
        String(s.number) === q
    );
  }, [surahs, query]);

  const open = useCallback(
    (surah: SurahSummary, scrollToAyah?: number) => {
      navigation.navigate('Surah', {
        number: surah.number,
        name: surah.englishName,
        scrollToAyah,
      });
    },
    [navigation]
  );

  if (listStatus === 'loading' && surahs.length === 0) {
    return (
      <Screen>
        <LoadingState message="Loading the surah index…" />
      </Screen>
    );
  }

  if (listStatus === 'error' && surahs.length === 0) {
    return (
      <Screen>
        <ErrorState
          title="Could not load the Qur'an index"
          message={listError ?? 'Please try again.'}
          onRetry={() => void loadList(true)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.number)}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // 114 rows of fixed height — give the list the measurements so it can
        // skip layout passes while scrolling.
        initialNumToRender={12}
        windowSize={11}
        removeClippedSubviews
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text variant="h1">Al-Qur'an</Text>
              <ArabicText variant="inline" color={palette.gold}>
                ٱلْقُرْآن
              </ArabicText>
            </View>

            <View style={styles.searchRow}>
              <Search size={17} color={palette.textMuted} strokeWidth={2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or number"
                placeholderTextColor={palette.textFaint}
                style={[styles.searchInput, font('medium')]}
                selectionColor={palette.gold}
                autoCorrect={false}
                accessibilityLabel="Search surahs"
                returnKeyType="search"
              />
              {query.length > 0 ? (
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

            {progress && !query ? (
              <Card
                style={styles.resumeCard}
                onPress={() =>
                  navigation.navigate('Surah', {
                    number: progress.surah,
                    name: progress.surahName,
                    scrollToAyah: progress.ayah,
                  })
                }
                accessibilityLabel={`Continue reading ${progress.surahName} verse ${progress.ayah}`}
              >
                <View style={styles.resumeRow}>
                  <History size={18} color={palette.gold} strokeWidth={1.9} />
                  <View style={styles.flex}>
                    <Text variant="label" color={palette.textMuted}>
                      Continue reading
                    </Text>
                    <Text variant="body" weight="semibold">
                      {progress.surahName} · Ayah {progress.ayah}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {bookmarks.length > 0 && !query ? (
              <View style={styles.bookmarkBlock}>
                <SectionHeader title={`Bookmarks · ${bookmarks.length}`} />
                <View style={styles.bookmarkRow}>
                  {bookmarks.slice(0, 6).map((b) => (
                    <Pressable
                      key={`${b.surah}:${b.ayah}`}
                      onPress={() =>
                        navigation.navigate('Surah', {
                          number: b.surah,
                          name: b.surahName,
                          scrollToAyah: b.ayah,
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${b.surahName} verse ${b.ayah}`}
                      style={({ pressed }) => [
                        styles.bookmarkChip,
                        pressed && styles.chipPressed,
                      ]}
                    >
                      <Bookmark size={12} color={palette.gold} strokeWidth={2.2} />
                      <Text variant="caption" weight="semibold" color={palette.textSoft}>
                        {b.surahName} {b.ayah}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <SectionHeader
              title={query ? `${filtered.length} results` : '114 Surahs'}
              style={styles.listHeader}
            />
          </View>
        }
        renderItem={({ item }) => <SurahRow surah={item} onPress={() => open(item)} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            title="No surah found"
            message={`Nothing matches "${query}". Try an English name, an Arabic name, or a number from 1 to 114.`}
            actionLabel="Clear search"
            onAction={() => setQuery('')}
          />
        }
      />
    </Screen>
  );
}

const SurahRow = React.memo(function SurahRow({
  surah,
  onPress,
}: {
  surah: SurahSummary;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Surah ${surah.number}, ${surah.englishName}, ${surah.englishNameTranslation}, ${surah.numberOfAyahs} verses`}
      style={({ pressed }) => [styles.surahRow, pressed && styles.rowPressed]}
    >
      {/* The khatam silhouette doubles as the surah-number badge. */}
      <View style={styles.numberBadge}>
        <Text variant="caption" weight="bold" color={palette.gold}>
          {padNumber(surah.number, 2)}
        </Text>
      </View>

      <View style={styles.surahText}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {surah.englishName}
        </Text>
        <Text variant="caption" color={palette.textMuted} numberOfLines={1}>
          {surah.englishNameTranslation} · {surah.numberOfAyahs} ayahs
        </Text>
      </View>

      <View style={styles.surahRight}>
        <ArabicText variant="inline" color={palette.text} numberOfLines={1}>
          {surah.name}
        </ArabicText>
        <Pill
          label={surah.revelationType === 'Meccan' ? 'Makkī' : 'Madanī'}
          tone={surah.revelationType === 'Meccan' ? 'gold' : 'jade'}
        />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.base,
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
    marginBottom: space.base,
  },
  searchInput: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    paddingVertical: space.md,
  },
  resumeCard: {
    marginBottom: space.base,
    borderColor: palette.goldDeep,
  },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  bookmarkBlock: {
    marginBottom: space.base,
  },
  bookmarkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  bookmarkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 7,
  },
  chipPressed: {
    backgroundColor: palette.surfaceRaised,
  },
  listHeader: {
    marginTop: space.sm,
  },
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    minHeight: 66,
  },
  rowPressed: {
    opacity: 0.6,
  },
  numberBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: palette.goldGlow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    // 45° rotation turns the square badge into the diamond that reads as half
    // of the khatam star used elsewhere.
    transform: [{ rotate: '45deg' }],
  },
  surahText: {
    flex: 1,
    gap: 2,
    marginLeft: space.xs,
  },
  surahRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairlineFaint,
  },
});

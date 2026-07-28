import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  Crosshair,
  Globe2,
  Search,
  Trash2,
} from 'lucide-react-native';

import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import {
  SectionHeader,
  Segmented,
  ToggleRow,
  Divider,
} from '@/components/Controls';
import { Button } from '@/components/Button';

import { useSettingsStore } from '@/store/useSettingsStore';
import { useLocationStore } from '@/store/useLocationStore';
import { usePrayerStore } from '@/store/usePrayerStore';
import { useQuranStore } from '@/store/useQuranStore';
import { useMosqueStore } from '@/store/useMosqueStore';
import {
  CALCULATION_METHODS,
  SCHOOLS,
  RECITERS,
  TRANSLATIONS,
} from '@/data/methods';
import { setHapticsEnabled } from '@/services/haptics';
import { cancelAllPrayerNotifications } from '@/services/notifications';
import { palette, space, radius, HIT_SLOP, MIN_TOUCH } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [clearing, setClearing] = useState(false);

  const settings = useSettingsStore();
  const location = useLocationStore();
  const prayers = usePrayerStore();
  const quran = useQuranStore();
  const mosques = useMosqueStore();

  const clearCaches = useCallback(() => {
    Alert.alert(
      'Clear cached data?',
      'Removes saved prayer timetables, downloaded surahs and mosque results. Your settings, bookmarks and tasbih counts are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setClearing(true);
            prayers.clear();
            mosques.clear();
            void quran.loadList(true);
            setClearing(false);
          },
        },
      ]
    );
  }, [prayers, mosques, quran]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
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
          Settings
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Location ──────────────────────────────────────────── */}
        <SectionHeader title="Location" />
        <Card>
          <View style={styles.locationRow}>
            <Crosshair size={18} color={palette.gold} strokeWidth={1.9} />
            <View style={styles.flex}>
              <Text variant="body" weight="medium">
                {location.label || 'Not set'}
              </Text>
              <Text variant="caption" color={palette.textMuted}>
                {location.coords
                  ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}${location.manual ? ' · set manually' : ''}`
                  : 'Prayer times, Qibla and mosque search all need this.'}
              </Text>
            </View>
          </View>
          {location.error ? (
            <Text variant="caption" color={palette.amber} style={styles.errorNote}>
              {location.error}
            </Text>
          ) : null}
          <Button
            label={location.coords ? 'Update from GPS' : 'Enable location'}
            onPress={() => void location.requestLocation()}
            loading={location.status === 'requesting'}
            variant="secondary"
            size="sm"
            fullWidth
            style={styles.buttonSpacing}
          />
          <Button
            label="Choose a city manually"
            onPress={() => navigation.navigate('LocationSearch')}
            variant="ghost"
            size="sm"
            fullWidth
            icon={<Search size={15} color={palette.text} strokeWidth={2} />}
            style={styles.buttonSpacing}
          />
        </Card>

        {/* ── Calculation ───────────────────────────────────────── */}
        <SectionHeader title="Prayer calculation" style={styles.sectionSpacing} />
        <Card padded={false}>
          {CALCULATION_METHODS.map((method, index) => (
            <OptionRow
              key={method.id}
              title={method.name}
              subtitle={method.region}
              selected={settings.methodId === method.id}
              onPress={() => settings.update({ methodId: method.id })}
              isLast={index === CALCULATION_METHODS.length - 1}
            />
          ))}
        </Card>

        <SectionHeader title="Asr calculation" style={styles.sectionSpacing} />
        <Segmented
          options={SCHOOLS.map((s) => ({ value: s.id, label: s.name }))}
          value={settings.school}
          onChange={(value) => settings.update({ school: value })}
        />
        <Text variant="caption" color={palette.textMuted} style={styles.hint}>
          {SCHOOLS.find((s) => s.id === settings.school)?.detail}
        </Text>

        {/* ── Display ───────────────────────────────────────────── */}
        <SectionHeader title="Display" style={styles.sectionSpacing} />
        <Card>
          <ToggleRow
            label="24-hour clock"
            description={settings.use24Hour ? 'Times shown as 18:45' : 'Times shown as 6:45 PM'}
            value={settings.use24Hour}
            onValueChange={(v) => settings.update({ use24Hour: v })}
          />
          <Divider />
          <ToggleRow
            label="Haptic feedback"
            description="Vibration on the tasbih counter and Qibla alignment."
            value={settings.hapticsEnabled}
            onValueChange={(v) => {
              setHapticsEnabled(v);
              settings.update({ hapticsEnabled: v });
            }}
          />
          <Divider />
          <ToggleRow
            label="Show transliteration"
            description="Latin transliteration under Arabic du'a text."
            value={settings.showTransliteration}
            onValueChange={(v) => settings.update({ showTransliteration: v })}
          />
        </Card>

        {/* ── Qur'an ────────────────────────────────────────────── */}
        <SectionHeader title="Translation" style={styles.sectionSpacing} />
        <Card padded={false}>
          {TRANSLATIONS.map((translation, index) => (
            <OptionRow
              key={translation.id}
              title={translation.name}
              subtitle={translation.note}
              selected={settings.translationEdition === translation.id}
              onPress={() => settings.update({ translationEdition: translation.id })}
              isLast={index === TRANSLATIONS.length - 1}
            />
          ))}
        </Card>

        <SectionHeader title="Reciter" style={styles.sectionSpacing} />
        <Card padded={false}>
          {RECITERS.map((reciter, index) => (
            <OptionRow
              key={reciter.id}
              title={reciter.name}
              subtitle={reciter.style}
              selected={settings.reciter === reciter.id}
              onPress={() => settings.update({ reciter: reciter.id })}
              isLast={index === RECITERS.length - 1}
            />
          ))}
        </Card>

        {/* ── Data ──────────────────────────────────────────────── */}
        <SectionHeader title="Data" style={styles.sectionSpacing} />
        <Card>
          <Text variant="caption" color={palette.textMuted}>
            Prayer timetables, surah text and mosque results are cached on this
            device so the app keeps working offline.
          </Text>
          <Button
            label="Clear cached data"
            onPress={clearCaches}
            loading={clearing}
            variant="ghost"
            size="sm"
            fullWidth
            icon={<Trash2 size={15} color={palette.text} strokeWidth={2} />}
            style={styles.buttonSpacing}
          />
          <Button
            label="Cancel all reminders"
            onPress={() => void cancelAllPrayerNotifications().then(() =>
              settings.update({ notificationsEnabled: false })
            )}
            variant="ghost"
            size="sm"
            fullWidth
            style={styles.buttonSpacing}
          />
          <Button
            label="Reset all settings"
            onPress={() =>
              Alert.alert('Reset settings?', 'Returns every option to its default.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: () => settings.reset(),
                },
              ])
            }
            variant="danger"
            size="sm"
            fullWidth
            style={styles.buttonSpacing}
          />
        </Card>

        {/* ── Credits ───────────────────────────────────────────── */}
        <SectionHeader title="Sources & licences" style={styles.sectionSpacing} />
        <Card style={styles.credits}>
          <Credit
            source="api.aladhan.com"
            detail="Prayer times and the Hijri calendar. Free, no key required."
          />
          <Credit
            source="api.alquran.cloud"
            detail="Uthmani Qur'anic text, and the Pickthall (1930) and Yusuf Ali (1934) translations — all public domain. Recitations from cdn.islamic.network."
          />
          <Credit
            source="OpenStreetMap · Overpass & Nominatim"
            detail="Mosque locations and place search, © OpenStreetMap contributors, licensed ODbL."
          />
          <Credit
            source="Plus Jakarta Sans · Amiri"
            detail="Typefaces under the SIL Open Font License."
          />
          <Credit
            source="Lucide"
            detail="Icon set under the ISC License."
          />
          <View style={styles.creditFooter}>
            <Globe2 size={14} color={palette.textFaint} strokeWidth={2} />
            <Text variant="caption" color={palette.textFaint} style={styles.flex}>
              Itminan uses no paid APIs, no analytics and no accounts. Your
              coordinates are sent only to the services above to answer a query,
              and everything else stays on this device.
            </Text>
          </View>
        </Card>

        <Text variant="caption" color={palette.textFaint} align="center" style={styles.version}>
          Itminan · اطمئنان · version 1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

function OptionRow({
  title,
  subtitle,
  selected,
  onPress,
  isLast,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  isLast: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [
        styles.optionRow,
        !isLast && styles.optionDivider,
        pressed && styles.optionPressed,
      ]}
    >
      <View style={styles.flex}>
        <Text
          variant="bodySm"
          weight={selected ? 'semibold' : 'medium'}
          color={selected ? palette.gold : palette.text}
        >
          {title}
        </Text>
        <Text variant="caption" color={palette.textMuted}>
          {subtitle}
        </Text>
      </View>
      {selected ? <Check size={17} color={palette.gold} strokeWidth={2.4} /> : null}
    </Pressable>
  );
}

function Credit({ source, detail }: { source: string; detail: string }) {
  return (
    <View style={styles.credit}>
      <Text variant="bodySm" weight="semibold" color={palette.gold}>
        {source}
      </Text>
      <Text variant="caption" color={palette.textMuted} style={styles.creditDetail}>
        {detail}
      </Text>
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

  content: {
    paddingHorizontal: space.lg,
  },
  sectionSpacing: {
    marginTop: space.xl,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  errorNote: {
    marginTop: space.md,
    lineHeight: 17,
  },
  buttonSpacing: {
    marginTop: space.md,
  },
  hint: {
    marginTop: space.sm,
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.base,
    paddingVertical: space.md,
    minHeight: MIN_TOUCH + 10,
  },
  optionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairlineFaint,
  },
  optionPressed: {
    backgroundColor: palette.surfaceRaised,
  },

  credits: {
    gap: space.base,
  },
  credit: {
    gap: 2,
  },
  creditDetail: {
    lineHeight: 17,
  },
  creditFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairlineFaint,
  },
  version: {
    marginTop: space.xl,
  },
});

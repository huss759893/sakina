import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Calculator,
  ChevronRight,
  Hand,
  Landmark,
  Settings as SettingsIcon,
} from 'lucide-react-native';

import { Text, ArabicText } from '@/components/Text';
import { Card } from '@/components/Card';
import { Row, SectionHeader, Divider } from '@/components/Controls';
import { Screen, useTabBarClearance } from '@/components/Screen';
import { KhatamPattern } from '@/components/KhatamPattern';

import { useTasbihStore } from '@/store/useTasbihStore';
import { useQuranStore } from '@/store/useQuranStore';
import { palette, space, radius } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function MoreScreen() {
  const navigation = useNavigation<Nav>();
  const bottomPad = useTabBarClearance();

  const lifetime = useTasbihStore((s) => s.lifetime);
  const bookmarkCount = useQuranStore((s) => s.bookmarks.length);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="h1">More</Text>
          <ArabicText variant="inline" color={palette.gold}>
            سَكِينَة
          </ArabicText>
        </View>

        {/* ── Stats ─────────────────────────────────────────────── */}
        <View style={styles.statsCard}>
          <KhatamPattern tile={72} opacity={0.07} color={palette.gold} />
          <View style={styles.statsInner}>
            <View style={styles.stat}>
              <Text variant="label" color={palette.textMuted}>
                Lifetime dhikr
              </Text>
              <Text variant="h2">{lifetime.toLocaleString()}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text variant="label" color={palette.textMuted}>
                Bookmarks
              </Text>
              <Text variant="h2">{bookmarkCount}</Text>
            </View>
          </View>
        </View>

        {/* ── Tools ─────────────────────────────────────────────── */}
        <SectionHeader title="Tools" style={styles.sectionSpacing} />
        <Card>
          <Row
            label="Tasbih & Du'a"
            icon={<Hand size={19} color={palette.gold} strokeWidth={1.9} />}
            accessory={<ChevronRight size={18} color={palette.textFaint} strokeWidth={2} />}
            onPress={() => navigation.navigate('Dhikr')}
          />
          <Divider />
          <Row
            label="Mosque finder"
            icon={<Landmark size={19} color={palette.jade} strokeWidth={1.9} />}
            accessory={<ChevronRight size={18} color={palette.textFaint} strokeWidth={2} />}
            onPress={() => navigation.navigate('Mosques')}
          />
          <Divider />
          <Row
            label="Zakat calculator"
            icon={<Calculator size={19} color={palette.gold} strokeWidth={1.9} />}
            accessory={<ChevronRight size={18} color={palette.textFaint} strokeWidth={2} />}
            onPress={() => navigation.navigate('Zakat')}
          />
        </Card>

        <SectionHeader title="App" style={styles.sectionSpacing} />
        <Card>
          <Row
            label="Settings"
            icon={<SettingsIcon size={19} color={palette.textSoft} strokeWidth={1.9} />}
            accessory={<ChevronRight size={18} color={palette.textFaint} strokeWidth={2} />}
            onPress={() => navigation.navigate('Settings')}
          />
        </Card>

        <Text variant="caption" color={palette.textFaint} align="center" style={styles.footer}>
          Built entirely on open data and public-domain sources.{'\n'}
          No accounts, no analytics, no paid APIs.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.lg,
  },
  statsCard: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    overflow: 'hidden',
  },
  statsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.lg,
  },
  stat: {
    flex: 1,
    gap: 4,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: palette.hairlineStrong,
    marginHorizontal: space.base,
  },
  sectionSpacing: {
    marginTop: space.xl,
  },
  footer: {
    marginTop: space.xxl,
    lineHeight: 18,
  },
});

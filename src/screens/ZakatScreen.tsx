import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Info, RotateCcw } from 'lucide-react-native';

import { Text, ArabicText } from '@/components/Text';
import { Card } from '@/components/Card';
import { Field, Segmented, SectionHeader, Divider } from '@/components/Controls';
import { KhatamPattern } from '@/components/KhatamPattern';

import { useSettingsStore } from '@/store/useSettingsStore';
import { readJSON, writeJSON, StorageKeys } from '@/utils/storage';
import { formatCurrency, parseNumber, formatNumber } from '@/utils/format';
import {
  calculateZakat,
  EMPTY_ZAKAT_INPUT,
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
  ZAKAT_RATE,
  type ZakatInput,
} from '@/utils/zakat';
import { selection } from '@/services/haptics';
import { palette, space, radius, font, HIT_SLOP, MIN_TOUCH } from '@/theme';

/** Fields are held as strings so a half-typed "12." does not snap to 12. */
type FormState = Record<keyof ZakatInput, string>;

const EMPTY_FORM: FormState = {
  cash: '',
  bank: '',
  receivables: '',
  goldGrams: '',
  goldPricePerGram: '',
  silverGrams: '',
  silverPricePerGram: '',
  businessAssets: '',
  investments: '',
  liabilities: '',
};

const CURRENCIES = ['$', '£', '€', '₹', 'RM', 'AED'];

export function ZakatScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { currencySymbol, nisabStandard, update } = useSettingsStore();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void readJSON<Partial<FormState>>(StorageKeys.zakat, {}).then((stored) => {
      if (!active) return;
      setForm({ ...EMPTY_FORM, ...stored });
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const setField = useCallback(
    (key: keyof ZakatInput, value: string) => {
      setForm((current) => {
        const next = { ...current, [key]: value };
        if (hydrated) void writeJSON(StorageKeys.zakat, next);
        return next;
      });
    },
    [hydrated]
  );

  const input = useMemo<ZakatInput>(() => {
    const parsed = { ...EMPTY_ZAKAT_INPUT };
    (Object.keys(EMPTY_FORM) as (keyof ZakatInput)[]).forEach((key) => {
      parsed[key] = parseNumber(form[key]);
    });
    return parsed;
  }, [form]);

  const result = useMemo(
    () => calculateZakat(input, nisabStandard),
    [input, nisabStandard]
  );

  const money = useCallback(
    (value: number) => formatCurrency(value, currencySymbol),
    [currencySymbol]
  );

  const priceMissing =
    nisabStandard === 'gold'
      ? input.goldPricePerGram <= 0
      : input.silverPricePerGram <= 0;

  const reset = useCallback(() => {
    selection();
    setForm(EMPTY_FORM);
    void writeJSON(StorageKeys.zakat, EMPTY_FORM);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          Zakat
        </Text>
        <Pressable
          onPress={reset}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Clear all fields"
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <RotateCcw size={18} color={palette.text} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.huge },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* ── Result ────────────────────────────────────────────── */}
        <View style={styles.resultCard}>
          <KhatamPattern tile={78} opacity={0.08} color={palette.gold} />
          <View style={styles.resultInner}>
            <Text variant="label" color={palette.textMuted}>
              Zakat due · 2.5%
            </Text>
            <Text style={[styles.resultValue, font('extrabold')]}>
              {money(result.zakatDue)}
            </Text>

            {priceMissing ? (
              <Text variant="bodySm" color={palette.amber}>
                Enter the {nisabStandard} price per gram to establish the nisab.
              </Text>
            ) : result.isEligible ? (
              <Text variant="bodySm" color={palette.jade}>
                Your net zakatable wealth exceeds the nisab.
              </Text>
            ) : (
              <Text variant="bodySm" color={palette.textSoft}>
                Below the nisab by {money(result.shortfall)} — no zakat is due.
              </Text>
            )}

            <View style={styles.resultMeta}>
              <MetaItem label="Net wealth" value={money(result.netWorth)} />
              <MetaItem
                label={`Nisab (${nisabStandard})`}
                value={priceMissing ? '—' : money(result.nisabValue)}
              />
            </View>
          </View>
        </View>

        {/* ── Setup ─────────────────────────────────────────────── */}
        <SectionHeader title="Currency" style={styles.sectionSpacing} />
        <Segmented
          scrollable
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          value={currencySymbol}
          onChange={(value) => {
            selection();
            update({ currencySymbol: value });
          }}
        />

        <SectionHeader title="Nisab standard" style={styles.sectionSpacing} />
        <Segmented
          options={[
            { value: 'silver' as const, label: `Silver · ${NISAB_SILVER_GRAMS}g` },
            { value: 'gold' as const, label: `Gold · ${NISAB_GOLD_GRAMS}g` },
          ]}
          value={nisabStandard}
          onChange={(value) => {
            selection();
            update({ nisabStandard: value });
          }}
        />
        <Card style={styles.noteCard}>
          <View style={styles.noteRow}>
            <Info size={15} color={palette.textMuted} strokeWidth={2} />
            <Text variant="caption" color={palette.textMuted} style={styles.flex}>
              The silver nisab is the lower threshold, so it obliges zakat on
              smaller holdings — the majority position, and the more cautious
              choice in favour of the poor.
            </Text>
          </View>
        </Card>

        {/* ── Assets ────────────────────────────────────────────── */}
        <SectionHeader title="Cash & liquid assets" style={styles.sectionSpacing} />
        <Card style={styles.fieldGroup}>
          <Field
            label="Cash in hand"
            value={form.cash}
            onChangeText={(v) => setField('cash', v)}
            prefix={currencySymbol}
          />
          <Field
            label="Bank balances"
            value={form.bank}
            onChangeText={(v) => setField('bank', v)}
            prefix={currencySymbol}
          />
          <Field
            label="Money owed to you"
            value={form.receivables}
            onChangeText={(v) => setField('receivables', v)}
            prefix={currencySymbol}
            helper="Loans you expect to be repaid"
          />
        </Card>

        <SectionHeader title="Gold & silver" style={styles.sectionSpacing} />
        <Card style={styles.fieldGroup}>
          <View style={styles.pairRow}>
            <View style={styles.flex}>
              <Field
                label="Gold"
                value={form.goldGrams}
                onChangeText={(v) => setField('goldGrams', v)}
                suffix="g"
              />
            </View>
            <View style={styles.flex}>
              <Field
                label="Price per gram"
                value={form.goldPricePerGram}
                onChangeText={(v) => setField('goldPricePerGram', v)}
                prefix={currencySymbol}
              />
            </View>
          </View>
          {result.goldValue > 0 ? (
            <Text variant="caption" color={palette.gold}>
              Gold value: {money(result.goldValue)}
            </Text>
          ) : null}

          <Divider />

          <View style={styles.pairRow}>
            <View style={styles.flex}>
              <Field
                label="Silver"
                value={form.silverGrams}
                onChangeText={(v) => setField('silverGrams', v)}
                suffix="g"
              />
            </View>
            <View style={styles.flex}>
              <Field
                label="Price per gram"
                value={form.silverPricePerGram}
                onChangeText={(v) => setField('silverPricePerGram', v)}
                prefix={currencySymbol}
              />
            </View>
          </View>
          {result.silverValue > 0 ? (
            <Text variant="caption" color={palette.gold}>
              Silver value: {money(result.silverValue)}
            </Text>
          ) : null}

          <Text variant="caption" color={palette.textFaint} style={styles.priceNote}>
            Prices are entered manually rather than fetched: every reliable spot-price
            feed requires a paid key, and a stale built-in rate would quietly produce
            the wrong obligation.
          </Text>
        </Card>

        <SectionHeader title="Business & investments" style={styles.sectionSpacing} />
        <Card style={styles.fieldGroup}>
          <Field
            label="Trade goods & inventory"
            value={form.businessAssets}
            onChangeText={(v) => setField('businessAssets', v)}
            prefix={currencySymbol}
            helper="Stock held for resale, at market value"
          />
          <Field
            label="Shares, funds & other investments"
            value={form.investments}
            onChangeText={(v) => setField('investments', v)}
            prefix={currencySymbol}
          />
        </Card>

        <SectionHeader title="Deductions" style={styles.sectionSpacing} />
        <Card style={styles.fieldGroup}>
          <Field
            label="Debts & bills due"
            value={form.liabilities}
            onChangeText={(v) => setField('liabilities', v)}
            prefix={currencySymbol}
            helper="Short-term liabilities payable now"
          />
        </Card>

        {/* ── Breakdown ─────────────────────────────────────────── */}
        <SectionHeader title="Breakdown" style={styles.sectionSpacing} />
        <Card>
          <SummaryRow label="Total zakatable assets" value={money(result.totalAssets)} />
          <SummaryRow label="Less liabilities" value={`− ${money(result.liabilities)}`} />
          <Divider />
          <SummaryRow label="Net wealth" value={money(result.netWorth)} emphasis />
          <SummaryRow
            label={`Nisab · ${formatNumber(result.nisabGrams, 2)}g ${nisabStandard}`}
            value={priceMissing ? 'Price needed' : money(result.nisabValue)}
          />
          <Divider />
          <SummaryRow
            label={`Zakat at ${(ZAKAT_RATE * 100).toFixed(1)}%`}
            value={money(result.zakatDue)}
            emphasis
            accent
          />
        </Card>

        <View style={styles.footer}>
          <ArabicText variant="inline" color={palette.gold} style={styles.centered}>
            وَآتُوا الزَّكَاةَ
          </ArabicText>
          <Text variant="caption" color={palette.textFaint} align="center">
            "And give zakat." — Qur'an 2:43
          </Text>
          <Text variant="caption" color={palette.textFaint} align="center" style={styles.disclaimer}>
            This calculator implements the standard 2.5% on net zakatable wealth held
            for a lunar year. Rulings differ on some assets — pensions, mortgages and
            unharvested crops among them. Consult a qualified scholar for your case.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text variant="caption" color={palette.textMuted}>
        {label}
      </Text>
      <Text variant="bodySm" weight="semibold">
        {value}
      </Text>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  emphasis = false,
  accent = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text
        variant={emphasis ? 'body' : 'bodySm'}
        weight={emphasis ? 'semibold' : 'regular'}
        color={emphasis ? palette.text : palette.textMuted}
        style={styles.flex}
      >
        {label}
      </Text>
      <Text
        variant={emphasis ? 'body' : 'bodySm'}
        weight={emphasis ? 'bold' : 'medium'}
        color={accent ? palette.gold : palette.text}
      >
        {value}
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
  centered: { textAlign: 'center' },

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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },

  content: {
    paddingHorizontal: space.lg,
  },

  resultCard: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.goldDeep,
    overflow: 'hidden',
  },
  resultInner: {
    padding: space.lg,
    gap: 4,
  },
  resultValue: {
    fontSize: 42,
    lineHeight: 50,
    color: palette.gold,
    letterSpacing: -1.5,
    marginVertical: 2,
  },
  resultMeta: {
    flexDirection: 'row',
    gap: space.xl,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  metaItem: {
    gap: 2,
  },

  sectionSpacing: {
    marginTop: space.xl,
  },
  noteCard: {
    marginTop: space.md,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  fieldGroup: {
    gap: space.base,
  },
  pairRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  priceNote: {
    lineHeight: 17,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },

  footer: {
    marginTop: space.xxl,
    gap: space.sm,
  },
  disclaimer: {
    marginTop: space.sm,
    lineHeight: 17,
  },
});

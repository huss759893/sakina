import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { font, palette, radius, space, MIN_TOUCH, HIT_SLOP } from '@/theme';

/** Small shared controls: eyebrow headers, pills, segmented control, fields. */

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text variant="label" color={palette.textMuted}>
        {title}
      </Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          {({ pressed }) => (
            <Text
              variant="caption"
              weight="semibold"
              color={pressed ? palette.goldBright : palette.gold}
            >
              {action.label}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

interface PillProps {
  label: string;
  tone?: 'neutral' | 'gold' | 'jade' | 'rose';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Pill({ label, tone = 'neutral', icon, style }: PillProps) {
  const tones = {
    neutral: { bg: palette.surfaceRaised, fg: palette.textSoft },
    gold: { bg: palette.goldGlow, fg: palette.gold },
    jade: { bg: palette.jadeGlow, fg: palette.jade },
    rose: { bg: palette.roseGlow, fg: palette.rose },
  } as const;

  const { bg, fg } = tones[tone];

  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      {icon}
      <Text variant="caption" weight="semibold" color={fg}>
        {label}
      </Text>
    </View>
  );
}

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Lets long option sets scroll instead of squeezing. */
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  scrollable = false,
  style,
}: SegmentedProps<T>) {
  const items = options.map((option) => {
    const active = option.value === value;
    return (
      <Pressable
        key={String(option.value)}
        onPress={() => onChange(option.value)}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        accessibilityLabel={option.label}
        style={({ pressed }) => [
          styles.segment,
          // Sizing before state: segmentScrollable carries a surface colour,
          // so applying it last would paint over the active pill's gold.
          scrollable && styles.segmentScrollable,
          active && styles.segmentActive,
          pressed && !active && styles.segmentPressed,
        ]}
      >
        <Text
          variant="bodySm"
          weight={active ? 'semibold' : 'medium'}
          color={active ? palette.ink : palette.textSoft}
          numberOfLines={1}
        >
          {option.label}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.segmentedScroll, style]}
      >
        {items}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.segmented, style]} accessibilityRole="radiogroup">
      {items}
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric';
  helper?: string;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder = '0',
  prefix,
  suffix,
  keyboardType = 'decimal-pad',
  helper,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text variant="caption" weight="medium" color={palette.textMuted}>
        {label}
      </Text>
      <View style={styles.fieldRow}>
        {prefix ? (
          <Text variant="body" color={palette.textMuted}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.textFaint}
          keyboardType={keyboardType}
          inputMode={keyboardType === 'default' ? 'text' : 'decimal'}
          style={[styles.input, font('semibold')]}
          selectionColor={palette.gold}
          accessibilityLabel={label}
        />
        {suffix ? (
          <Text variant="bodySm" color={palette.textMuted}>
            {suffix}
          </Text>
        ) : null}
      </View>
      {helper ? (
        <Text variant="caption" color={palette.textFaint}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: ToggleRowProps) {
  return (
    <View style={[styles.toggleRow, disabled && styles.disabled]}>
      <View style={styles.toggleText}>
        <Text variant="body" weight="medium">
          {label}
        </Text>
        {description ? (
          <Text variant="caption" color={palette.textMuted}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: palette.surfaceHigh, true: palette.goldDeep }}
        thumbColor={value ? palette.goldBright : palette.textMuted}
        ios_backgroundColor={palette.surfaceHigh}
        accessibilityLabel={label}
      />
    </View>
  );
}

interface RowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  accessory?: React.ReactNode;
  destructive?: boolean;
}

export function Row({
  label,
  value,
  onPress,
  icon,
  accessory,
  destructive = false,
}: RowProps) {
  const content = (
    <View style={styles.row}>
      {icon ? <View style={styles.rowIcon}>{icon}</View> : null}
      <Text
        variant="body"
        weight="medium"
        color={destructive ? palette.rose : palette.text}
        style={styles.rowLabel}
      >
        {label}
      </Text>
      {value ? (
        <Text variant="bodySm" color={palette.textMuted} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {accessory}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => pressed && styles.rowPressed}
    >
      {content}
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
    minHeight: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  segmentedScroll: {
    gap: space.sm,
    paddingVertical: 2,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
  },
  segmentScrollable: {
    // Not `flex: 0`: that leaves flexBasis at 0, collapsing the pill to its
    // horizontal padding and hiding short labels like "$" entirely. A
    // scrolling item has to size to its own content.
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  segmentActive: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  segmentPressed: {
    backgroundColor: palette.surfaceHigh,
  },
  field: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    paddingHorizontal: space.base,
    minHeight: MIN_TOUCH + 4,
  },
  input: {
    flex: 1,
    color: palette.text,
    fontSize: 17,
    paddingVertical: space.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.base,
    minHeight: MIN_TOUCH + 8,
    paddingVertical: space.sm,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: MIN_TOUCH + 4,
    paddingVertical: space.sm,
  },
  rowIcon: {
    width: 28,
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
  },
  rowPressed: {
    opacity: 0.6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairline,
    marginVertical: space.xs,
  },
});

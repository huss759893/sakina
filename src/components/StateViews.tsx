import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CloudOff, Inbox, MapPinOff, Search } from 'lucide-react-native';
import { Text } from './Text';
import { Button } from './Button';
import { palette, radius, space } from '@/theme';

/**
 * Shared loading / error / empty presentations. Having one of each keeps the
 * failure paths as considered as the happy path, which is where most apps let
 * their polish slip.
 */

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={palette.gold} />
      <Text variant="bodySm" color={palette.textMuted} align="center">
        {message}
      </Text>
    </View>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconWell, { backgroundColor: palette.roseGlow }]}>
        <CloudOff size={26} color={palette.rose} strokeWidth={1.7} />
      </View>
      <Text variant="h3" align="center">
        {title}
      </Text>
      <Text variant="bodySm" color={palette.textMuted} align="center" style={styles.body}>
        {message}
      </Text>
      {onRetry ? (
        <Button label={retryLabel} onPress={onRetry} variant="secondary" size="sm" />
      ) : null}
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWell}>
        <Inbox size={26} color={palette.textMuted} strokeWidth={1.7} />
      </View>
      <Text variant="h3" align="center">
        {title}
      </Text>
      <Text variant="bodySm" color={palette.textMuted} align="center" style={styles.body}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" />
      ) : null}
    </View>
  );
}

interface LocationPromptProps {
  message: string;
  onRequest: () => void;
  busy?: boolean;
  label?: string;
  /** Manual city picker — the way out when permission is refused outright. */
  onSetManually?: () => void;
  /** Surfaced when a permission request has already been declined. */
  error?: string | null;
}

/** Shown wherever a feature needs coordinates and does not have them yet. */
export function LocationPrompt({
  message,
  onRequest,
  busy = false,
  label = 'Enable location',
  onSetManually,
  error,
}: LocationPromptProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconWell, { backgroundColor: palette.goldGlow }]}>
        <MapPinOff size={26} color={palette.gold} strokeWidth={1.7} />
      </View>
      <Text variant="h3" align="center">
        Location needed
      </Text>
      <Text variant="bodySm" color={palette.textMuted} align="center" style={styles.body}>
        {message}
      </Text>

      {error ? (
        <Text variant="caption" color={palette.amber} align="center" style={styles.errorLine}>
          {error}
        </Text>
      ) : null}

      <Button label={label} onPress={onRequest} loading={busy} size="sm" />

      {onSetManually ? (
        <Button
          label="Choose a city instead"
          onPress={onSetManually}
          variant="ghost"
          size="sm"
          icon={<Search size={15} color={palette.text} strokeWidth={2} />}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.xxxl,
    gap: space.md,
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  body: {
    maxWidth: 320,
    marginBottom: space.sm,
  },
  errorLine: {
    maxWidth: 320,
    lineHeight: 17,
    marginBottom: space.xs,
  },
});

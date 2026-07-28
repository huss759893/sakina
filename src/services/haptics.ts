import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics wrapper. Every call is fire-and-forget and swallows its own errors:
 * the taptic engine is absent on many Android devices and on all simulators,
 * and a counter that throws on tap would be worse than one that stays silent.
 */

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export function tapLight(): void {
  if (!enabled || !supported) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function tapMedium(): void {
  if (!enabled || !supported) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function tapHeavy(): void {
  if (!enabled || !supported) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

export function notifySuccess(): void {
  if (!enabled || !supported) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {}
  );
}

export function notifyWarning(): void {
  if (!enabled || !supported) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
    () => {}
  );
}

export function selection(): void {
  if (!enabled || !supported) return;
  void Haptics.selectionAsync().catch(() => {});
}

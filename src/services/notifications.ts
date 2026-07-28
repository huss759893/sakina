import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PrayerEvent } from '@/utils/time';

/**
 * Local adhan reminders.
 *
 * These are local notifications, not push — no server, no credentials. The app
 * deliberately ships no adhan recording: every well-known one is a specific
 * muezzin's copyrighted performance. The notification uses the system alert
 * sound and names the prayer instead.
 */

export const ADHAN_CHANNEL_ID = 'adhan';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ADHAN_CHANNEL_ID, {
      name: 'Prayer reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8C48A',
      sound: 'default',
    });
  } catch {
    // Channel creation is best-effort.
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    /*
     * No simulator guard here on purpose. iOS simulators have supported
     * *local* notifications since Xcode 11.4 — it is only remote push that
     * needs real hardware, and this app never registers for push. Rejecting
     * simulators would make the reminders toggle look broken during testing
     * for no reason.
     */
    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function cancelAllPrayerNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing scheduled, or the module is unavailable.
  }
}

const BODY: Record<string, string> = {
  Fajr: 'It is time for Fajr. الصلاة خير من النوم',
  Dhuhr: 'It is time for Dhuhr.',
  Asr: 'It is time for Asr.',
  Maghrib: 'It is time for Maghrib.',
  Isha: 'It is time for Isha.',
};

export interface ScheduleResult {
  scheduled: number;
  granted: boolean;
}

/**
 * Replaces all pending reminders with the upcoming prayers from `days`.
 *
 * iOS caps an app at 64 pending local notifications, so we schedule strictly
 * forward in time and stop well inside that limit.
 */
export async function schedulePrayerNotifications(
  days: { date: Date; timeline: PrayerEvent[] }[],
  leadMinutes: number,
  maxNotifications = 40
): Promise<ScheduleResult> {
  const granted = await requestNotificationPermission();
  if (!granted) return { scheduled: 0, granted: false };

  await cancelAllPrayerNotifications();

  const now = Date.now();
  let scheduled = 0;

  for (const day of days) {
    for (const event of day.timeline) {
      if (!event.isFard) continue;
      if (scheduled >= maxNotifications) return { scheduled, granted: true };

      const fireAt = new Date(event.date.getTime() - leadMinutes * 60 * 1000);
      if (fireAt.getTime() <= now + 30_000) continue;

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title:
              leadMinutes > 0
                ? `${event.label} in ${leadMinutes} minutes`
                : `${event.label} — ${event.arabic}`,
            body: BODY[event.key] ?? `It is time for ${event.label}.`,
            sound: 'default',
            ...(Platform.OS === 'android' ? { channelId: ADHAN_CHANNEL_ID } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
            ...(Platform.OS === 'android'
              ? { channelId: ADHAN_CHANNEL_ID }
              : {}),
          },
        });
        scheduled++;
      } catch {
        // One failed schedule should not abort the rest.
      }
    }
  }

  return { scheduled, granted: true };
}

export async function getScheduledCount(): Promise<number> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.length;
  } catch {
    return 0;
  }
}

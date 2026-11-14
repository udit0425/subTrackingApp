import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { daysBetween, upcomingRenewals } from './billing';
import { formatMoney } from './currency';
import type { Subscription } from './types';

export const CHANNEL_ID = 'renewals';
const REMINDER_HOUR = 9;
const OCCURRENCES_PER_SUB = 3;
/** iOS keeps at most 64 pending local notifications. */
const MAX_SCHEDULED = 60;

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export async function setupNotifications(): Promise<void> {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    // Needed before the Android 13+ permission prompt can appear.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Renewal reminders',
      importance: AndroidImportance.HIGH,
    });
  }
}

export async function hasPermission(): Promise<boolean> {
  if (!supported) return false;
  const status = await Notifications.getPermissionsAsync();
  return status.granted || status.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

/** Ask for permission if not yet decided. Returns whether reminders can be delivered. */
export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

function buildReminders(subs: Subscription[], now: Date) {
  const items: { date: Date; sub: Subscription; renewal: Date }[] = [];
  for (const sub of subs) {
    if (sub.reminderDaysBefore == null) continue;
    for (const renewal of upcomingRenewals(sub, OCCURRENCES_PER_SUB, now)) {
      const date = new Date(
        renewal.getFullYear(),
        renewal.getMonth(),
        renewal.getDate() - sub.reminderDaysBefore,
        REMINDER_HOUR,
      );
      if (date > now) items.push({ date, sub, renewal });
    }
  }
  return items.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_SCHEDULED);
}

let queue: Promise<void> = Promise.resolve();

/**
 * Rebuild every scheduled reminder from the current subscriptions. The app
 * owns all of its local notifications, so cancelling all of them first is safe
 * and keeps the schedule consistent after edits and deletes.
 */
export function syncReminders(subs: Subscription[]): Promise<void> {
  queue = queue
    .then(async () => {
      if (!(await hasPermission())) return;
      await Notifications.cancelAllScheduledNotificationsAsync();
      const now = new Date();
      for (const { date, sub, renewal } of buildReminders(subs, now)) {
        const days = daysBetween(date, renewal);
        const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${sub.name} renews ${when}`,
            body: `${formatMoney(sub.amount, sub.currency)} will be charged on ${renewal.toLocaleDateString()}.`,
            data: { subscriptionId: sub.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: CHANNEL_ID,
          },
        });
      }
    })
    .catch((e) => console.warn('Failed to sync reminders', e));
  return queue;
}

export async function sendTestNotification(): Promise<boolean> {
  if (!(await ensurePermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'SubTracker', body: 'Reminders are working.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: CHANNEL_ID },
  });
  return true;
}

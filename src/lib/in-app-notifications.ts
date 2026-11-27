export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  href?: string;
  read: boolean;
}

export const IN_APP_NOTIFICATIONS_KEY = 'genuis:in-app-notifications';
export const IN_APP_NOTIFICATIONS_EVENT = 'genuis:in-app-notifications-updated';

export function readInAppNotifications(): InAppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(IN_APP_NOTIFICATIONS_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is InAppNotification =>
      !!item && typeof item.id === 'string' && typeof item.title === 'string' &&
      typeof item.body === 'string' && typeof item.createdAt === 'string' &&
      typeof item.read === 'boolean',
    );
  } catch {
    return [];
  }
}

function writeNotifications(notifications: InAppNotification[]) {
  try {
    window.localStorage.setItem(IN_APP_NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 40)));
    window.dispatchEvent(new Event(IN_APP_NOTIFICATIONS_EVENT));
  } catch {
    // In-app notifications are best-effort when browser storage is unavailable.
  }
}

export function addInAppNotification(notification: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>) {
  if (typeof window === 'undefined') return;
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writeNotifications([{ ...notification, id, createdAt: new Date().toISOString(), read: false }, ...readInAppNotifications()]);
}

export function markInAppNotificationRead(id: string) {
  if (typeof window === 'undefined') return;
  writeNotifications(readInAppNotifications().map((notification) => notification.id === id ? { ...notification, read: true } : notification));
}

export function markAllInAppNotificationsRead() {
  if (typeof window === 'undefined') return;
  writeNotifications(readInAppNotifications().map((notification) => ({ ...notification, read: true })));
}

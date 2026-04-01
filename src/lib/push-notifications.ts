import { Capacitor } from '@capacitor/core';

const pushTokenStorageKey = 'zentrum_reserved_push_token';

export function isAndroidPushSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function getStoredPushToken(): string | null {
  return window.localStorage.getItem(pushTokenStorageKey);
}

export function setStoredPushToken(token: string): void {
  window.localStorage.setItem(pushTokenStorageKey, token);
}

export function clearStoredPushToken(): void {
  window.localStorage.removeItem(pushTokenStorageKey);
}

export function extractTaskRouteFromPushPayload(payload: unknown): string | null {
  const route = getPayloadValue(payload, 'route');

  if (typeof route === 'string' && route.trim() !== '') {
    return route.startsWith('/') ? route : `/${route}`;
  }

  const taskId = getPayloadValue(payload, 'task_id');

  if (typeof taskId === 'string' && taskId.trim() !== '') {
    return `/reserved/tasks?task=${encodeURIComponent(taskId)}`;
  }

  if (typeof taskId === 'number' && Number.isFinite(taskId)) {
    return `/reserved/tasks?task=${taskId}`;
  }

  return null;
}

function getPayloadValue(payload: unknown, key: string): unknown {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (key in record) {
    return record[key];
  }

  if ('notification' in record && record.notification && typeof record.notification === 'object') {
    const notification = record.notification as Record<string, unknown>;

    if ('data' in notification && notification.data && typeof notification.data === 'object') {
      const notificationData = notification.data as Record<string, unknown>;

      if (key in notificationData) {
        return notificationData[key];
      }
    }
  }

  if ('data' in record && record.data && typeof record.data === 'object') {
    const data = record.data as Record<string, unknown>;

    if (key in data) {
      return data[key];
    }
  }

  return null;
}

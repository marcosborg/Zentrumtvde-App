import { registerPlugin } from '@capacitor/core';
import { isAndroidPushSupported } from './push-notifications';

export type IncomingCallPayload = {
  state: 'idle' | 'offhook' | 'ringing';
  phoneNumber?: string;
  receivedAt?: number;
};

type PermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';

type IncomingCallPermissionStatus = {
  readPhoneState: PermissionState;
  readCallLog: PermissionState;
};

type IncomingCallPlugin = {
  checkPermissions(): Promise<IncomingCallPermissionStatus>;
  requestPermissions(): Promise<IncomingCallPermissionStatus>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  getPendingLaunchPayload(): Promise<Partial<IncomingCallPayload> & { route?: string }>;
  addListener(
    eventName: 'incomingCall',
    listenerFunc: (payload: IncomingCallPayload) => void,
  ): Promise<{ remove: () => Promise<void> }>;
  addListener(
    eventName: 'incomingCallTap',
    listenerFunc: (payload: IncomingCallPayload & { route?: string }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
};

export const IncomingCall = registerPlugin<IncomingCallPlugin>('IncomingCall');

export function isIncomingCallSupported(): boolean {
  return isAndroidPushSupported();
}

export function normalizePhoneNumber(value: string | null | undefined): string {
  return (value ?? '').replace(/\D+/g, '');
}

export function phonesLikelyMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalizedLeft = normalizePhoneNumber(left);
  const normalizedRight = normalizePhoneNumber(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  return normalizedLeft.slice(-9) === normalizedRight.slice(-9);
}

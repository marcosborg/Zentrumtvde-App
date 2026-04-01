import { PushNotifications } from '@capacitor/push-notifications';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  registerAppDevice,
  unregisterAppDevice,
} from '../lib/frontpage-api';
import {
  clearStoredPushToken,
  extractTaskRouteFromPushPayload,
  getStoredPushToken,
  isAndroidPushSupported,
  setStoredPushToken,
} from '../lib/push-notifications';

const PushNotificationBridge: React.FC = () => {
  const history = useHistory();
  const { token } = useAuth();

  useEffect(() => {
    if (!isAndroidPushSupported()) {
      return undefined;
    }

    let cancelled = false;

    const registerCurrentToken = async (pushToken: string): Promise<void> => {
      if (!token || pushToken.trim() === '') {
        return;
      }

      try {
        await registerAppDevice(token, {
          token: pushToken,
          platform: 'android',
          device_name: navigator.userAgent.slice(0, 255),
        });
      } catch {
        // Keep app usable even if push registration fails.
      }
    };

    const setupPush = async (): Promise<void> => {
      await PushNotifications.createChannel({
        id: 'new-contacts',
        name: 'Novos contactos',
        description: 'Alertas de novos contactos e tasks urgentes.',
        importance: 5,
        sound: 'default',
        visibility: 1,
      }).catch(() => undefined);

      const savedToken = getStoredPushToken();

      if (token && savedToken) {
        await registerCurrentToken(savedToken);
      }

      const permissionStatus = await PushNotifications.checkPermissions();
      const receivePermission = permissionStatus.receive === 'prompt'
        ? await PushNotifications.requestPermissions()
        : permissionStatus;

      if (receivePermission.receive !== 'granted') {
        return;
      }

      await PushNotifications.register();
    };

    const registrationListener = PushNotifications.addListener('registration', ({ value }) => {
      if (cancelled || !value) {
        return;
      }

      setStoredPushToken(value);
      void registerCurrentToken(value);
    });

    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const route = extractTaskRouteFromPushPayload(event);

      if (route) {
        history.push(route);
      }
    });

    void setupPush();

    return () => {
      cancelled = true;
      void registrationListener.then((listener) => listener.remove());
      void actionListener.then((listener) => listener.remove());
    };
  }, [history, token]);

  useEffect(() => {
    if (!token || !isAndroidPushSupported()) {
      return undefined;
    }

    return () => {
      const pushToken = getStoredPushToken();

      if (!pushToken) {
        return;
      }

      void unregisterAppDevice(token, pushToken).catch(() => undefined);
      clearStoredPushToken();
    };
  }, [token]);

  return null;
};

export default PushNotificationBridge;

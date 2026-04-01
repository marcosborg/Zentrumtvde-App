import { useEffect, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { searchKanbanTasks } from '../lib/frontpage-api';
import {
  IncomingCall,
  isIncomingCallSupported,
  normalizePhoneNumber,
  phonesLikelyMatch,
  type IncomingCallPayload,
} from '../lib/incoming-call';

const IncomingCallBridge: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { token, isAuthenticated } = useAuth();
  const lastHandledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isIncomingCallSupported() || !token || !isAuthenticated) {
      return undefined;
    }

    let cancelled = false;

    const routeToMatchingTask = async (phoneNumber: string | null | undefined): Promise<void> => {
      const rawPhoneNumber = phoneNumber?.trim() ?? '';
      const normalizedPhone = normalizePhoneNumber(rawPhoneNumber);

      if (!normalizedPhone) {
        return;
      }

      const searchTerms = Array.from(
        new Set([
          rawPhoneNumber,
          normalizedPhone,
          normalizedPhone.length > 9 ? normalizedPhone.slice(-9) : '',
        ].filter((term) => term.trim() !== '')),
      );

      for (const searchTerm of searchTerms) {
        const searchPayload = await searchKanbanTasks(token, searchTerm);

        const exactMatch = searchPayload.results.find((task) => phonesLikelyMatch(task.phone, normalizedPhone) && !task.is_deleted)
          ?? searchPayload.results.find((task) => phonesLikelyMatch(task.phone, normalizedPhone))
          ?? searchPayload.results.find((task) => !task.is_deleted)
          ?? searchPayload.results[0];

        if (!exactMatch) {
          continue;
        }

        const nextRoute = `/reserved/tasks?task=${exactMatch.id}`;

        if (location.pathname === '/reserved/tasks' && location.search === `?task=${exactMatch.id}`) {
          return;
        }

        history.push(nextRoute);
        return;
      }
    };

    const ensurePermissions = async (): Promise<boolean> => {
      const currentPermissions = await IncomingCall.checkPermissions();
      const nextPermissions = currentPermissions.readPhoneState === 'granted' && currentPermissions.readCallLog === 'granted'
        ? currentPermissions
        : await IncomingCall.requestPermissions();

      return nextPermissions.readPhoneState === 'granted' && nextPermissions.readCallLog === 'granted';
    };

    const openMatchingTask = async (payload: IncomingCallPayload): Promise<void> => {
      if (payload.state !== 'ringing' || cancelled) {
        return;
      }

      const normalizedPhone = normalizePhoneNumber(payload.phoneNumber);
      const dedupeKey = `${normalizedPhone}:${Math.floor((payload.receivedAt ?? Date.now()) / 15000)}`;

      if (lastHandledKeyRef.current === dedupeKey) {
        return;
      }

      lastHandledKeyRef.current = dedupeKey;

      try {
        await routeToMatchingTask(payload.phoneNumber);
      } catch {
        // Keep the app stable even if call/task matching fails.
      }
    };

    const setupIncomingCallBridge = async (): Promise<void> => {
      const granted = await ensurePermissions();

      if (!granted || cancelled) {
        return;
      }

      await IncomingCall.startListening();

      const pendingPayload = await IncomingCall.getPendingLaunchPayload();

      if (pendingPayload.phoneNumber) {
        await routeToMatchingTask(pendingPayload.phoneNumber);
      }
    };

    const listenerPromise = IncomingCall.addListener('incomingCall', (payload) => {
      void openMatchingTask(payload);
    });

    const tapListenerPromise = IncomingCall.addListener('incomingCallTap', (payload) => {
      void routeToMatchingTask(payload.phoneNumber);
    });

    void setupIncomingCallBridge();

    return () => {
      cancelled = true;
      void IncomingCall.stopListening().catch(() => undefined);
      void listenerPromise.then((listener) => listener.remove());
      void tapListenerPromise.then((listener) => listener.remove());
    };
  }, [history, isAuthenticated, location.pathname, location.search, token]);

  return null;
};

export default IncomingCallBridge;

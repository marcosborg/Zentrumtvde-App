const pendingReservedRouteStorageKey = 'reserved_pending_route';
const pendingIncomingCallPhoneStorageKey = 'reserved_pending_incoming_call_phone';

export function storePendingReservedRoute(route: string): void {
  if (route.trim() === '') {
    return;
  }

  window.localStorage.setItem(pendingReservedRouteStorageKey, route);
}

export function consumePendingReservedRoute(): string | null {
  const route = window.localStorage.getItem(pendingReservedRouteStorageKey);

  if (!route) {
    return null;
  }

  window.localStorage.removeItem(pendingReservedRouteStorageKey);

  return route;
}

export function storePendingIncomingCallPhone(phone: string): void {
  if (phone.trim() === '') {
    return;
  }

  window.localStorage.setItem(pendingIncomingCallPhoneStorageKey, phone);
}

export function consumePendingIncomingCallPhone(): string | null {
  const phone = window.localStorage.getItem(pendingIncomingCallPhoneStorageKey);

  if (!phone) {
    return null;
  }

  window.localStorage.removeItem(pendingIncomingCallPhoneStorageKey);

  return phone;
}

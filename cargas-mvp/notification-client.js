export async function notificationSupport() {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    notifications: 'Notification' in window,
    pushManager: 'PushManager' in window,
    standalone: window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true
  };
}

export async function registerStyloServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('service_worker_not_supported');
  return navigator.serviceWorker.register('./service-worker.js', { scope: './' });
}

export async function enableStyloNotifications({ applicationServerKey = null } = {}) {
  const support = await notificationSupport();
  if (!support.serviceWorker || !support.notifications || !support.pushManager) {
    return { ok: false, reason: 'push_not_supported', support };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission_not_granted', permission, support };
  }

  const registration = await registerStyloServiceWorker();
  const existing = await registration.pushManager.getSubscription();
  if (existing) return { ok: true, subscription: existing.toJSON(), support };

  if (!applicationServerKey) {
    return { ok: true, pendingServerKey: true, subscription: null, support };
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(applicationServerKey)
  });
  return { ok: true, subscription: subscription.toJSON(), support };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

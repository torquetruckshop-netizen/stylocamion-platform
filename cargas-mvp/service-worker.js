self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text?.() || '' }; }

  const title = data.title || 'Stylo Cargas';
  const options = {
    body: data.body || 'Hay una novedad operativa.',
    tag: data.dedupe_key || data.tag || 'stylo-cargas',
    renotify: Boolean(data.renotify),
    data: {
      url: data.url || './mi-flota.html',
      load_id: data.load_id || null,
      vehicle_id: data.vehicle_id || null,
      operation_id: data.operation_id || null
    },
    actions: normalizeActions(data.actions)
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || './mi-flota.html';
  const action = event.action || 'OPEN';
  const separator = target.includes('?') ? '&' : '?';
  const url = `${target}${separator}notification_action=${encodeURIComponent(action)}`;

  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if ('focus' in client) {
        await client.navigate(url);
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});

function normalizeActions(actions = []) {
  const labels = {
    OPEN: 'Ver',
    ACCEPT: 'Aceptar',
    DISMISS: 'Descartar',
    RESOLVE: 'Resolver'
  };
  return actions.slice(0, 2).map(action => ({ action, title: labels[action] || action }));
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {};

  try {
    payload = event.data.json();
  } catch (error) {
    payload = {
      title: 'Bud & Bloom',
      body: event.data.text(),
    };
  }

  const title = payload.title || 'Bud & Bloom';
  const options = {
    body: payload.body || 'You have a new update from Bud & Bloom.',
    icon: payload.icon || '/logo.svg',
    badge: payload.badge || '/logo.svg',
    tag: payload.tag || 'babylog-update',
    data: payload.data || {},
    vibrate: [120, 60, 120],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const deepLink = event.notification.data?.deepLink || '/#app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(deepLink);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(deepLink);
      }

      return undefined;
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

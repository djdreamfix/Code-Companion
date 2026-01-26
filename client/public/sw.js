/* global self */
const CACHE = 'fm-cache-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['/', '/index.html', '/manifest.webmanifest'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Map tile caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const res = await fetch(event.request);
        cache.put(event.request, res.clone());
        return res;
      })
    );
  }
});

// PUSH
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;

  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'New Mark',
      body: event.data.text(),
      data: { url: '/' }
    };
  }

  const { title, body, icon, data } = payload;

  event.waitUntil(
    self.registration.showNotification(title || 'New Mark', {
      body: body || '',
      icon: icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      requireInteraction: true,
      vibrate: [100, 50, 100],
      data: data || { url: '/' }
    })
  );
});

// CLICK
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
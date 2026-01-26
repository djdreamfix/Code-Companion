/* global self */
const CACHE = "fm-cache-v2";

// Що кешуємо наперед (App Shell)
const PRECACHE_URLS = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // За потреби можна тут чистити старі кеші:
      // const keys = await caches.keys();
      // await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));

      await self.clients.claim();
    })()
  );
});

// Кешування тайлів карти (OSM)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Не чіпаємо не-GET запити
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Кешуємо лише тайли OpenStreetMap
  if (url.hostname.includes("tile.openstreetmap.org")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;

        const res = await fetch(req);
        // Кладемо в кеш лише успішні відповіді
        if (res && res.ok) {
          cache.put(req, res.clone());
        }
        return res;
      })()
    );
  }
});

// PUSH-повідомлення
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;

  try {
    // Очікуємо JSON з сервера
    payload = event.data.json();
  } catch {
    // Якщо прийшов не JSON — формуємо базове повідомлення
    payload = {
      title: "Нова мітка",
      body: event.data.text(),
      data: { url: "/" },
    };
  }

  const title = payload?.title || "Нова мітка";
  const body = payload?.body || "";
  const icon = payload?.icon || "/icons/icon-192.png";
  const data = payload?.data || { url: "/" };

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: "/icons/icon-192.png",
      requireInteraction: true,
      vibrate: [100, 50, 100],
      data,
    })
  );
});

// Клік по нотифікації
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        // Якщо вже є вкладка з цим URL — фокусуємо її
        if (client.url.includes(targetUrl)) {
          return client.focus();
        }
      }

      // Інакше відкриваємо нову вкладку
      return self.clients.openWindow(targetUrl);
    })()
  );
});
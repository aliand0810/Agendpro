const CACHE_NAME = 'planning-pro-v10.4';
const OFFLINE_URL = './';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(['./']))
            .catch(err => console.log('Cache install error:', err))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
                    .map(cacheName => caches.delete(cacheName))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => l.length ? l[0].focus() : clients.openWindow('./')));
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const host = new URL(event.request.url).hostname;
    if (host.includes('googleapis.com') || host.includes('firebaseapp.com') || host.includes('firebaseio.com')) return;
    
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(response => {
                    return response || caches.match(OFFLINE_URL);
                });
            })
    );
});

// Notifications envoyées par un serveur (application fermée)
self.addEventListener('push', event => {
    let d = {}; try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data && event.data.text() }; }
    event.waitUntil(self.registration.showNotification(d.title || 'Mon Planning Pro', {
        body: d.body || '', tag: d.tag || 'mpp-alarme', renotify: true, requireInteraction: true,
        vibrate: [400, 200, 400, 200, 800], icon: d.icon || './icon-192.png', badge: d.badge || './icon-192.png'
    }));
});
// Notifications demandées par la page (fonctionne sur Android et iPhone)
self.addEventListener('message', event => {
    const m = event.data || {};
    if (m.type === 'mpp-notif') self.registration.showNotification(m.title, m.opt || {});
});

// Service Worker for Simnote PWA
const CACHE_NAME = 'simnote-v2.1.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/style.css',
  // sql.js for offline SQLite support
  '/js/lib/sql-wasm.js',
  '/js/lib/sql-wasm.wasm',
  '/css/base.css',
  '/css/core.css',
  '/css/util.css',
  '/css/components/buttons.css',
  '/css/components/entries.css',
  '/css/components/themeSelector.css',
  '/css/components/themeDropdown.css',
  '/css/components/menuButtons.css',
  '/css/components/settingsDropdown.css',
  '/css/components/customDropdown.css',
  '/css/components/guidedPrompt.css',
  '/css/components/onboarding.css',
  '/css/panels/entry.css',
  '/css/panels/mood.css',
  '/css/panels/main.css',
  '/css/panels/journal.css',
  '/css/panels/template.css',
  '/css/panels/chat.css',
  '/css/panels/stats.css',
  '/css/animations/paintDrop.css',
  '/css/animations/exportPopup.css',
  '/css/animations/dateHeader.css',
  '/js/core/main.js',
  '/js/core/preload.js',
  '/js/core/templates.js',
  '/js/core/themeSelector.js',
  '/js/core/sw-register.js',
  '/js/managers/chatManager.js',
  '/js/managers/editorManager.js',
  '/js/managers/fileStorageManager.js',
  '/js/managers/guidedPromptManager.js',
  '/js/managers/panelManager.js',
  '/js/managers/storageManager.js',
  '/js/managers/statsManager.js',
  '/js/managers/keyboardManager.js',
  '/js/managers/onboardingManager.js',
  '/js/utils/moodEmojiMapper.js',
  '/js/utils/sanitizer.js',
  '/js/utils/typingEffect.js',
  '/js/managers/databaseManager.js',
  '/js/managers/dailyMoodManager.js',
  '/js/managers/moodAttributesManager.js',
  '/js/managers/fileStorageBrowser.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Installation failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip Chrome extension requests
  if (event.request.url.includes('chrome-extension')) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache the new response for future use
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch((err) => {
            console.error('[SW] Fetch failed:', err);
            // Return offline fallback if available
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Background sync for offline entries (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-entries') {
    console.log('[SW] Syncing entries...');
    // Future: implement background sync for offline entries
  }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Time to journal!',
      icon: '/resources/icons/pwa/icon-192.png',
      badge: '/resources/icons/pwa/icon-72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'Simnote', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

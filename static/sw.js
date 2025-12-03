// Service Worker for Budget App PWA
const CACHE_NAME = 'budget-app-v1';

// Install event - cache essential resources
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll([
				'/',
				'/manifest.json'
			]);
		})
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => name !== CACHE_NAME)
					.map((name) => caches.delete(name))
			);
		})
	);
	self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
	// Skip non-GET requests
	if (event.request.method !== 'GET') return;
	
	// Only handle http/https requests (skip chrome-extension, etc.)
	const url = new URL(event.request.url);
	if (!url.protocol.startsWith('http')) return;
	
	// Skip API requests - always go to network
	if (event.request.url.includes('/api/')) return;

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				// Only cache successful responses
				if (!response || response.status !== 200 || response.type !== 'basic') {
					return response;
				}
				// Clone the response before caching
				const responseClone = response.clone();
				caches.open(CACHE_NAME).then((cache) => {
					cache.put(event.request, responseClone);
				});
				return response;
			})
			.catch(() => {
				// Fallback to cache if network fails
				return caches.match(event.request);
			})
	);
});

// Service Worker for Budget App PWA
// Version 2 - With offline API support
const CACHE_NAME = 'budget-app-v2';
const API_CACHE_NAME = 'budget-app-api-v1';

// Static resources to cache immediately
const STATIC_RESOURCES = [
	'/',
	'/manifest.json',
	'/dashboard',
	'/spending',
	'/accounts',
	'/plan',
	'/reports',
	'/settings'
];

// API endpoints that can be cached for offline use
const CACHEABLE_API_PATTERNS = [
	'/api/accounts',
	'/api/categories',
	'/api/category-groups',
	'/api/payees',
	'/api/dashboard',
	'/api/transactions'
];

// API cache duration in milliseconds
const API_CACHE_DURATION = {
	'/api/accounts': 30 * 60 * 1000,      // 30 minutes
	'/api/categories': 30 * 60 * 1000,    // 30 minutes
	'/api/category-groups': 30 * 60 * 1000, // 30 minutes
	'/api/payees': 60 * 60 * 1000,        // 1 hour
	'/api/dashboard': 5 * 60 * 1000,      // 5 minutes
	'/api/transactions': 5 * 60 * 1000,   // 5 minutes
	default: 5 * 60 * 1000                // 5 minutes default
};

// Install event - cache essential resources
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(STATIC_RESOURCES);
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
					.filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
					.map((name) => caches.delete(name))
			);
		})
	);
	self.clients.claim();
});

// Check if URL is a cacheable API endpoint (GET only)
function isCacheableApi(url) {
	const pathname = new URL(url).pathname;
	return CACHEABLE_API_PATTERNS.some(pattern => pathname.startsWith(pattern));
}

// Get cache duration for an API endpoint
function getCacheDuration(url) {
	const pathname = new URL(url).pathname;
	for (const [pattern, duration] of Object.entries(API_CACHE_DURATION)) {
		if (pattern !== 'default' && pathname.startsWith(pattern)) {
			return duration;
		}
	}
	return API_CACHE_DURATION.default;
}

// Check if cached response is still valid
function isCacheValid(response, url) {
	if (!response) return false;
	
	const cachedTime = response.headers.get('sw-cached-time');
	if (!cachedTime) return false;
	
	const duration = getCacheDuration(url);
	return Date.now() - parseInt(cachedTime, 10) < duration;
}

// Add timestamp to response for cache validation
async function addTimestampToResponse(response) {
	const headers = new Headers(response.headers);
	headers.set('sw-cached-time', Date.now().toString());
	
	const blob = await response.blob();
	return new Response(blob, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

// Handle API requests with offline support
async function handleApiRequest(request) {
	const cache = await caches.open(API_CACHE_NAME);
	const cachedResponse = await cache.match(request);
	
	// If offline, return cached response
	if (!navigator.onLine) {
		if (cachedResponse) {
			return cachedResponse;
		}
		// Return offline error response
		return new Response(
			JSON.stringify({ 
				error: 'offline', 
				message: 'You are offline. Data will sync when you reconnect.',
				cached: false 
			}),
			{ 
				status: 503,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// If we have a valid cached response, return it and update in background
	if (cachedResponse && isCacheValid(cachedResponse, request.url)) {
		// Update cache in background (stale-while-revalidate)
		fetch(request)
			.then(async (response) => {
				if (response.ok) {
					const timestampedResponse = await addTimestampToResponse(response);
					await cache.put(request, timestampedResponse);
				}
			})
			.catch(() => {});
		return cachedResponse;
	}

	// Try network
	try {
		const response = await fetch(request);
		
		if (response.ok) {
			// Cache the response with timestamp
			const timestampedResponse = await addTimestampToResponse(response.clone());
			await cache.put(request, timestampedResponse);
		}
		
		return response;
	} catch (error) {
		// Network failed, try cache even if expired
		if (cachedResponse) {
			return cachedResponse;
		}
		
		// Return error response
		return new Response(
			JSON.stringify({ 
				error: 'network_error', 
				message: 'Failed to fetch data. Please check your connection.',
				cached: false 
			}),
			{ 
				status: 503,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
}

// Fetch event handler
self.addEventListener('fetch', (event) => {
	// Skip non-GET requests - mutations should not be cached
	if (event.request.method !== 'GET') return;
	
	// Only handle http/https requests (skip chrome-extension, etc.)
	const url = new URL(event.request.url);
	if (!url.protocol.startsWith('http')) return;

	// Handle cacheable API requests with stale-while-revalidate strategy
	if (isCacheableApi(event.request.url)) {
		event.respondWith(handleApiRequest(event.request));
		return;
	}

	// Skip other API requests (auth, mutations, etc.) - always go to network
	if (event.request.url.includes('/api/')) return;

	// Handle static resources with network-first, cache fallback
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

// Background sync for pending operations
self.addEventListener('sync', (event) => {
	if (event.tag === 'sync-pending-changes') {
		event.waitUntil(syncPendingChanges());
	}
});

async function syncPendingChanges() {
	// Notify clients to sync
	const clients = await self.clients.matchAll();
	clients.forEach(client => {
		client.postMessage({ type: 'SYNC_PENDING' });
	});
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
	if (event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
	
	if (event.data.type === 'CLEAR_API_CACHE') {
		caches.delete(API_CACHE_NAME);
	}
	
	if (event.data.type === 'INVALIDATE_CACHE') {
		const { url } = event.data;
		caches.open(API_CACHE_NAME).then(cache => {
			cache.delete(url);
		});
	}
});

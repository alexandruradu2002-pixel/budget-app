// Service Worker for Budget App PWA
// Version 7 - Fixed cold start theme flash/black screen
const CACHE_NAME = 'budget-app-v7';
const API_CACHE_NAME = 'budget-app-api-v5';
const OFFLINE_PAGE = '/offline.html';

// Max age for cached HTML pages (prevents stale hydration issues)
const PAGE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Static resources to cache immediately on install
const STATIC_RESOURCES = [
	'/',
	'/offline.html',
	'/manifest.json',
	'/favicon.png',
	'/icon-192.png',
	'/icon-512.png'
];

// Protected pages that should use app shell pattern
const PROTECTED_PAGES = [
	'/dashboard',
	'/spending',
	'/accounts',
	'/plan',
	'/reports',
	'/settings',
	'/login'
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
			console.log('[SW] Caching static resources');
			return cache.addAll(STATIC_RESOURCES);
		})
	);
	// Force the waiting service worker to become the active service worker
	self.skipWaiting();
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
	event.waitUntil(
		Promise.all([
			// Clean old caches
			caches.keys().then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
						.map((name) => {
							console.log('[SW] Deleting old cache:', name);
							return caches.delete(name);
						})
				);
			}),
			// Take control of all clients immediately
			self.clients.claim()
		])
	);
});

// Check if URL is a protected page
function isProtectedPage(url) {
	const pathname = new URL(url).pathname;
	return PROTECTED_PAGES.some(page => pathname === page || pathname.startsWith(page + '/'));
}

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
	const url = new URL(event.request.url);
	
	// Only handle http/https requests (skip chrome-extension, etc.)
	if (!url.protocol.startsWith('http')) return;
	
	// Skip non-GET requests - mutations should not be cached
	if (event.request.method !== 'GET') return;

	// Handle cacheable API requests with stale-while-revalidate strategy
	if (isCacheableApi(event.request.url)) {
		event.respondWith(handleApiRequest(event.request));
		return;
	}

	// Skip other API requests (auth, mutations, etc.) - always go to network
	if (url.pathname.startsWith('/api/')) return;

	// Handle ALL navigation requests (not just protected pages)
	if (event.request.mode === 'navigate') {
		event.respondWith(handleNavigationRequest(event.request));
		return;
	}

	// Handle static resources with cache-first for assets, network-first for others
	if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
		// Cache-first for static assets
		event.respondWith(
			caches.match(event.request).then((cachedResponse) => {
				if (cachedResponse) {
					return cachedResponse;
				}
				return fetch(event.request).then((response) => {
					if (!response || response.status !== 200) {
						return response;
					}
					const responseClone = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseClone);
					});
					return response;
				}).catch(() => {
					// Return nothing for failed asset requests
					return new Response('', { status: 404 });
				});
			})
		);
		return;
	}

	// Network-first for other resources
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
				return caches.match(event.request).then(cachedResponse => {
					if (cachedResponse) return cachedResponse;
					// If it's a navigation request, show offline page
					if (event.request.mode === 'navigate') {
						return caches.match(OFFLINE_PAGE);
					}
					return cachedResponse;
				});
			})
	);
});

// Handle navigation requests for all pages
async function handleNavigationRequest(request) {
	const url = new URL(request.url);
	
	// ALWAYS try network first for navigation - prevents stale page issues on cold start
	try {
		const response = await fetch(request);
		
		// Cache successful page responses with timestamp
		if (response.ok) {
			const cache = await caches.open(CACHE_NAME);
			// Add timestamp header before caching
			const headers = new Headers(response.headers);
			headers.set('sw-page-cached-time', Date.now().toString());
			const timestampedResponse = new Response(response.clone().body, {
				status: response.status,
				statusText: response.statusText,
				headers
			});
			cache.put(request, timestampedResponse);
		}
		
		return response;
	} catch (error) {
		console.log('[SW] Network failed for:', url.pathname);
		
		// Network failed - we're offline
		const cache = await caches.open(CACHE_NAME);
		
		// Try to return cached version of the page (if not too old)
		const cachedResponse = await cache.match(request);
		if (cachedResponse) {
			// Check if cached page is not too old (prevents stale hydration)
			const cachedTime = cachedResponse.headers.get('sw-page-cached-time');
			const isExpired = cachedTime && (Date.now() - parseInt(cachedTime, 10) > PAGE_CACHE_MAX_AGE);
			
			if (!isExpired) {
				console.log('[SW] Returning cached page:', url.pathname);
				return cachedResponse;
			} else {
				console.log('[SW] Cached page expired, removing:', url.pathname);
				await cache.delete(request);
			}
		}
		
		// Try to match just the pathname (without query params)
		const pathOnlyRequest = new Request(url.origin + url.pathname);
		const cachedPathResponse = await cache.match(pathOnlyRequest);
		if (cachedPathResponse) {
			console.log('[SW] Returning cached path:', url.pathname);
			return cachedPathResponse;
		}
		
		// For protected pages without cache, show offline page
		if (isProtectedPage(request.url)) {
			console.log('[SW] Showing offline page for protected route:', url.pathname);
			const offlinePage = await cache.match(OFFLINE_PAGE);
			if (offlinePage) {
				return offlinePage;
			}
		}
		
		// Try root page as fallback for SPA navigation
		const rootResponse = await cache.match('/');
		if (rootResponse) {
			console.log('[SW] Returning root page as fallback');
			return rootResponse;
		}
		
		// No cached version - return offline page
		const offlinePage = await cache.match(OFFLINE_PAGE);
		if (offlinePage) {
			return offlinePage;
		}
		
		// Last resort - return a basic offline response
		return new Response(
			`<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Offline</title>
				<style>
					body { 
						font-family: system-ui, sans-serif; 
						display: flex; 
						justify-content: center; 
						align-items: center; 
						min-height: 100vh; 
						margin: 0;
						background: #0F172A;
						color: #F8FAFC;
						text-align: center;
						padding: 20px;
					}
					h1 { margin-bottom: 10px; }
					button {
						background: #3B82F6;
						color: white;
						border: none;
						padding: 12px 24px;
						border-radius: 8px;
						font-size: 16px;
						cursor: pointer;
						margin-top: 20px;
					}
				</style>
			</head>
			<body>
				<div>
					<h1>Ești offline</h1>
					<p>Nu există conexiune la internet.</p>
					<button onclick="location.reload()">Încearcă din nou</button>
				</div>
			</body>
			</html>`,
			{ 
				status: 200,
				headers: { 'Content-Type': 'text/html; charset=utf-8' } 
			}
		);
	}
}

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
	
	// iOS PWA resume fix - check if client is alive
	if (event.data.type === 'PING') {
		event.source?.postMessage({ type: 'PONG' });
	}
	
	// Force reload request from app when it detects stuck state
	if (event.data.type === 'FORCE_REFRESH') {
		event.source?.postMessage({ type: 'RELOAD' });
	}
});

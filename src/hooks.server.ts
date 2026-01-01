import type { Handle } from '@sveltejs/kit';
import { seedDatabase } from '$lib/server/seed';
import { getSession, extendSession } from '$lib/server/auth';
import { DEMO_MODE } from '$env/static/private';

let seeded = false;

// Check if running in demo mode (only /demo accessible)
const isDemoMode = DEMO_MODE === 'true';

export const handle: Handle = async ({ event, resolve }) => {
	// Demo mode: only allow /demo route
	if (isDemoMode) {
		const path = event.url.pathname;
		
		// Allow demo page, static assets, and API for demo
		if (!path.startsWith('/demo') && !path.startsWith('/_app') && !path.startsWith('/favicon')) {
			// Redirect everything to /demo
			return new Response(null, {
				status: 302,
				headers: { Location: '/demo' }
			});
		}
		
		// Demo mode - no DB operations needed
		return resolve(event);
	}

	// Seed database on first request (non-demo mode only)
	if (!seeded) {
		seeded = true;
		try {
			await seedDatabase(1);
		} catch (e) {
			console.error('Failed to seed database:', e);
		}
	}

	// Check for valid session
	const sessionId = event.cookies.get('session');

	if (sessionId) {
		const session = await getSession(sessionId);
		if (session) {
			event.locals.user = {
				userId: session.userId,
				email: session.email,
				name: session.name,
				roles: session.roles
			};
			// Extend session (sliding expiration)
			await extendSession(sessionId);
		} else {
			// Invalid/expired session - clear the cookie
			event.cookies.delete('session', { path: '/' });
		}
	}

	// Protected routes - redirect to login if not authenticated
	const protectedPaths = ['/dashboard', '/accounts', '/plan', '/spending', '/reports', '/settings'];
	const isProtectedRoute = protectedPaths.some(path => event.url.pathname.startsWith(path));
	const isApiRoute = event.url.pathname.startsWith('/api/');
	
	if (isProtectedRoute && !event.locals.user) {
		return new Response(null, {
			status: 302,
			headers: { Location: '/login' }
		});
	}

	// API routes (except auth) require authentication
	if (isApiRoute && !event.url.pathname.startsWith('/api/auth/') && !event.locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const response = await resolve(event);
	
	// Add caching headers for protected pages to enable offline access
	// Service Worker will cache these pages when online
	if (isProtectedRoute && response.headers.get('content-type')?.includes('text/html')) {
		const headers = new Headers(response.headers);
		// Allow service worker to cache but revalidate when online
		headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
		// Enable caching in service worker
		headers.set('X-SW-Cacheable', 'true');
		
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers
		});
	}
	
	return response;
};

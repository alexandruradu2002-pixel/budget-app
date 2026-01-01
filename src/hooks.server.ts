import type { Handle } from '@sveltejs/kit';
import { seedDatabase } from '$lib/server/seed';
import { getSession, extendSession, cleanupExpiredSessions } from '$lib/server/auth';
import { logSecurity } from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

let seeded = false;
let lastCleanup = 0;
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Check if running in demo mode (only /demo accessible)
const isDemoMode = env.DEMO_MODE === 'true';

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
		logSecurity('Unauthorized API access attempt', {
			path: event.url.pathname,
			ip: event.getClientAddress()
		});
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Periodic session cleanup (non-blocking)
	const now = Date.now();
	if (now - lastCleanup > CLEANUP_INTERVAL) {
		lastCleanup = now;
		cleanupExpiredSessions().catch(() => {});
	}

	const response = await resolve(event);

	// ============================================
	// Security Headers
	// ============================================
	const headers = new Headers(response.headers);

	// Prevent MIME type sniffing
	headers.set('X-Content-Type-Options', 'nosniff');

	// Prevent clickjacking
	headers.set('X-Frame-Options', 'DENY');

	// XSS Protection (legacy browsers)
	headers.set('X-XSS-Protection', '1; mode=block');

	// Referrer policy
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// Content Security Policy (production only - more restrictive)
	if (!dev) {
		headers.set(
			'Content-Security-Policy',
			[
				"default-src 'self'",
				"script-src 'self' 'unsafe-inline'", // Needed for SvelteKit
				"style-src 'self' 'unsafe-inline'", // Needed for Tailwind
				"img-src 'self' data: https:",
				"font-src 'self' data:",
				"connect-src 'self' https:",
				"frame-ancestors 'none'"
			].join('; ')
		);
	}

	// Add caching headers for protected pages to enable offline access
	// Service Worker will cache these pages when online
	if (isProtectedRoute && response.headers.get('content-type')?.includes('text/html')) {
		// Allow service worker to cache but revalidate when online
		headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
		// Enable caching in service worker
		headers.set('X-SW-Cacheable', 'true');
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
};

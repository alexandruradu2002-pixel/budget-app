import type { Handle } from '@sveltejs/kit';
import { seedDatabase } from '$lib/server/seed';
import { getSession, extendSession, cleanupExpiredSessions } from '$lib/server/auth';
import { logSecurity } from '$lib/server/logger';
import { DEMO_USER_ID } from '$lib/server/demo-seed';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import db from '$lib/server/db';

let seeded = false;
let lastCleanup = 0;
let isAppConfigured: boolean | null = null; // Cache setup status
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Check if running in demo mode (only /demo accessible)
const isDemoMode = env.DEMO_MODE === 'true';

// Check if demo access is allowed (for private instances, set ALLOW_DEMO=true to enable)
const allowDemo = env.ALLOW_DEMO === 'true';

// Check if app is configured (password set OR email service available)
async function checkAppConfigured(): Promise<boolean> {
	// Use cached value if available
	if (isAppConfigured !== null) {
		return isAppConfigured;
	}
	
	try {
		// Check for password in database
		const configResult = await db.execute({
			sql: "SELECT value FROM app_config WHERE key = 'password_hash'",
			args: []
		});
		
		if (configResult.rows.length > 0) {
			isAppConfigured = true;
			return true;
		}
		
		// Fallback: check APP_PASSWORD environment variable
		if (env.APP_PASSWORD) {
			isAppConfigured = true;
			return true;
		}
		
		// If Resend is configured, app is ready (uses magic links instead of password)
		if (env.RESEND_API_KEY) {
			isAppConfigured = true;
			return true;
		}
		
		isAppConfigured = false;
		return false;
	} catch {
		// If check fails, assume not configured
		return false;
	}
}

// Reset cached status (called after setup completes)
export function resetAppConfiguredCache() {
	isAppConfigured = null;
}

// API routes that modify data (demo users should be blocked)
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
// API routes that are always allowed for demo users (read-only operations)
const DEMO_ALLOWED_API_ROUTES = [
	'/api/auth/demo',
	'/api/auth/logout',
	'/api/auth/me',
	'/api/accounts',
	'/api/categories',
	'/api/transactions',
	'/api/dashboard',
	'/api/reports',
	'/api/user'
];

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

	const path = event.url.pathname;

	// ============================================
	// Block Demo API on Private Instances
	// (but allow /demo page to be viewed - it will show "disabled" message)
	// ============================================
	if (!allowDemo && path.startsWith('/api/auth/demo')) {
		return new Response(
			JSON.stringify({ error: 'Demo mode is disabled on this instance' }),
			{ status: 403, headers: { 'Content-Type': 'application/json' } }
		);
	}

	// ============================================
	// Initial Setup Check - Redirect to /setup if not configured
	// ============================================
	const isSetupRoute = path === '/setup' || path.startsWith('/api/auth/setup');
	const isStaticRoute = path.startsWith('/_app') || path.startsWith('/favicon') || path.startsWith('/manifest');
	
	if (!isSetupRoute && !isStaticRoute) {
		const configured = await checkAppConfigured();
		
		if (!configured) {
			// Not configured - redirect to setup page
			if (path.startsWith('/api/')) {
				return new Response(
					JSON.stringify({ error: 'App not configured', needsSetup: true }),
					{ status: 403, headers: { 'Content-Type': 'application/json' } }
				);
			}
			return new Response(null, {
				status: 302,
				headers: { Location: '/setup' }
			});
		}
	}

	// Check for valid session
	const sessionId = event.cookies.get('session');

	if (sessionId) {
		const session = await getSession(sessionId);
		if (session) {
			const isDemo = session.userId === DEMO_USER_ID;
			event.locals.user = {
				userId: session.userId,
				email: session.email,
				name: session.name,
				roles: session.roles,
				isDemo
			};
			// Extend session (sliding expiration) - but not for demo users
			if (!isDemo) {
				await extendSession(sessionId);
			}
		} else {
			// Invalid/expired session - clear the cookie
			event.cookies.delete('session', { path: '/' });
		}
	}

	// ============================================
	// Block Write Operations for Demo Users
	// ============================================
	const isApiRoute = event.url.pathname.startsWith('/api/');
	const isWriteMethod = WRITE_METHODS.includes(event.request.method);
	
	if (isApiRoute && isWriteMethod && event.locals.user?.isDemo) {
		// Allow specific routes even for demo users
		const path = event.url.pathname;
		const isAllowedWrite = 
			path === '/api/auth/demo' || 
			path === '/api/auth/logout' ||
			path === '/api/auth/send-code' ||
			path === '/api/auth/verify-otp' ||
			path === '/api/auth/login';
		
		if (!isAllowedWrite) {
			return new Response(
				JSON.stringify({ 
					error: 'Demo mode: modifications are disabled',
					message: 'This is a read-only demo. Sign up for your own account to make changes!',
					isDemo: true
				}), 
				{
					status: 403,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}
	}

	// Protected routes - redirect to login if not authenticated
	const protectedPaths = ['/dashboard', '/accounts', '/plan', '/spending', '/reports', '/settings'];
	const isProtectedRoute = protectedPaths.some(path => event.url.pathname.startsWith(path));
	
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

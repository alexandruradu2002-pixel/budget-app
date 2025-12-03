import type { Handle } from '@sveltejs/kit';
import { seedDatabase } from '$lib/server/seed';
import { getSession, extendSession } from '$lib/server/auth';

let seeded = false;

export const handle: Handle = async ({ event, resolve }) => {
	// Seed database on first request
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

	return resolve(event);
};

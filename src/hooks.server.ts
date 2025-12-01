import type { Handle } from '@sveltejs/kit';
import { getSession, extendSession } from '$lib/server/auth';

const isProduction = process.env.NODE_ENV === 'production';

export const handle: Handle = async ({ event, resolve }) => {
	// Extract session cookie
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
			// Extend session on each request (sliding expiration)
			await extendSession(sessionId);
		} else {
			// Invalid/expired session - clear cookie
			event.cookies.delete('session', { path: '/' });
		}
	}

	// Dev mode: Auto-authenticate as admin if no session
	if (!isProduction && !event.locals.user) {
		event.locals.user = {
			userId: 1,
			email: 'dev@budget.app',
			name: 'Dev User',
			roles: ['admin', 'user']
		};
		console.log('🔧 Dev mode: Auto-authenticated as admin');
	}

	return resolve(event);
};

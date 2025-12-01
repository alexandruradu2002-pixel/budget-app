import type { Handle } from '@sveltejs/kit';
import { seedDatabase } from '$lib/server/seed';

// LOGIN DISABLED: Single user mode - always authenticated as admin
// To re-enable login, uncomment the session logic below

let seeded = false;

export const handle: Handle = async ({ event, resolve }) => {
	// Always authenticate as the single user (login disabled)
	event.locals.user = {
		userId: 1,
		email: 'alex@budget.app',
		name: 'Alex',
		roles: ['admin', 'user']
	};

	// Seed database on first request (dev mode only)
	if (!seeded) {
		seeded = true;
		try {
			await seedDatabase(1);
		} catch (e) {
			console.error('Failed to seed database:', e);
		}
	}

	/* ORIGINAL SESSION LOGIC - Uncomment to re-enable login:
	import { getSession, extendSession } from '$lib/server/auth';
	
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
			await extendSession(sessionId);
		} else {
			event.cookies.delete('session', { path: '/' });
		}
	}
	*/

	return resolve(event);
};

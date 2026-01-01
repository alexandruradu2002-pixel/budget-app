// Demo login endpoint - logs user into shared demo account
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSession, setSessionCookie } from '$lib/server/auth';
import { seedDemoUser, DEMO_USER_ID } from '$lib/server/demo-seed';
import { env } from '$env/dynamic/private';
import db from '$lib/server/db';

export const POST: RequestHandler = async (event) => {
	// Block demo access on private self-hosted instances
	// Set ALLOW_DEMO=true in environment to enable demo mode
	const allowDemo = env.ALLOW_DEMO === 'true';
	
	if (!allowDemo) {
		return json({ 
			error: 'Demo mode is disabled on this instance',
			message: 'This is a private instance. Please contact the administrator.'
		}, { status: 403 });
	}
	
	try {
		// Ensure demo user exists with data
		await seedDemoUser();

		// Get demo user
		const userResult = await db.execute({
			sql: 'SELECT id, email, name, roles FROM users WHERE id = ?',
			args: [DEMO_USER_ID]
		});

		if (userResult.rows.length === 0) {
			return json({ error: 'Demo user not found' }, { status: 500 });
		}

		const user = userResult.rows[0];

		// Create session for demo user
		const userAgent = event.request.headers.get('user-agent') || undefined;
		const ipAddress = event.getClientAddress();
		const sessionId = await createSession(
			user.id as number,
			userAgent,
			ipAddress
		);

		// Set session cookie
		const isProduction = env.NODE_ENV === 'production' || event.url.hostname !== 'localhost';
		setSessionCookie(event.cookies, sessionId, isProduction);

		return json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				isDemo: true
			}
		});
	} catch (error) {
		console.error('Demo login error:', error);
		return json({ error: 'Failed to start demo' }, { status: 500 });
	}
};

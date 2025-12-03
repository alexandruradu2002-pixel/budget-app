// Login endpoint - Single user with environment password
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSession, setSessionCookie } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import db from '$lib/server/db';

export const POST: RequestHandler = async (event) => {
	const { password } = await event.request.json();

	// Get APP_PASSWORD from environment variable
	const appPassword = env.APP_PASSWORD;

	if (!appPassword) {
		console.error('APP_PASSWORD environment variable is not set!');
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	// Verify password
	if (password !== appPassword) {
		return json({ error: 'Invalid password' }, { status: 401 });
	}

	// Get or create the single user (ID 1)
	const userResult = await db.execute({
		sql: 'SELECT id, email, name, roles FROM users WHERE id = 1',
		args: []
	});

	let userId = 1;
	let email = 'alex@budget.app';
	let name = 'Alex';

	if (userResult.rows.length > 0) {
		const user = userResult.rows[0];
		userId = user.id as number;
		email = user.email as string;
		name = user.name as string;
	}

	// Create session
	const userAgent = event.request.headers.get('user-agent') || undefined;
	const ipAddress = event.getClientAddress();
	const sessionId = await createSession(userId, userAgent, ipAddress);

	// Set session cookie
	const isProduction = env.NODE_ENV === 'production' || event.url.hostname !== 'localhost';
	setSessionCookie(event.cookies, sessionId, isProduction);

	return json({
		success: true,
		user: { id: userId, email, name }
	});
};

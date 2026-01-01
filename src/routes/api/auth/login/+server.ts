// Login endpoint - Single user with database password (or fallback to APP_PASSWORD env)
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSession, setSessionCookie } from '$lib/server/auth';
import { authRateLimiter, checkRateLimit } from '$lib/server/rate-limit';
import { logSecurity } from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import db from '$lib/server/db';
import crypto from 'crypto';

// ============================================
// Verify password against stored hash
// ============================================
function verifyPassword(password: string, storedHash: string, salt: string): boolean {
	const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
	return hash === storedHash;
}

export const POST: RequestHandler = async (event) => {
	// Rate limiting - prevent brute force attacks
	const rateLimited = checkRateLimit(event, authRateLimiter);
	if (rateLimited) {
		logSecurity('Rate limit exceeded on login', {
			ip: event.getClientAddress()
		});
		return rateLimited;
	}

	const { password } = await event.request.json();

	// Try to get password from database first (setup flow)
	const configResult = await db.execute({
		sql: "SELECT key, value FROM app_config WHERE key IN ('password_hash', 'password_salt')",
		args: []
	});

	let isValid = false;

	if (configResult.rows.length === 2) {
		// Password is configured in database - use it
		const configMap = new Map(configResult.rows.map(r => [r.key as string, r.value as string]));
		const storedHash = configMap.get('password_hash');
		const storedSalt = configMap.get('password_salt');

		if (storedHash && storedSalt) {
			isValid = verifyPassword(password, storedHash, storedSalt);
		}
	} else {
		// Fallback: check APP_PASSWORD environment variable (legacy support)
		const appPassword = env.APP_PASSWORD;

		if (!appPassword) {
			// No password configured at all - redirect to setup
			return json(
				{ error: 'App not configured', needsSetup: true },
				{ status: 403 }
			);
		}

		isValid = password === appPassword;
	}

	// Verify password
	if (!isValid) {
		logSecurity('Failed login attempt', {
			ip: event.getClientAddress()
		});
		return json({ error: 'Invalid password' }, { status: 401 });
	}

	// Get or create the single user (ID 1)
	const userResult = await db.execute({
		sql: 'SELECT id, email, name, roles FROM users WHERE id = 1',
		args: []
	});

	let userId = 1;
	let email = 'alexandruradu2002@gmail.com';
	let name = 'Alex';

	if (userResult.rows.length > 0) {
		const user = userResult.rows[0];
		userId = user.id as number;
		email = user.email as string;
		name = user.name as string;
	} else {
		// Create user if doesn't exist
		await db.execute({
			sql: `INSERT INTO users (id, email, name, password_hash, roles) VALUES (?, ?, ?, '', '["admin", "user"]')`,
			args: [1, email, name]
		});
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

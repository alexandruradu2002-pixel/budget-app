// Magic link verification endpoint (GET request from email link)
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyMagicToken, getOrCreateUser, createSession, setSessionCookie } from '$lib/server/auth';
import { sendWelcomeEmail } from '$lib/server/email';
import { logSecurity } from '$lib/server/logger';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async (event) => {
	const token = event.url.searchParams.get('token');
	
	if (!token) {
		// Redirect to login with error
		throw redirect(302, '/login?error=missing_token');
	}

	const ipAddress = event.getClientAddress();

	// Verify magic link token
	const email = await verifyMagicToken(token);
	
	if (!email) {
		logSecurity('Invalid magic link attempt', {
			ip: ipAddress
		});
		throw redirect(302, '/login?error=invalid_token');
	}

	// Get or create user
	const result = await getOrCreateUser(email);
	
	if (!result) {
		// User cap reached
		logSecurity('User cap reached during magic link verification', {
			email,
			ip: ipAddress
		});
		throw redirect(302, '/login?error=user_cap');
	}

	const { user, isNew } = result;

	// Send welcome email for new users
	if (isNew) {
		await sendWelcomeEmail(user.email, user.name);
		logSecurity('New user registered via magic link', {
			userId: user.id,
			email: user.email,
			ip: ipAddress
		});
	}

	// Create session
	const userAgent = event.request.headers.get('user-agent') || undefined;
	const sessionId = await createSession(user.id, userAgent, ipAddress);

	// Set session cookie
	const isProduction = env.NODE_ENV === 'production' || event.url.hostname !== 'localhost';
	setSessionCookie(event.cookies, sessionId, isProduction);

	logSecurity('User logged in via magic link', {
		userId: user.id,
		email: user.email,
		isNew,
		ip: ipAddress
	});

	// Redirect to dashboard (or welcome page for new users)
	throw redirect(302, isNew ? '/dashboard?welcome=true' : '/dashboard');
};

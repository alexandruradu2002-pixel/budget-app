// Verify OTP code endpoint
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyOTP, getOrCreateUser, createSession, setSessionCookie } from '$lib/server/auth';
import { sendWelcomeEmail } from '$lib/server/email';
import { authRateLimiter, checkRateLimit } from '$lib/server/rate-limit';
import { logSecurity } from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import { z } from 'zod';

const verifyOtpSchema = z.object({
	email: z.string().email('Invalid email address'),
	code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numbers only')
});

export const POST: RequestHandler = async (event) => {
	// Rate limiting
	const rateLimited = checkRateLimit(event, authRateLimiter);
	if (rateLimited) {
		logSecurity('Rate limit exceeded on verify-otp', {
			ip: event.getClientAddress()
		});
		return rateLimited;
	}

	let email: string;
	let code: string;
	
	try {
		const body = await event.request.json();
		const parsed = verifyOtpSchema.parse(body);
		email = parsed.email.toLowerCase();
		code = parsed.code;
	} catch {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	const ipAddress = event.getClientAddress();

	// Verify OTP
	const isValid = await verifyOTP(email, code);
	
	if (!isValid) {
		logSecurity('Invalid OTP attempt', {
			email,
			ip: ipAddress
		});
		return json({ error: 'Invalid or expired code' }, { status: 401 });
	}

	// Get or create user
	const result = await getOrCreateUser(email);
	
	if (!result) {
		// User cap reached
		logSecurity('User cap reached during OTP verification', {
			email,
			ip: ipAddress
		});
		return json({
			error: 'Registration unavailable',
			message: 'This instance has reached its user limit.'
		}, { status: 503 });
	}

	const { user, isNew } = result;

	// Send welcome email for new users
	if (isNew) {
		await sendWelcomeEmail(user.email, user.name);
		logSecurity('New user registered', {
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

	logSecurity('User logged in via OTP', {
		userId: user.id,
		email: user.email,
		isNew,
		ip: ipAddress
	});

	return json({
		success: true,
		user: {
			id: user.id,
			email: user.email,
			name: user.name
		},
		isNewUser: isNew
	});
};

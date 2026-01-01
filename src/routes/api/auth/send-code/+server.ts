// Send login code (Magic Link + OTP) endpoint
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAuthToken, getUserCap, getCurrentUserCount, canCreateNewUser } from '$lib/server/auth';
import { sendMagicLinkEmail, isEmailConfigured } from '$lib/server/email';
import { authRateLimiter, checkRateLimit } from '$lib/server/rate-limit';
import { logSecurity } from '$lib/server/logger';
import db from '$lib/server/db';
import { z } from 'zod';

const sendCodeSchema = z.object({
	email: z.string().email('Invalid email address')
});

export const POST: RequestHandler = async (event) => {
	// Rate limiting - prevent abuse
	const rateLimited = checkRateLimit(event, authRateLimiter);
	if (rateLimited) {
		logSecurity('Rate limit exceeded on send-code', {
			ip: event.getClientAddress()
		});
		return rateLimited;
	}

	// Check if email service is configured
	if (!isEmailConfigured()) {
		return json({
			error: 'Email authentication not configured',
			message: 'This instance requires APP_PASSWORD for login. Contact administrator.',
			usePasswordAuth: true
		}, { status: 503 });
	}

	let email: string;
	try {
		const body = await event.request.json();
		const parsed = sendCodeSchema.parse(body);
		email = parsed.email.toLowerCase();
	} catch {
		return json({ error: 'Invalid email address' }, { status: 400 });
	}

	// Check if this email already has a user
	const existingUser = await db.execute({
		sql: 'SELECT id FROM users WHERE email = ?',
		args: [email]
	});

	const isNewUser = existingUser.rows.length === 0;

	// If new user, check cap
	if (isNewUser) {
		const canCreate = await canCreateNewUser();
		if (!canCreate) {
			const currentCount = await getCurrentUserCount();
			const cap = getUserCap();
			logSecurity('User cap reached - registration blocked', {
				email,
				currentCount,
				cap,
				ip: event.getClientAddress()
			});
			return json({
				error: 'Registration temporarily unavailable',
				message: `This instance has reached its user limit (${cap} users). Please try again later or self-host your own instance.`,
				userCapReached: true
			}, { status: 503 });
		}
	}

	// Create auth tokens (magic link + OTP)
	const ipAddress = event.getClientAddress();
	const { token, otp } = await createAuthToken(email, 'magic_link', ipAddress);

	// Send email
	const emailResult = await sendMagicLinkEmail(email, token, otp);

	if (!emailResult.success) {
		logSecurity('Failed to send login email', {
			email,
			error: emailResult.error,
			ip: ipAddress
		});
		return json({
			error: 'Failed to send login email',
			message: 'Please try again in a few moments.'
		}, { status: 500 });
	}

	logSecurity('Login code sent', {
		email,
		isNewUser,
		ip: ipAddress
	});

	return json({
		success: true,
		message: isNewUser 
			? 'Check your email for a sign-in link. A new account will be created.'
			: 'Check your email for a sign-in link.',
		isNewUser
	});
};

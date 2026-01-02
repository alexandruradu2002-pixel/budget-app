// Forgot password endpoint - sends password reset email
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendPasswordResetEmail, isEmailConfigured, isEmailLimitReached } from '$lib/server/email';
import { authRateLimiter, checkRateLimit } from '$lib/server/rate-limit';
import { logSecurity } from '$lib/server/logger';
import db from '$lib/server/db';
import crypto from 'crypto';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
	email: z.string().email('Invalid email address')
});

export const POST: RequestHandler = async (event) => {
	// Rate limiting
	const rateLimited = checkRateLimit(event, authRateLimiter);
	if (rateLimited) {
		logSecurity('Rate limit exceeded on forgot-password', {
			ip: event.getClientAddress()
		});
		return rateLimited;
	}

	// Check if email service is configured
	if (!isEmailConfigured()) {
		return json({
			error: 'Email service not configured',
			message: 'Password reset is not available. Contact administrator.'
		}, { status: 503 });
	}

	// Check email limit
	if (isEmailLimitReached()) {
		return json({
			error: 'Daily email limit reached',
			message: 'Limita zilnică de emailuri a fost atinsă. Încearcă mâine.',
			emailLimitReached: true
		}, { status: 503 });
	}

	let email: string;
	try {
		const body = await event.request.json();
		const parsed = forgotPasswordSchema.parse(body);
		email = parsed.email.toLowerCase();
	} catch {
		return json({ error: 'Invalid email address' }, { status: 400 });
	}

	const ipAddress = event.getClientAddress();

	// Check if user exists
	const userResult = await db.execute({
		sql: 'SELECT id, email FROM users WHERE email = ?',
		args: [email]
	});

	// Always return success to prevent email enumeration
	if (userResult.rows.length === 0) {
		logSecurity('Password reset requested for non-existent email', {
			email,
			ip: ipAddress
		});
		// Return success anyway to prevent enumeration
		return json({
			success: true,
			message: 'Dacă există un cont cu acest email, vei primi un link de resetare.'
		});
	}

	// Generate reset token
	const token = crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

	// Store reset token in database
	await db.execute({
		sql: `INSERT INTO password_reset_tokens (email, token, expires_at, created_at)
		      VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
		args: [email, token, expiresAt.toISOString()]
	});

	// Send reset email
	const emailResult = await sendPasswordResetEmail(email, token);

	if (!emailResult.success) {
		logSecurity('Failed to send password reset email', {
			email,
			error: emailResult.error,
			ip: ipAddress
		});
		return json({
			error: 'Failed to send email',
			message: 'Nu am putut trimite emailul. Încearcă din nou.'
		}, { status: 500 });
	}

	logSecurity('Password reset email sent', {
		email,
		ip: ipAddress
	});

	return json({
		success: true,
		message: 'Dacă există un cont cu acest email, vei primi un link de resetare.'
	});
};

// Reset password endpoint - verifies token and sets new password
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSession, setSessionCookie } from '$lib/server/auth';
import { authRateLimiter, checkRateLimit } from '$lib/server/rate-limit';
import { logSecurity } from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import db from '$lib/server/db';
import crypto from 'crypto';
import { z } from 'zod';

const resetPasswordSchema = z.object({
	token: z.string().min(1, 'Token is required'),
	password: z.string().min(6, 'Password must be at least 6 characters')
});

function hashPassword(password: string, salt: string): string {
	return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function generateSalt(): string {
	return crypto.randomBytes(16).toString('hex');
}

export const POST: RequestHandler = async (event) => {
	// Rate limiting
	const rateLimited = checkRateLimit(event, authRateLimiter);
	if (rateLimited) {
		logSecurity('Rate limit exceeded on reset-password', {
			ip: event.getClientAddress()
		});
		return rateLimited;
	}

	let token: string;
	let password: string;
	
	try {
		const body = await event.request.json();
		const parsed = resetPasswordSchema.parse(body);
		token = parsed.token;
		password = parsed.password;
	} catch (err) {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	const ipAddress = event.getClientAddress();

	// Find valid token
	const tokenResult = await db.execute({
		sql: `SELECT email, expires_at FROM password_reset_tokens 
		      WHERE token = ? AND used = 0`,
		args: [token]
	});

	if (tokenResult.rows.length === 0) {
		logSecurity('Invalid password reset token', {
			ip: ipAddress
		});
		return json({ 
			error: 'Invalid or expired token',
			message: 'Link-ul de resetare este invalid sau a expirat.'
		}, { status: 400 });
	}

	const tokenData = tokenResult.rows[0];
	const email = tokenData.email as string;
	const expiresAt = new Date(tokenData.expires_at as string);

	// Check if token is expired
	if (new Date() > expiresAt) {
		logSecurity('Expired password reset token', {
			email,
			ip: ipAddress
		});
		return json({ 
			error: 'Token expired',
			message: 'Link-ul de resetare a expirat. Cere un nou link.'
		}, { status: 400 });
	}

	// Mark token as used
	await db.execute({
		sql: 'UPDATE password_reset_tokens SET used = 1 WHERE token = ?',
		args: [token]
	});

	// Find user
	const userResult = await db.execute({
		sql: 'SELECT id, name FROM users WHERE email = ?',
		args: [email]
	});

	if (userResult.rows.length === 0) {
		logSecurity('Password reset for non-existent user', {
			email,
			ip: ipAddress
		});
		return json({ error: 'User not found' }, { status: 404 });
	}

	const user = userResult.rows[0];
	const userId = user.id as number;
	const userName = user.name as string;

	// Update password
	const salt = generateSalt();
	const passwordHash = hashPassword(password, salt);

	await db.execute({
		sql: 'UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?',
		args: [passwordHash, salt, userId]
	});

	logSecurity('Password reset successful', {
		email,
		userId,
		ip: ipAddress
	});

	// Create session and log user in
	const userAgent = event.request.headers.get('user-agent') || undefined;
	const sessionId = await createSession(userId, userAgent, ipAddress);

	const isProduction = env.NODE_ENV === 'production' || event.url.hostname !== 'localhost';
	setSessionCookie(event.cookies, sessionId, isProduction);

	return json({
		success: true,
		message: 'Parola a fost schimbată cu succes!',
		user: { id: userId, email, name: userName }
	});
};

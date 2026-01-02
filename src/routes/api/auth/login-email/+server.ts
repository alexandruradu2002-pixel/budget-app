// Login endpoint with email + password (fallback when email limit is reached)
// If user has password set, verify it. If not, set the password.
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSession, setSessionCookie } from '$lib/server/auth';
import { authRateLimiter, checkRateLimit } from '$lib/server/rate-limit';
import { logSecurity } from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import db from '$lib/server/db';
import crypto from 'crypto';
import { z } from 'zod';

const loginEmailSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(6, 'Password must be at least 6 characters')
});

// ============================================
// Hash password with salt
// ============================================
function hashPassword(password: string, salt: string): string {
	return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function generateSalt(): string {
	return crypto.randomBytes(16).toString('hex');
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
	const hash = hashPassword(password, salt);
	return hash === storedHash;
}

export const POST: RequestHandler = async (event) => {
	// Rate limiting - prevent brute force attacks
	const rateLimited = checkRateLimit(event, authRateLimiter);
	if (rateLimited) {
		logSecurity('Rate limit exceeded on login-email', {
			ip: event.getClientAddress()
		});
		return rateLimited;
	}

	let email: string;
	let password: string;
	
	try {
		const body = await event.request.json();
		const parsed = loginEmailSchema.parse(body);
		email = parsed.email.toLowerCase();
		password = parsed.password;
	} catch (err) {
		return json({ error: 'Invalid email or password format' }, { status: 400 });
	}

	const ipAddress = event.getClientAddress();

	// Check if user exists
	const userResult = await db.execute({
		sql: 'SELECT id, email, name, password_hash, password_salt FROM users WHERE email = ?',
		args: [email]
	});

	if (userResult.rows.length === 0) {
		// User doesn't exist - we can't create account without email verification
		// But if email limit is reached, we need to allow registration with password
		logSecurity('Login attempt for non-existent user during email limit', {
			email,
			ip: ipAddress
		});
		
		// Create user with password (email limit fallback)
		const salt = generateSalt();
		const passwordHash = hashPassword(password, salt);
		
		const insertResult = await db.execute({
			sql: `INSERT INTO users (email, name, password_hash, password_salt, roles) 
			      VALUES (?, ?, ?, ?, '["user"]')`,
			args: [email, email.split('@')[0], passwordHash, salt]
		});
		
		const userId = Number(insertResult.lastInsertRowid);
		
		logSecurity('New user created with password (email limit fallback)', {
			email,
			userId,
			ip: ipAddress
		});
		
		// Create session
		const userAgent = event.request.headers.get('user-agent') || undefined;
		const sessionId = await createSession(userId, userAgent, ipAddress);
		
		// Set session cookie
		const isProduction = env.NODE_ENV === 'production' || event.url.hostname !== 'localhost';
		setSessionCookie(event.cookies, sessionId, isProduction);
		
		return json({
			success: true,
			isNewUser: true,
			passwordSet: true,
			user: { id: userId, email, name: email.split('@')[0] }
		});
	}

	// User exists - check password
	const user = userResult.rows[0];
	const userId = user.id as number;
	const userName = user.name as string;
	const storedHash = user.password_hash as string | null;
	const storedSalt = user.password_salt as string | null;

	if (!storedHash || storedHash === '' || !storedSalt) {
		// User has no password set - set it now
		const salt = generateSalt();
		const passwordHash = hashPassword(password, salt);
		
		await db.execute({
			sql: 'UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?',
			args: [passwordHash, salt, userId]
		});
		
		logSecurity('Password set for existing user (email limit fallback)', {
			email,
			userId,
			ip: ipAddress
		});
		
		// Create session
		const userAgent = event.request.headers.get('user-agent') || undefined;
		const sessionId = await createSession(userId, userAgent, ipAddress);
		
		// Set session cookie
		const isProduction = env.NODE_ENV === 'production' || event.url.hostname !== 'localhost';
		setSessionCookie(event.cookies, sessionId, isProduction);
		
		return json({
			success: true,
			isNewUser: false,
			passwordSet: true,
			message: 'Password has been set for your account. You can use it to log in next time.',
			user: { id: userId, email, name: userName }
		});
	}

	// User has password - verify it
	if (!verifyPassword(password, storedHash, storedSalt)) {
		logSecurity('Failed password login attempt', {
			email,
			ip: ipAddress
		});
		return json({ error: 'Invalid password' }, { status: 401 });
	}

	// Password correct - create session
	logSecurity('Successful password login', {
		email,
		userId,
		ip: ipAddress
	});

	const userAgent = event.request.headers.get('user-agent') || undefined;
	const sessionId = await createSession(userId, userAgent, ipAddress);

	// Set session cookie
	const isProduction = env.NODE_ENV === 'production' || event.url.hostname !== 'localhost';
	setSessionCookie(event.cookies, sessionId, isProduction);

	return json({
		success: true,
		isNewUser: false,
		user: { id: userId, email, name: userName }
	});
};

// Session management for Budget App
import type { Cookies } from '@sveltejs/kit';
import type { Session } from '$lib/types';
import db from './db';
import crypto from 'crypto';
import { env } from '$env/dynamic/private';

const SESSION_DURATION_DAYS = 30;
const OTP_EXPIRY_MINUTES = 15;
const MAGIC_LINK_EXPIRY_MINUTES = 15;

// ============================================
// User Cap for Hosted Instances
// ============================================
const DEFAULT_USER_CAP = 50; // Free tier limit

export function getUserCap(): number {
	const cap = env.USER_CAP;
	if (cap) {
		const parsed = parseInt(cap, 10);
		if (!isNaN(parsed) && parsed > 0) return parsed;
	}
	return DEFAULT_USER_CAP;
}

export async function getCurrentUserCount(): Promise<number> {
	// Exclude demo user (ID 999) from count
	const result = await db.execute({
		sql: 'SELECT COUNT(*) as count FROM users WHERE id != 999',
		args: []
	});
	return Number(result.rows[0]?.count || 0);
}

export async function canCreateNewUser(): Promise<boolean> {
	// Self-hosted instances have no cap (set USER_CAP=0 or USER_CAP=unlimited)
	const capEnv = env.USER_CAP;
	if (capEnv === '0' || capEnv === 'unlimited') {
		return true;
	}
	
	const currentCount = await getCurrentUserCount();
	const cap = getUserCap();
	return currentCount < cap;
}

// ============================================
// Generate OTP (6 digits)
// ============================================
export function generateOTP(): string {
	return crypto.randomInt(100000, 999999).toString();
}

// ============================================
// Generate Magic Link Token
// ============================================
export function generateMagicToken(): string {
	return crypto.randomBytes(32).toString('hex');
}

// ============================================
// Create Auth Token (OTP or Magic Link)
// ============================================
export async function createAuthToken(
	email: string,
	type: 'magic_link' | 'otp',
	ipAddress?: string
): Promise<{ token: string; otp: string }> {
	// Clean up old tokens for this email
	await db.execute({
		sql: 'DELETE FROM auth_tokens WHERE email = ? AND type = ?',
		args: [email.toLowerCase(), type]
	});

	const token = generateMagicToken();
	const otp = generateOTP();
	const expiryMinutes = type === 'magic_link' ? MAGIC_LINK_EXPIRY_MINUTES : OTP_EXPIRY_MINUTES;
	
	const expiresAt = new Date();
	expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

	await db.execute({
		sql: `INSERT INTO auth_tokens (email, token, type, expires_at, ip_address)
		      VALUES (?, ?, ?, ?, ?)`,
		args: [email.toLowerCase(), token, type, expiresAt.toISOString(), ipAddress || null]
	});

	// Also store OTP linked to the same magic link token
	if (type === 'magic_link') {
		await db.execute({
			sql: `INSERT INTO auth_tokens (email, token, type, expires_at, ip_address)
			      VALUES (?, ?, 'otp', ?, ?)`,
			args: [email.toLowerCase(), otp, expiresAt.toISOString(), ipAddress || null]
		});
	}

	return { token, otp };
}

// ============================================
// Verify Magic Link Token
// ============================================
export async function verifyMagicToken(token: string): Promise<string | null> {
	const result = await db.execute({
		sql: `SELECT email FROM auth_tokens 
		      WHERE token = ? 
		      AND type = 'magic_link' 
		      AND expires_at > datetime('now')
		      AND used_at IS NULL`,
		args: [token]
	});

	if (result.rows.length === 0) {
		return null;
	}

	const email = result.rows[0].email as string;

	// Mark as used
	await db.execute({
		sql: 'UPDATE auth_tokens SET used_at = datetime("now") WHERE token = ?',
		args: [token]
	});

	// Also invalidate associated OTP
	await db.execute({
		sql: `UPDATE auth_tokens SET used_at = datetime("now") 
		      WHERE email = ? AND type = 'otp' AND used_at IS NULL`,
		args: [email]
	});

	return email;
}

// ============================================
// Verify OTP Code
// ============================================
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
	const result = await db.execute({
		sql: `SELECT id FROM auth_tokens 
		      WHERE email = ? 
		      AND token = ? 
		      AND type = 'otp' 
		      AND expires_at > datetime('now')
		      AND used_at IS NULL`,
		args: [email.toLowerCase(), otp]
	});

	if (result.rows.length === 0) {
		return false;
	}

	// Mark as used
	await db.execute({
		sql: 'UPDATE auth_tokens SET used_at = datetime("now") WHERE email = ? AND type IN ("otp", "magic_link") AND used_at IS NULL',
		args: [email.toLowerCase()]
	});

	return true;
}

// ============================================
// Cleanup Expired Auth Tokens
// ============================================
export async function cleanupExpiredAuthTokens(): Promise<number> {
	const result = await db.execute({
		sql: "DELETE FROM auth_tokens WHERE expires_at < datetime('now')",
		args: []
	});
	return Number(result.rowsAffected);
}

// ============================================
// Get or Create User by Email
// ============================================
export async function getOrCreateUser(
	email: string
): Promise<{ user: { id: number; email: string; name: string }; isNew: boolean } | null> {
	const normalizedEmail = email.toLowerCase();
	
	// Check if user exists
	const existing = await db.execute({
		sql: 'SELECT id, email, name FROM users WHERE email = ?',
		args: [normalizedEmail]
	});

	if (existing.rows.length > 0) {
		const user = existing.rows[0];
		return {
			user: {
				id: user.id as number,
				email: user.email as string,
				name: user.name as string
			},
			isNew: false
		};
	}

	// Check user cap before creating new user
	if (!(await canCreateNewUser())) {
		return null; // Cap reached
	}

	// Create new user - extract name from email
	const name = normalizedEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
	
	const result = await db.execute({
		sql: `INSERT INTO users (email, name, password_hash, roles) VALUES (?, ?, '', '["user"]')`,
		args: [normalizedEmail, name]
	});

	return {
		user: {
			id: Number(result.lastInsertRowid),
			email: normalizedEmail,
			name
		},
		isNew: true
	};
}

// ============================================
// Create Session
// ============================================
export async function createSession(
	userId: number,
	userAgent?: string,
	ipAddress?: string
): Promise<string> {
	const sessionId = crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

	await db.execute({
		sql: `INSERT INTO sessions (id, user_id, expires_at, user_agent, ip_address)
		      VALUES (?, ?, ?, ?, ?)`,
		args: [sessionId, userId, expiresAt.toISOString(), userAgent || null, ipAddress || null]
	});

	return sessionId;
}

// ============================================
// Get Session
// ============================================
export async function getSession(sessionId: string): Promise<Session | null> {
	const result = await db.execute({
		sql: `SELECT s.*, u.email, u.name, u.roles 
		      FROM sessions s 
		      JOIN users u ON s.user_id = u.id 
		      WHERE s.id = ? AND s.expires_at > datetime('now')`,
		args: [sessionId]
	});

	if (result.rows.length === 0) {
		return null;
	}

	const row = result.rows[0];
	return {
		id: row.id as string,
		userId: row.user_id as number,
		email: row.email as string,
		name: row.name as string,
		roles: JSON.parse(row.roles as string),
		expiresAt: new Date(row.expires_at as string)
	};
}

// ============================================
// Delete Session (Logout)
// ============================================
export async function deleteSession(sessionId: string): Promise<void> {
	await db.execute({
		sql: 'DELETE FROM sessions WHERE id = ?',
		args: [sessionId]
	});
}

// ============================================
// Extend Session (Sliding Expiration)
// ============================================
export async function extendSession(sessionId: string): Promise<void> {
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

	await db.execute({
		sql: 'UPDATE sessions SET expires_at = ? WHERE id = ?',
		args: [expiresAt.toISOString(), sessionId]
	});
}

// ============================================
// Cleanup Expired Sessions
// ============================================
export async function cleanupExpiredSessions(): Promise<number> {
	const result = await db.execute({
		sql: "DELETE FROM sessions WHERE expires_at < datetime('now')",
		args: []
	});
	return Number(result.rowsAffected);
}

// ============================================
// Delete All User Sessions (for logout everywhere)
// ============================================
export async function deleteAllUserSessions(userId: number): Promise<void> {
	await db.execute({
		sql: 'DELETE FROM sessions WHERE user_id = ?',
		args: [userId]
	});
}

// ============================================
// Cookie Helpers
// ============================================
export function setSessionCookie(
	cookies: Cookies,
	sessionId: string,
	isProduction: boolean
): void {
	cookies.set('session', sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: isProduction,
		maxAge: 60 * 60 * 24 * SESSION_DURATION_DAYS
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete('session', { path: '/' });
}

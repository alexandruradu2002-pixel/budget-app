// Session management for Budget App
import type { Cookies } from '@sveltejs/kit';
import type { Session } from '$lib/types';
import db from './db';
import crypto from 'crypto';

const SESSION_DURATION_DAYS = 30;

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

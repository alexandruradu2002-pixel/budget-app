// Middleware utilities
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

// ============================================
// User Payload Type
// ============================================
export interface UserPayload {
	userId: number;
	email: string;
	name: string;
	roles: string[];
}

// ============================================
// Require Authentication
// ============================================
export function requireAuth(event: RequestEvent): UserPayload {
	if (!event.locals.user) {
		throw error(401, 'Unauthorized');
	}
	return event.locals.user;
}

// ============================================
// Get User (Optional Auth)
// ============================================
export function getUserFromRequest(event: Pick<RequestEvent, 'locals'>): UserPayload | null {
	return event.locals.user || null;
}

// ============================================
// Require Role
// ============================================
export function requireRole(...allowedRoles: string[]) {
	return (event: RequestEvent): UserPayload => {
		const user = requireAuth(event);
		
		// Admin has access to everything
		if (user.roles.includes('admin')) {
			return user;
		}
		
		const hasRole = allowedRoles.some((role) => user.roles.includes(role));
		if (!hasRole) {
			throw error(403, `Forbidden: requires role ${allowedRoles.join(' or ')}`);
		}
		return user;
	};
}

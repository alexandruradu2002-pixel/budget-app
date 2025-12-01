// Middleware utilities
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

// ============================================
// Require Authentication
// ============================================
export function requireAuth(event: RequestEvent) {
	if (!event.locals.user) {
		throw error(401, 'Unauthorized');
	}
	return event.locals.user;
}

// ============================================
// Require Role
// ============================================
export function requireRole(...allowedRoles: string[]) {
	return (event: RequestEvent) => {
		const user = requireAuth(event);
		const hasRole = allowedRoles.some((role) => user.roles.includes(role));
		if (!hasRole) {
			throw error(403, 'Forbidden: Insufficient permissions');
		}
		return user;
	};
}

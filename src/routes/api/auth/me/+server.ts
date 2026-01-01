// Auth API - Current user
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	return json({
		userId: event.locals.user.userId,
		email: event.locals.user.email,
		name: event.locals.user.name,
		roles: event.locals.user.roles,
		isDemo: event.locals.user.isDemo ?? false
	});
};

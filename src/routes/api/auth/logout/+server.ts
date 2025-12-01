// Logout endpoint
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession, clearSessionCookie } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
	const sessionId = event.cookies.get('session');
	
	if (sessionId) {
		await deleteSession(sessionId);
		clearSessionCookie(event.cookies);
	}

	return json({ success: true });
};

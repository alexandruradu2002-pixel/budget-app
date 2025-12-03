// User Settings API - Theme preferences
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import db from '$lib/server/db';
import type { InValue } from '@libsql/client';

const VALID_THEMES = [
	'midnight-blue', 
	'emerald-dark', 
	'sunset-orange', 
	'royal-purple', 
	'ocean-teal',
	'rose-pink',
	'cyber-neon',
	'coffee-brown',
	'arctic-blue',
	'dracula'
];

// GET /api/user/settings - Get user settings (theme)
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const result = await db.execute({
		sql: 'SELECT theme FROM users WHERE id = ?',
		args: [user.userId] as InValue[]
	});

	const theme = result.rows[0]?.theme as string || 'midnight-blue';

	return json({ theme });
};

// PUT /api/user/settings - Update user settings (theme)
export const PUT: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const body = await event.request.json();
	const { theme } = body;

	if (!theme || !VALID_THEMES.includes(theme)) {
		return json({ error: 'Invalid theme' }, { status: 400 });
	}

	await db.execute({
		sql: 'UPDATE users SET theme = ? WHERE id = ?',
		args: [theme, user.userId] as InValue[]
	});

	return json({ success: true, theme });
};

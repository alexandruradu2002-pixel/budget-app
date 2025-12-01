import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import db from '$lib/server/db';

// GET /api/payees - Get all distinct payees for the user
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const url = event.url;
	const search = url.searchParams.get('search') || '';

	let sql = `
		SELECT DISTINCT description as name, COUNT(*) as usage_count
		FROM transactions
		WHERE user_id = ? AND description IS NOT NULL AND description != ''
	`;
	const args: any[] = [user.userId];

	if (search) {
		sql += ' AND LOWER(description) LIKE LOWER(?)';
		args.push(`%${search}%`);
	}

	sql += ' GROUP BY description ORDER BY usage_count DESC, description ASC LIMIT 100';

	const result = await db.execute({ sql, args });

	const payees = result.rows.map((row) => ({
		name: row.name as string,
		usage_count: row.usage_count as number
	}));

	return json({ payees });
};

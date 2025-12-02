import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import db from '$lib/server/db';

// GET /api/payees - Get all distinct payees for the user (from both payees table and transactions)
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const url = event.url;
	const search = url.searchParams.get('search') || '';

	// Query payees from both the payees table and transaction descriptions
	// Using UNION to combine and deduplicate
	let sql = `
		SELECT name, MAX(usage_count) as usage_count FROM (
			SELECT name, 0 as usage_count FROM payees WHERE user_id = ?
			UNION
			SELECT description as name, COUNT(*) as usage_count
			FROM transactions
			WHERE user_id = ? AND description IS NOT NULL AND description != ''
			GROUP BY description
		)
		WHERE name IS NOT NULL AND name != ''
	`;
	const args: any[] = [user.userId, user.userId];

	if (search) {
		sql += ' AND LOWER(name) LIKE LOWER(?)';
		args.push(`%${search}%`);
	}

	sql += ' GROUP BY name ORDER BY usage_count DESC, name ASC LIMIT 100';

	const result = await db.execute({ sql, args });

	const payees = result.rows.map((row) => ({
		name: row.name as string,
		usage_count: row.usage_count as number
	}));

	return json({ payees });
};

// POST /api/payees - Create a new payee
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const body = await event.request.json();
	const name = body.name?.trim();

	if (!name) {
		return json({ error: 'Payee name is required' }, { status: 400 });
	}

	try {
		// Insert payee, ignore if already exists (UNIQUE constraint)
		await db.execute({
			sql: 'INSERT OR IGNORE INTO payees (user_id, name) VALUES (?, ?)',
			args: [user.userId, name]
		});

		return json({ success: true, name }, { status: 201 });
	} catch (error) {
		console.error('Error creating payee:', error);
		return json({ error: 'Failed to create payee' }, { status: 500 });
	}
};

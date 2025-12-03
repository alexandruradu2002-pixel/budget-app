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
	let sql: string;
	const args: any[] = [];

	if (search) {
		// Search query - filter by name
		sql = `
			SELECT name, MAX(usage_count) as usage_count FROM (
				SELECT name, 0 as usage_count FROM payees WHERE user_id = ? AND LOWER(name) LIKE LOWER(?)
				UNION
				SELECT description as name, COUNT(*) as usage_count
				FROM transactions
				WHERE user_id = ? AND description IS NOT NULL AND description != '' AND LOWER(description) LIKE LOWER(?)
				GROUP BY description
			) as combined
			WHERE name IS NOT NULL AND name != ''
			GROUP BY name ORDER BY usage_count DESC, name ASC LIMIT 100
		`;
		args.push(user.userId, `%${search}%`, user.userId, `%${search}%`);
	} else {
		// No search - get all payees
		sql = `
			SELECT name, MAX(usage_count) as usage_count FROM (
				SELECT name, 0 as usage_count FROM payees WHERE user_id = ?
				UNION
				SELECT description as name, COUNT(*) as usage_count
				FROM transactions
				WHERE user_id = ? AND description IS NOT NULL AND description != ''
				GROUP BY description
			) as combined
			WHERE name IS NOT NULL AND name != ''
			GROUP BY name ORDER BY usage_count DESC, name ASC LIMIT 100
		`;
		args.push(user.userId, user.userId);
	}

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

// PUT /api/payees - Rename a payee (updates both payees table and all transactions)
export const PUT: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const body = await event.request.json();
	const oldName = body.oldName?.trim();
	const newName = body.newName?.trim();

	if (!oldName || !newName) {
		return json({ error: 'Both oldName and newName are required' }, { status: 400 });
	}

	if (oldName === newName) {
		return json({ success: true, message: 'No changes made' });
	}

	try {
		// Update in payees table
		await db.execute({
			sql: 'UPDATE payees SET name = ? WHERE user_id = ? AND name = ?',
			args: [newName, user.userId, oldName]
		});

		// Also insert if it didn't exist in payees table (was only from transactions)
		await db.execute({
			sql: 'INSERT OR IGNORE INTO payees (user_id, name) VALUES (?, ?)',
			args: [user.userId, newName]
		});

		// Update all transactions with this payee
		const updateResult = await db.execute({
			sql: 'UPDATE transactions SET description = ? WHERE user_id = ? AND description = ?',
			args: [newName, user.userId, oldName]
		});

		return json({ 
			success: true, 
			message: 'Payee renamed',
			transactionsUpdated: updateResult.rowsAffected || 0
		});
	} catch (error) {
		console.error('Error renaming payee:', error);
		return json({ error: 'Failed to rename payee' }, { status: 500 });
	}
};

// DELETE /api/payees - Delete a payee and unassign from transactions
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const url = event.url;
	const name = url.searchParams.get('name');

	if (!name) {
		return json({ error: 'Payee name is required' }, { status: 400 });
	}

	try {
		// Delete from payees table
		await db.execute({
			sql: 'DELETE FROM payees WHERE user_id = ? AND name = ?',
			args: [user.userId, name]
		});

		// Set description to empty string for all transactions with this payee
		// This makes them "unassigned" instead of keeping the deleted payee
		const updateResult = await db.execute({
			sql: "UPDATE transactions SET description = '' WHERE user_id = ? AND description = ?",
			args: [user.userId, name]
		});

		return json({ 
			success: true, 
			message: 'Payee deleted',
			transactionsUpdated: updateResult.rowsAffected || 0
		});
	} catch (error) {
		console.error('Error deleting payee:', error);
		return json({ error: 'Failed to delete payee' }, { status: 500 });
	}
};

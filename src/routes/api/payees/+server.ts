import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import db from '$lib/server/db';

// GET /api/payees - Get all distinct payees for the user (from both payees table and transactions)
// Query params:
//   - search: filter by name
//   - action=most-frequent-category&payee=<name>: get the most frequently used category for a payee
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const url = event.url;
	const action = url.searchParams.get('action');
	const search = url.searchParams.get('search') || '';

	// Handle most-frequent-category action
	if (action === 'most-frequent-category') {
		const payeeName = url.searchParams.get('payee');
		if (!payeeName) {
			return json({ error: 'Payee name is required' }, { status: 400 });
		}

		// Find the most frequently used category for this payee
		const result = await db.execute({
			sql: `
				SELECT t.category_id, c.name as category_name, COUNT(*) as count
				FROM transactions t
				LEFT JOIN categories c ON t.category_id = c.id
				WHERE t.user_id = ? AND t.description = ? AND t.category_id IS NOT NULL
				GROUP BY t.category_id
				ORDER BY count DESC
				LIMIT 1
			`,
			args: [user.userId, payeeName]
		});

		if (result.rows.length === 0) {
			return json({ category_id: null, category_name: null });
		}

		const row = result.rows[0];
		return json({
			category_id: row.category_id as number,
			category_name: row.category_name as string
		});
	}

	// Query payees from both the payees table and transaction descriptions

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
		// Check if newName already exists (this will be a merge operation)
		const existingPayee = await db.execute({
			sql: 'SELECT name FROM payees WHERE user_id = ? AND name = ?',
			args: [user.userId, newName]
		});
		
		// Also check if it exists as a transaction description
		const existingTransaction = await db.execute({
			sql: 'SELECT description FROM transactions WHERE user_id = ? AND description = ? LIMIT 1',
			args: [user.userId, newName]
		});
		
		const isMerge = existingPayee.rows.length > 0 || existingTransaction.rows.length > 0;

		// Update all transactions with the old payee name to the new name
		const updateResult = await db.execute({
			sql: 'UPDATE transactions SET description = ? WHERE user_id = ? AND description = ?',
			args: [newName, user.userId, oldName]
		});

		// Delete the old payee from payees table (it's now merged or renamed)
		await db.execute({
			sql: 'DELETE FROM payees WHERE user_id = ? AND name = ?',
			args: [user.userId, oldName]
		});

		// Insert the new payee name if it doesn't exist
		await db.execute({
			sql: 'INSERT OR IGNORE INTO payees (user_id, name) VALUES (?, ?)',
			args: [user.userId, newName]
		});

		return json({ 
			success: true, 
			message: isMerge ? 'Payees merged' : 'Payee renamed',
			merged: isMerge,
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

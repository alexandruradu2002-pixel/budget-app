import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import { transactionSchema } from '$lib/server/validation';
import db from '$lib/server/db';

// GET /api/transactions - Get all transactions for the user
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const url = event.url;
	const limit = parseInt(url.searchParams.get('limit') || '100');
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const startDate = url.searchParams.get('startDate');
	const endDate = url.searchParams.get('endDate');
	const accountId = url.searchParams.get('accountId');
	const categoryId = url.searchParams.get('categoryId');

	let sql = `
		SELECT 
			t.*,
			a.name as account_name,
			c.name as category_name,
			c.color as category_color,
			c.type as category_type
		FROM transactions t
		LEFT JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE t.user_id = ?
	`;
	const args: any[] = [user.userId];

	if (startDate) {
		sql += ' AND t.date >= ?';
		args.push(startDate);
	}
	if (endDate) {
		sql += ' AND t.date <= ?';
		args.push(endDate);
	}
	if (accountId) {
		sql += ' AND t.account_id = ?';
		args.push(parseInt(accountId));
	}
	if (categoryId) {
		sql += ' AND t.category_id = ?';
		args.push(parseInt(categoryId));
	}

	sql += ' ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?';
	args.push(limit, offset);

	const result = await db.execute({ sql, args });

	const transactions = result.rows.map((row) => ({
		id: row.id,
		user_id: row.user_id,
		account_id: row.account_id,
		category_id: row.category_id,
		amount: row.amount,
		description: row.description,
		date: row.date,
		notes: row.notes,
		tags: row.tags ? JSON.parse(row.tags as string) : [],
		created_at: row.created_at,
		updated_at: row.updated_at,
		account_name: row.account_name,
		category_name: row.category_name,
		category_color: row.category_color,
		category_type: row.category_type
	}));

	return json({ transactions });
};

// POST /api/transactions - Create a new transaction
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const parsed = transactionSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.errors[0].message);
	}

	const { account_id, category_id, amount, description, date, notes, tags } = parsed.data;

	// Verify account belongs to user
	const accountCheck = await db.execute({
		sql: 'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
		args: [account_id, user.userId]
	});
	if (accountCheck.rows.length === 0) {
		throw error(404, 'Account not found');
	}

	// Verify category belongs to user
	const categoryCheck = await db.execute({
		sql: 'SELECT id FROM categories WHERE id = ? AND user_id = ?',
		args: [category_id, user.userId]
	});
	if (categoryCheck.rows.length === 0) {
		throw error(404, 'Category not found');
	}

	const result = await db.execute({
		sql: `
			INSERT INTO transactions (user_id, account_id, category_id, amount, description, date, notes, tags)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`,
		args: [user.userId, account_id, category_id, amount, description, date, notes || null, tags ? JSON.stringify(tags) : null]
	});

	// Update account balance
	await db.execute({
		sql: 'UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
		args: [amount, account_id]
	});

	return json({ id: Number(result.lastInsertRowid), message: 'Transaction created' }, { status: 201 });
};

// PUT /api/transactions - Update a transaction
export const PUT: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const { id, ...data } = body;
	if (!id) {
		throw error(400, 'Transaction ID is required');
	}

	const parsed = transactionSchema.safeParse(data);
	if (!parsed.success) {
		throw error(400, parsed.error.errors[0].message);
	}

	// Get old transaction to adjust balance
	const oldTx = await db.execute({
		sql: 'SELECT amount, account_id FROM transactions WHERE id = ? AND user_id = ?',
		args: [id, user.userId]
	});
	if (oldTx.rows.length === 0) {
		throw error(404, 'Transaction not found');
	}

	const oldAmount = oldTx.rows[0].amount as number;
	const oldAccountId = oldTx.rows[0].account_id as number;
	const { account_id, category_id, amount, description, date, notes, tags } = parsed.data;

	// Revert old balance
	await db.execute({
		sql: 'UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
		args: [oldAmount, oldAccountId]
	});

	// Update transaction
	await db.execute({
		sql: `
			UPDATE transactions 
			SET account_id = ?, category_id = ?, amount = ?, description = ?, date = ?, notes = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND user_id = ?
		`,
		args: [account_id, category_id, amount, description, date, notes || null, tags ? JSON.stringify(tags) : null, id, user.userId]
	});

	// Apply new balance
	await db.execute({
		sql: 'UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
		args: [amount, account_id]
	});

	return json({ message: 'Transaction updated' });
};

// DELETE /api/transactions - Delete a transaction
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const url = event.url;
	const id = url.searchParams.get('id');

	if (!id) {
		throw error(400, 'Transaction ID is required');
	}

	// Get transaction to revert balance
	const tx = await db.execute({
		sql: 'SELECT amount, account_id FROM transactions WHERE id = ? AND user_id = ?',
		args: [parseInt(id), user.userId]
	});
	if (tx.rows.length === 0) {
		throw error(404, 'Transaction not found');
	}

	const amount = tx.rows[0].amount as number;
	const accountId = tx.rows[0].account_id as number;

	// Delete transaction
	await db.execute({
		sql: 'DELETE FROM transactions WHERE id = ? AND user_id = ?',
		args: [parseInt(id), user.userId]
	});

	// Revert balance
	await db.execute({
		sql: 'UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
		args: [amount, accountId]
	});

	return json({ message: 'Transaction deleted' });
};

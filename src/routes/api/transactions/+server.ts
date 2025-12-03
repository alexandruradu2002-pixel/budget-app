import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { InValue } from '@libsql/client';
import { requireAuth } from '$lib/server/middleware';
import { transactionSchema } from '$lib/server/validation';
import { parseBody, parseSearchParams, verifyOwnership, successResponse, createdResponse } from '$lib/server/api-helpers';
import db from '$lib/server/db';

// GET /api/transactions - Get all transactions for the user
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const params = parseSearchParams(event.url);

	const limit = params.getInt('limit', 100)!;
	const offset = params.getInt('offset', 0)!;
	const startDate = params.getDate('startDate');
	const endDate = params.getDate('endDate');
	const accountId = params.getInt('accountId');
	const categoryId = params.getInt('categoryId');

	// Build WHERE clause for filtering
	let whereClause = 't.user_id = ?';
	const filterArgs: InValue[] = [user.userId];

	if (startDate) {
		whereClause += ' AND t.date >= ?';
		filterArgs.push(startDate);
	}
	if (endDate) {
		whereClause += ' AND t.date <= ?';
		filterArgs.push(endDate);
	}
	if (accountId) {
		whereClause += ' AND t.account_id = ?';
		filterArgs.push(accountId);
	}
	if (categoryId) {
		whereClause += ' AND t.category_id = ?';
		filterArgs.push(categoryId);
	}

	// Get total count
	const countResult = await db.execute({
		sql: `SELECT COUNT(*) as total FROM transactions t WHERE ${whereClause}`,
		args: filterArgs
	});
	const total = Number(countResult.rows[0].total);

	// Get transactions with pagination
	const sql = `
		SELECT 
			t.*,
			a.name as account_name,
			c.name as category_name,
			c.color as category_color,
			c.type as category_type
		FROM transactions t
		LEFT JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE ${whereClause}
		ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?
	`;
	const args: InValue[] = [...filterArgs, limit, offset];

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

	return successResponse({ transactions, total, limit, offset });
};

// POST /api/transactions - Create a new transaction
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const data = await parseBody(event, transactionSchema);

	const { account_id, amount, description, date } = data;
	const category_id = data.category_id ?? null;
	const payee = data.payee ?? null;
	const memo = data.memo ?? null;
	const flag = data.flag ?? null;
	const cleared = data.cleared ?? 'uncleared';
	const notes = data.notes ?? null;
	const tags = data.tags ? JSON.stringify(data.tags) : null;

	// Verify account belongs to user
	await verifyOwnership(db, 'accounts', account_id, user.userId, 'Account');

	// Verify category belongs to user (only if category_id is provided)
	if (category_id) {
		await verifyOwnership(db, 'categories', category_id, user.userId, 'Category');
	}

	const result = await db.execute({
		sql: `INSERT INTO transactions (user_id, account_id, category_id, amount, description, date, payee, memo, flag, cleared, notes, tags)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [user.userId, account_id, category_id, amount, description, date, payee, memo, flag, cleared, notes, tags]
	});

	// Update account balance
	await db.execute({
		sql: 'UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
		args: [amount, account_id]
	});

	return createdResponse({ id: Number(result.lastInsertRowid), message: 'Transaction created' });
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
	
	const { account_id, amount, description, date } = parsed.data;
	const category_id = parsed.data.category_id ?? null;
	const payee = parsed.data.payee ?? null;
	const memo = parsed.data.memo ?? null;
	const flag = parsed.data.flag ?? null;
	const cleared = parsed.data.cleared ?? 'uncleared';
	const notes = parsed.data.notes ?? null;
	const tags = parsed.data.tags ? JSON.stringify(parsed.data.tags) : null;

	// Revert old balance
	await db.execute({
		sql: 'UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
		args: [oldAmount, oldAccountId]
	});

	// Update transaction
	await db.execute({
		sql: `UPDATE transactions 
			  SET account_id = ?, category_id = ?, amount = ?, description = ?, date = ?, 
				  payee = ?, memo = ?, flag = ?, cleared = ?, notes = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
			  WHERE id = ? AND user_id = ?`,
		args: [account_id, category_id, amount, description, date, payee, memo, flag, cleared, notes, tags, id, user.userId]
	});

	// Apply new balance
	await db.execute({
		sql: 'UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
		args: [amount, account_id]
	});

	return successResponse({ message: 'Transaction updated' });
};

// DELETE /api/transactions - Delete a transaction
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const params = parseSearchParams(event.url);
	const id = params.getInt('id');

	if (!id) {
		throw error(400, 'Transaction ID is required');
	}

	// Get transaction to revert balance
	const tx = await db.execute({
		sql: 'SELECT amount, account_id FROM transactions WHERE id = ? AND user_id = ?',
		args: [id, user.userId]
	});
	if (tx.rows.length === 0) {
		throw error(404, 'Transaction not found');
	}

	const amount = tx.rows[0].amount as number;
	const accountId = tx.rows[0].account_id as number;

	// Delete transaction
	await db.execute({
		sql: 'DELETE FROM transactions WHERE id = ? AND user_id = ?',
		args: [id, user.userId]
	});

	// Revert balance
	await db.execute({
		sql: 'UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
		args: [amount, accountId]
	});

	return successResponse({ message: 'Transaction deleted' });
};

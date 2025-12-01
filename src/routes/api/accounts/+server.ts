import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import { accountSchema } from '$lib/server/validation';
import db from '$lib/server/db';

// GET /api/accounts - Get all accounts for the user
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const result = await db.execute({
		sql: 'SELECT * FROM accounts WHERE user_id = ? AND is_active = 1 ORDER BY name ASC',
		args: [user.userId]
	});

	const accounts = result.rows.map((row) => ({
		id: row.id,
		user_id: row.user_id,
		name: row.name,
		type: row.type,
		balance: row.balance,
		currency: row.currency,
		color: row.color,
		icon: row.icon,
		is_active: row.is_active === 1,
		created_at: row.created_at,
		updated_at: row.updated_at
	}));

	return json({ accounts });
};

// POST /api/accounts - Create a new account
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const parsed = accountSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.errors[0].message);
	}

	const { name, type, balance, currency, color, icon } = parsed.data;

	// Check for duplicate name
	const existing = await db.execute({
		sql: 'SELECT id FROM accounts WHERE user_id = ? AND name = ?',
		args: [user.userId, name]
	});
	if (existing.rows.length > 0) {
		throw error(409, 'Account with this name already exists');
	}

	const result = await db.execute({
		sql: `
			INSERT INTO accounts (user_id, name, type, balance, currency, color, icon)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`,
		args: [user.userId, name, type, balance, currency, color, icon || null]
	});

	return json({ id: Number(result.lastInsertRowid), message: 'Account created' }, { status: 201 });
};

// PUT /api/accounts - Update an account
export const PUT: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const { id, ...data } = body;
	if (!id) {
		throw error(400, 'Account ID is required');
	}

	const parsed = accountSchema.safeParse(data);
	if (!parsed.success) {
		throw error(400, parsed.error.errors[0].message);
	}

	// Verify ownership
	const check = await db.execute({
		sql: 'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
		args: [id, user.userId]
	});
	if (check.rows.length === 0) {
		throw error(404, 'Account not found');
	}

	const { name, type, balance, currency, color, icon } = parsed.data;

	await db.execute({
		sql: `
			UPDATE accounts 
			SET name = ?, type = ?, balance = ?, currency = ?, color = ?, icon = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ? AND user_id = ?
		`,
		args: [name, type, balance, currency, color, icon || null, id, user.userId]
	});

	return json({ message: 'Account updated' });
};

// DELETE /api/accounts - Soft delete an account
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const id = event.url.searchParams.get('id');

	if (!id) {
		throw error(400, 'Account ID is required');
	}

	// Verify ownership
	const check = await db.execute({
		sql: 'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
		args: [parseInt(id), user.userId]
	});
	if (check.rows.length === 0) {
		throw error(404, 'Account not found');
	}

	// Soft delete
	await db.execute({
		sql: 'UPDATE accounts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
		args: [parseInt(id), user.userId]
	});

	return json({ message: 'Account deleted' });
};

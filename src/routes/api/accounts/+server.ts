import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import { accountSchema } from '$lib/server/validation';
import { parseBody, verifyOwnership, createdResponse, successResponse, parseSearchParams } from '$lib/server/api-helpers';
import db from '$lib/server/db';

// GET /api/accounts - Get all accounts for the user
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const params = parseSearchParams(event.url);
	const includeInactive = params.getBoolean('includeInactive');

	const sql = includeInactive
		? 'SELECT * FROM accounts WHERE user_id = ? ORDER BY type ASC, sort_order ASC, name ASC'
		: 'SELECT * FROM accounts WHERE user_id = ? AND is_active = 1 ORDER BY type ASC, sort_order ASC, name ASC';

	const result = await db.execute({ sql, args: [user.userId] });

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
		sort_order: row.sort_order ?? 0,
		created_at: row.created_at,
		updated_at: row.updated_at
	}));

	return successResponse({ accounts });
};

// POST /api/accounts - Create a new account
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const data = await parseBody(event, accountSchema);

	const { name, type } = data;
	const balance = data.balance ?? 0;
	const currency = data.currency ?? 'RON';
	const color = data.color ?? '#3B82F6';
	const icon = data.icon ?? null;
	const notes = data.notes ?? null;

	// Check for duplicate name
	const existing = await db.execute({
		sql: 'SELECT id FROM accounts WHERE user_id = ? AND name = ?',
		args: [user.userId, name]
	});
	if (existing.rows.length > 0) {
		throw error(409, 'Account with this name already exists');
	}

	const result = await db.execute({
		sql: `INSERT INTO accounts (user_id, name, type, balance, currency, color, icon, notes)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [user.userId, name, type, balance, currency, color, icon, notes]
	});

	return createdResponse({ id: Number(result.lastInsertRowid), message: 'Account created' });
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

	await verifyOwnership(db, 'accounts', id, user.userId, 'Account');

	const { name, type } = parsed.data;
	const balance = parsed.data.balance ?? 0;
	const currency = parsed.data.currency ?? 'RON';
	const color = parsed.data.color ?? '#3B82F6';
	const icon = parsed.data.icon ?? null;

	await db.execute({
		sql: `UPDATE accounts 
			  SET name = ?, type = ?, balance = ?, currency = ?, color = ?, icon = ?, updated_at = CURRENT_TIMESTAMP
			  WHERE id = ? AND user_id = ?`,
		args: [name, type, balance, currency, color, icon, id, user.userId]
	});

	return successResponse({ message: 'Account updated' });
};

// DELETE /api/accounts - Soft delete an account
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const params = parseSearchParams(event.url);
	const id = params.getInt('id');

	if (!id) {
		throw error(400, 'Account ID is required');
	}

	await verifyOwnership(db, 'accounts', id, user.userId, 'Account');

	// Soft delete
	await db.execute({
		sql: 'UPDATE accounts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
		args: [id, user.userId]
	});

	return successResponse({ message: 'Account deleted' });
};

// PATCH /api/accounts - Reorder accounts
export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const { accounts } = body as { accounts: { id: number; sort_order: number }[] };
	
	if (!accounts || !Array.isArray(accounts)) {
		throw error(400, 'Accounts array is required');
	}

	// Update sort_order for each account
	for (const account of accounts) {
		await db.execute({
			sql: 'UPDATE accounts SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
			args: [account.sort_order, account.id, user.userId]
		});
	}

	return successResponse({ message: 'Accounts reordered' });
};

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { InValue } from '@libsql/client';
import { requireAuth } from '$lib/server/middleware';
import { categorySchema } from '$lib/server/validation';
import { parseBody, parseSearchParams, verifyOwnership, successResponse, createdResponse } from '$lib/server/api-helpers';
import db from '$lib/server/db';

// GET /api/categories - Get all categories for the user
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const params = parseSearchParams(event.url);
	const type = params.getString('type'); // 'expense' | 'income'

	let sql = 'SELECT * FROM categories WHERE user_id = ? AND is_active = 1';
	const args: InValue[] = [user.userId];

	if (type) {
		sql += ' AND type = ?';
		args.push(type);
	}

	sql += ' ORDER BY name ASC';

	const result = await db.execute({ sql, args });

	const categories = result.rows.map((row) => ({
		id: row.id,
		user_id: row.user_id,
		name: row.name,
		type: row.type,
		color: row.color,
		icon: row.icon,
		parent_id: row.parent_id,
		group_name: row.group_name || null,
		is_active: row.is_active === 1,
		is_hidden: row.is_hidden === 1 || false,
		created_at: row.created_at
	}));

	return successResponse({ categories });
};

// POST /api/categories - Create a new category
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const data = await parseBody(event, categorySchema);

	const { name, type } = data;
	const color = data.color ?? '#6B7280';
	const icon = data.icon ?? null;
	const parent_id = data.parent_id ?? null;

	// Check for duplicate name
	const existing = await db.execute({
		sql: 'SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ?',
		args: [user.userId, name, type]
	});
	if (existing.rows.length > 0) {
		throw error(409, 'Category with this name already exists');
	}

	const result = await db.execute({
		sql: `INSERT INTO categories (user_id, name, type, color, icon, parent_id)
			  VALUES (?, ?, ?, ?, ?, ?)`,
		args: [user.userId, name, type, color, icon, parent_id]
	});

	return createdResponse({ id: Number(result.lastInsertRowid), message: 'Category created' });
};

// PUT /api/categories - Update a category
export const PUT: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const { id, ...data } = body;
	if (!id) {
		throw error(400, 'Category ID is required');
	}

	const parsed = categorySchema.safeParse(data);
	if (!parsed.success) {
		throw error(400, parsed.error.errors[0].message);
	}

	await verifyOwnership(db, 'categories', id, user.userId, 'Category');

	const { name, type } = parsed.data;
	const color = parsed.data.color ?? '#6B7280';
	const icon = parsed.data.icon ?? null;
	const parent_id = parsed.data.parent_id ?? null;

	await db.execute({
		sql: `UPDATE categories 
			  SET name = ?, type = ?, color = ?, icon = ?, parent_id = ?
			  WHERE id = ? AND user_id = ?`,
		args: [name, type, color, icon, parent_id, id, user.userId]
	});

	return successResponse({ message: 'Category updated' });
};

// DELETE /api/categories - Soft delete a category
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const params = parseSearchParams(event.url);
	const id = params.getInt('id');

	if (!id) {
		throw error(400, 'Category ID is required');
	}

	await verifyOwnership(db, 'categories', id, user.userId, 'Category');

	// Soft delete
	await db.execute({
		sql: 'UPDATE categories SET is_active = 0 WHERE id = ? AND user_id = ?',
		args: [id, user.userId]
	});

	return successResponse({ message: 'Category deleted' });
};

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { InValue } from '@libsql/client';
import { requireAuth } from '$lib/server/middleware';
import { successResponse, createdResponse, parseSearchParams } from '$lib/server/api-helpers';
import db from '$lib/server/db';

// GET /api/category-groups - Get all category groups for the user
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const result = await db.execute({
		sql: 'SELECT * FROM category_groups WHERE user_id = ? ORDER BY sort_order ASC, name ASC',
		args: [user.userId]
	});

	const groups = result.rows.map((row) => ({
		id: row.id,
		user_id: row.user_id,
		name: row.name,
		sort_order: row.sort_order || 0,
		created_at: row.created_at
	}));

	return successResponse({ groups });
};

// POST /api/category-groups - Create a new category group
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();
	
	const name = body.name?.trim();
	if (!name) {
		throw error(400, 'Group name is required');
	}

	// Check for duplicate name
	const existing = await db.execute({
		sql: 'SELECT id FROM category_groups WHERE user_id = ? AND name = ?',
		args: [user.userId, name]
	});
	if (existing.rows.length > 0) {
		throw error(409, 'A group with this name already exists');
	}

	// Get max sort_order
	const maxOrder = await db.execute({
		sql: 'SELECT MAX(sort_order) as max_order FROM category_groups WHERE user_id = ?',
		args: [user.userId]
	});
	const sortOrder = ((maxOrder.rows[0]?.max_order as number) || 0) + 1;

	const result = await db.execute({
		sql: 'INSERT INTO category_groups (user_id, name, sort_order) VALUES (?, ?, ?)',
		args: [user.userId, name, sortOrder]
	});

	return createdResponse({ id: Number(result.lastInsertRowid), message: 'Group created' });
};

// PUT /api/category-groups - Update a category group (rename)
export const PUT: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const { id, name: newName, old_name: oldName } = body;
	const trimmedName = newName?.trim();
	
	if (!trimmedName) {
		throw error(400, 'Group name is required');
	}

	// If we have an id, update by id
	if (id) {
		// Check ownership
		const existing = await db.execute({
			sql: 'SELECT id FROM category_groups WHERE id = ? AND user_id = ?',
			args: [id, user.userId]
		});
		if (existing.rows.length === 0) {
			throw error(404, 'Group not found');
		}

		// Check for duplicate name
		const duplicate = await db.execute({
			sql: 'SELECT id FROM category_groups WHERE user_id = ? AND name = ? AND id != ?',
			args: [user.userId, trimmedName, id]
		});
		if (duplicate.rows.length > 0) {
			throw error(409, 'A group with this name already exists');
		}

		// Get old name before updating
		const oldGroup = await db.execute({
			sql: 'SELECT name FROM category_groups WHERE id = ?',
			args: [id]
		});
		const previousName = oldGroup.rows[0]?.name as string;

		// Update group name
		await db.execute({
			sql: 'UPDATE category_groups SET name = ? WHERE id = ? AND user_id = ?',
			args: [trimmedName, id, user.userId]
		});

		// Update all categories with this group_name
		if (previousName) {
			await db.execute({
				sql: 'UPDATE categories SET group_name = ? WHERE user_id = ? AND group_name = ?',
				args: [trimmedName, user.userId, previousName]
			});
		}
	} 
	// Otherwise update by old_name
	else if (oldName) {
		// Check for duplicate name
		const duplicate = await db.execute({
			sql: 'SELECT id FROM category_groups WHERE user_id = ? AND name = ? AND name != ?',
			args: [user.userId, trimmedName, oldName]
		});
		if (duplicate.rows.length > 0) {
			throw error(409, 'A group with this name already exists');
		}

		// Update group name in category_groups table
		await db.execute({
			sql: 'UPDATE category_groups SET name = ? WHERE user_id = ? AND name = ?',
			args: [trimmedName, user.userId, oldName]
		});

		// Update all categories with this group_name
		await db.execute({
			sql: 'UPDATE categories SET group_name = ? WHERE user_id = ? AND group_name = ?',
			args: [trimmedName, user.userId, oldName]
		});
	} else {
		throw error(400, 'Either id or old_name is required');
	}

	return successResponse({ message: 'Group updated' });
};

// DELETE /api/category-groups - Delete a category group
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const params = parseSearchParams(event.url);
	const id = params.getInt('id');
	const name = params.getString('name');

	if (!id && !name) {
		throw error(400, 'Group ID or name is required');
	}

	if (id) {
		// Check ownership
		const existing = await db.execute({
			sql: 'SELECT name FROM category_groups WHERE id = ? AND user_id = ?',
			args: [id, user.userId]
		});
		if (existing.rows.length === 0) {
			throw error(404, 'Group not found');
		}

		const groupName = existing.rows[0].name as string;

		// Move categories to uncategorized
		await db.execute({
			sql: 'UPDATE categories SET group_name = NULL WHERE user_id = ? AND group_name = ?',
			args: [user.userId, groupName]
		});

		// Delete group
		await db.execute({
			sql: 'DELETE FROM category_groups WHERE id = ? AND user_id = ?',
			args: [id, user.userId]
		});
	} else if (name) {
		// Move categories to uncategorized
		await db.execute({
			sql: 'UPDATE categories SET group_name = NULL WHERE user_id = ? AND group_name = ?',
			args: [user.userId, name]
		});

		// Delete group
		await db.execute({
			sql: 'DELETE FROM category_groups WHERE user_id = ? AND name = ?',
			args: [user.userId, name]
		});
	}

	return successResponse({ message: 'Group deleted' });
};

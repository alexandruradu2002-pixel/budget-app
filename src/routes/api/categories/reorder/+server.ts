import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { InValue } from '@libsql/client';
import { requireAuth } from '$lib/server/middleware';
import { successResponse } from '$lib/server/api-helpers';
import db from '$lib/server/db';

// POST /api/categories/reorder - Reorder categories within a group
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const { group_name, category_ids } = body;

	if (!category_ids || !Array.isArray(category_ids)) {
		throw error(400, 'category_ids array is required');
	}

	// Update sort_order for each category
	for (let i = 0; i < category_ids.length; i++) {
		const categoryId = category_ids[i];
		const sortOrder = i + 1;

		await db.execute({
			sql: `UPDATE categories 
				  SET sort_order = ?, group_name = ?
				  WHERE id = ? AND user_id = ?`,
			args: [sortOrder, group_name || null, categoryId, user.userId]
		});
	}

	return successResponse({ message: 'Categories reordered' });
};

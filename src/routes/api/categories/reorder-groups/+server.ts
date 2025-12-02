import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import { successResponse } from '$lib/server/api-helpers';
import db from '$lib/server/db';

// POST /api/categories/reorder-groups - Reorder category groups
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const { group_order } = body;

	if (!group_order || !Array.isArray(group_order)) {
		throw error(400, 'group_order array is required');
	}

	// Update group_sort_order for each group by setting it on all categories in that group
	for (let i = 0; i < group_order.length; i++) {
		const groupName = group_order[i];
		const sortOrder = i + 1;

		// Update categories table
		await db.execute({
			sql: `UPDATE categories 
				  SET group_sort_order = ?
				  WHERE (group_name = ? OR (group_name IS NULL AND ? = 'Uncategorized'))
				  AND user_id = ?`,
			args: [sortOrder, groupName, groupName, user.userId]
		});

		// Update category_groups table (if it's not Uncategorized)
		if (groupName !== 'Uncategorized') {
			await db.execute({
				sql: `UPDATE category_groups 
					  SET sort_order = ?
					  WHERE name = ? AND user_id = ?`,
				args: [sortOrder, groupName, user.userId]
			});
		}
	}

	return successResponse({ message: 'Groups reordered' });
};

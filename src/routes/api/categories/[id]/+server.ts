import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { InValue } from '@libsql/client';
import { requireAuth } from '$lib/server/middleware';
import { verifyOwnership, successResponse } from '$lib/server/api-helpers';
import db from '$lib/server/db';

// GET /api/categories/[id] - Get category details with statistics
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const categoryId = Number(event.params.id);

	if (!categoryId || isNaN(categoryId)) {
		throw error(400, 'Invalid category ID');
	}

	// Verify ownership
	await verifyOwnership(db, 'categories', categoryId, user.userId, 'Category');

	// Get category details
	const categoryResult = await db.execute({
		sql: 'SELECT * FROM categories WHERE id = ? AND user_id = ?',
		args: [categoryId, user.userId]
	});

	if (categoryResult.rows.length === 0) {
		throw error(404, 'Category not found');
	}

	const categoryRow = categoryResult.rows[0];
	const category = {
		id: categoryRow.id,
		user_id: categoryRow.user_id,
		name: categoryRow.name,
		type: categoryRow.type,
		color: categoryRow.color,
		icon: categoryRow.icon,
		group_name: categoryRow.group_name,
		is_active: categoryRow.is_active === 1,
		is_hidden: categoryRow.is_hidden === 1,
		created_at: categoryRow.created_at
	};

	// Get monthly spending for the last 12 months
	const monthlyStats = await db.execute({
		sql: `
			SELECT 
				strftime('%Y-%m', date) as month,
				SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) as spending,
				SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
				COUNT(*) as transaction_count
			FROM transactions
			WHERE user_id = ? AND category_id = ?
				AND date >= date('now', '-12 months')
			GROUP BY strftime('%Y-%m', date)
			ORDER BY month ASC
		`,
		args: [user.userId, categoryId]
	});

	// Get target/budget for this category
	const targetResult = await db.execute({
		sql: `
			SELECT * FROM budgets 
			WHERE user_id = ? AND category_id = ? AND is_active = 1
			ORDER BY created_at DESC LIMIT 1
		`,
		args: [user.userId, categoryId]
	});

	const target = targetResult.rows.length > 0 ? {
		id: targetResult.rows[0].id,
		amount: targetResult.rows[0].amount,
		currency: targetResult.rows[0].currency || 'RON',
		period: targetResult.rows[0].period,
		start_date: targetResult.rows[0].start_date,
		end_date: targetResult.rows[0].end_date
	} : null;

	return successResponse({
		category,
		monthlyStats: monthlyStats.rows.map(row => ({
			month: row.month,
			spending: Number(row.spending) || 0,
			income: Number(row.income) || 0,
			transactionCount: Number(row.transaction_count) || 0
		})),
		target
	});
};

// POST /api/categories/[id] - Set/update target for category
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const categoryId = Number(event.params.id);

	if (!categoryId || isNaN(categoryId)) {
		throw error(400, 'Invalid category ID');
	}

	// Verify ownership
	await verifyOwnership(db, 'categories', categoryId, user.userId, 'Category');

	const body = await event.request.json();
	const { amount, period = 'monthly', currency = 'RON' } = body;

	if (typeof amount !== 'number' || amount < 0) {
		throw error(400, 'Amount must be a positive number');
	}

	// Deactivate existing targets for this category
	await db.execute({
		sql: 'UPDATE budgets SET is_active = 0 WHERE user_id = ? AND category_id = ?',
		args: [user.userId, categoryId]
	});

	// Create new target if amount > 0
	if (amount > 0) {
		const startDate = new Date().toISOString().split('T')[0];
		await db.execute({
			sql: `INSERT INTO budgets (user_id, category_id, amount, period, currency, start_date, is_active)
				  VALUES (?, ?, ?, ?, ?, ?, 1)`,
			args: [user.userId, categoryId, amount, period, currency, startDate]
		});
	}

	return successResponse({ message: 'Target updated successfully' });
};

// DELETE /api/categories/[id] - Remove target for category
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const categoryId = Number(event.params.id);

	if (!categoryId || isNaN(categoryId)) {
		throw error(400, 'Invalid category ID');
	}

	// Verify ownership
	await verifyOwnership(db, 'categories', categoryId, user.userId, 'Category');

	// Deactivate all targets for this category
	await db.execute({
		sql: 'UPDATE budgets SET is_active = 0 WHERE user_id = ? AND category_id = ?',
		args: [user.userId, categoryId]
	});

	return successResponse({ message: 'Target removed successfully' });
};

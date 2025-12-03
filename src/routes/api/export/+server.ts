import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import { successResponse } from '$lib/server/api-helpers';
import db from '$lib/server/db';
import type { InValue } from '@libsql/client';

// Helper to escape CSV values
function escapeCSV(value: unknown): string {
	if (value === null || value === undefined) return '';
	const str = String(value);
	// Escape quotes and wrap in quotes if contains comma, quote, or newline
	if (str.includes(',') || str.includes('"') || str.includes('\n')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

// Helper to convert rows to CSV
function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
	const header = columns.join(',');
	const lines = rows.map((row) => columns.map((col) => escapeCSV(row[col])).join(','));
	return [header, ...lines].join('\n');
}

// Export all user data as CSV (multiple tables)
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const format = event.url.searchParams.get('format') || 'json';
	const table = event.url.searchParams.get('table'); // Optional: export single table

	const args: InValue[] = [user.userId];

	// Fetch all user data
	const [accounts, categories, transactions, budgets, budgetAllocations, payees, categoryGroups] =
		await Promise.all([
			db.execute({
				sql: 'SELECT * FROM accounts WHERE user_id = ? ORDER BY name',
				args
			}),
			db.execute({
				sql: 'SELECT * FROM categories WHERE user_id = ? ORDER BY group_name, name',
				args
			}),
			db.execute({
				sql: `SELECT t.*, a.name as account_name, c.name as category_name 
				      FROM transactions t 
				      LEFT JOIN accounts a ON t.account_id = a.id 
				      LEFT JOIN categories c ON t.category_id = c.id 
				      WHERE t.user_id = ? 
				      ORDER BY t.date DESC`,
				args
			}),
			db.execute({
				sql: 'SELECT * FROM budgets WHERE user_id = ?',
				args
			}),
			db.execute({
				sql: 'SELECT * FROM budget_allocations WHERE user_id = ? ORDER BY month DESC',
				args
			}),
			db.execute({
				sql: 'SELECT * FROM payees WHERE user_id = ? ORDER BY name',
				args
			}),
			db.execute({
				sql: 'SELECT * FROM category_groups WHERE user_id = ? ORDER BY sort_order',
				args
			})
		]);

	const data = {
		exportDate: new Date().toISOString(),
		version: '1.0',
		accounts: accounts.rows,
		categories: categories.rows,
		transactions: transactions.rows,
		budgets: budgets.rows,
		budgetAllocations: budgetAllocations.rows,
		payees: payees.rows,
		categoryGroups: categoryGroups.rows
	};

	// Single table export
	if (table && format === 'csv') {
		const tableData: Record<string, unknown[]> = {
			accounts: accounts.rows as unknown[],
			categories: categories.rows as unknown[],
			transactions: transactions.rows as unknown[],
			budgets: budgets.rows as unknown[],
			budget_allocations: budgetAllocations.rows as unknown[],
			payees: payees.rows as unknown[],
			category_groups: categoryGroups.rows as unknown[]
		};

		const rows = tableData[table];
		if (!rows) {
			return new Response(JSON.stringify({ error: 'Invalid table name' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (rows.length === 0) {
			return new Response('', {
				headers: {
					'Content-Type': 'text/csv',
					'Content-Disposition': `attachment; filename="${table}_${new Date().toISOString().split('T')[0]}.csv"`
				}
			});
		}

		const columns = Object.keys(rows[0] as Record<string, unknown>);
		const csv = toCSV(rows as Record<string, unknown>[], columns);

		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="${table}_${new Date().toISOString().split('T')[0]}.csv"`
			}
		});
	}

	// JSON export (default) - includes all data
	if (format === 'json') {
		const jsonStr = JSON.stringify(data, null, 2);
		return new Response(jsonStr, {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="budget_backup_${new Date().toISOString().split('T')[0]}.json"`
			}
		});
	}

	// CSV ZIP-like format (multiple CSVs concatenated with headers)
	if (format === 'csv') {
		const sections: string[] = [];

		// Transactions (most important)
		if (transactions.rows.length > 0) {
			const txCols = [
				'id',
				'date',
				'amount',
				'description',
				'payee',
				'account_name',
				'category_name',
				'memo',
				'cleared',
				'flag'
			];
			sections.push('### TRANSACTIONS ###');
			sections.push(toCSV(transactions.rows as Record<string, unknown>[], txCols));
		}

		// Accounts
		if (accounts.rows.length > 0) {
			const accCols = ['id', 'name', 'type', 'balance', 'currency', 'color', 'is_active'];
			sections.push('\n### ACCOUNTS ###');
			sections.push(toCSV(accounts.rows as Record<string, unknown>[], accCols));
		}

		// Categories
		if (categories.rows.length > 0) {
			const catCols = ['id', 'name', 'type', 'group_name', 'color', 'is_active'];
			sections.push('\n### CATEGORIES ###');
			sections.push(toCSV(categories.rows as Record<string, unknown>[], catCols));
		}

		// Budget Allocations
		if (budgetAllocations.rows.length > 0) {
			const budCols = ['id', 'category_id', 'month', 'assigned', 'activity', 'available'];
			sections.push('\n### BUDGET_ALLOCATIONS ###');
			sections.push(toCSV(budgetAllocations.rows as Record<string, unknown>[], budCols));
		}

		// Payees
		if (payees.rows.length > 0) {
			const payCols = ['id', 'name'];
			sections.push('\n### PAYEES ###');
			sections.push(toCSV(payees.rows as Record<string, unknown>[], payCols));
		}

		const csv = sections.join('\n');
		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="budget_backup_${new Date().toISOString().split('T')[0]}.csv"`
			}
		});
	}

	return successResponse(data);
};

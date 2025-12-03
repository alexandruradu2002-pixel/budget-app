// Dashboard API endpoint
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import db from '$lib/server/db';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	// Get total balance across all accounts
	const balanceResult = await db.execute({
		sql: 'SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ? AND is_active = 1',
		args: [user.userId]
	});
	const totalBalance = (balanceResult.rows[0]?.total as number) || 0;

	// Get current month's income
	const startOfMonth = new Date();
	startOfMonth.setDate(1);
	startOfMonth.setHours(0, 0, 0, 0);
	const monthStart = startOfMonth.toISOString().split('T')[0];

	const incomeResult = await db.execute({
		sql: `SELECT COALESCE(SUM(amount), 0) as total 
		      FROM transactions 
		      WHERE user_id = ? AND amount > 0 AND date >= ? AND transfer_account_id IS NULL`,
		args: [user.userId, monthStart]
	});
	const monthlyIncome = (incomeResult.rows[0]?.total as number) || 0;

	// Get current month's expenses (absolute value)
	const expensesResult = await db.execute({
		sql: `SELECT COALESCE(ABS(SUM(amount)), 0) as total 
		      FROM transactions 
		      WHERE user_id = ? AND amount < 0 AND date >= ? AND transfer_account_id IS NULL`,
		args: [user.userId, monthStart]
	});
	const monthlyExpenses = (expensesResult.rows[0]?.total as number) || 0;

	// Get active accounts count
	const accountsResult = await db.execute({
		sql: 'SELECT COUNT(*) as count FROM accounts WHERE user_id = ? AND is_active = 1',
		args: [user.userId]
	});
	const accountsCount = (accountsResult.rows[0]?.count as number) || 0;

	return json({
		totalBalance,
		monthlyIncome,
		monthlyExpenses,
		accountsCount
	});
};

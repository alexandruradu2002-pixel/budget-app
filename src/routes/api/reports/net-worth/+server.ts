import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import { successResponse } from '$lib/server/api-helpers';
import db from '$lib/server/db';

// GET /api/reports/net-worth - Get monthly net worth history
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	// Get all accounts for the user
	const accountsResult = await db.execute({
		sql: 'SELECT id, balance, type FROM accounts WHERE user_id = ? AND is_active = 1',
		args: [user.userId]
	});

	// Current total balance
	const currentBalance = accountsResult.rows.reduce((sum, acc) => {
		return sum + ((acc.balance as number) || 0);
	}, 0);

	// Get all transactions to reconstruct historical balances
	const transactionsResult = await db.execute({
		sql: `SELECT date, amount 
		      FROM transactions 
		      WHERE user_id = ? 
		      ORDER BY date DESC`,
		args: [user.userId]
	});

	// Find earliest transaction date
	let earliestDate = new Date();
	if (transactionsResult.rows.length > 0) {
		const dates = transactionsResult.rows.map((t) => new Date(t.date as string));
		earliestDate = new Date(Math.min(...dates.map((d) => d.getTime())));
	}

	// Generate monthly data from earliest transaction to current month
	const now = new Date();
	const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startMonth = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);

	// Build a map of cumulative transaction changes per month
	// We'll work backwards from current balance
	const monthlyChanges = new Map<string, number>();

	for (const tx of transactionsResult.rows) {
		const date = new Date(tx.date as string);
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const amount = (tx.amount as number) || 0;
		monthlyChanges.set(monthKey, (monthlyChanges.get(monthKey) || 0) + amount);
	}

	// Generate all months from start to current
	const months: { month: string; label: string; value: number }[] = [];
	let runningBalance = currentBalance;

	// Start from current month and go backwards
	const monthsToProcess: Date[] = [];
	let iterMonth = new Date(currentMonth);
	while (iterMonth >= startMonth) {
		monthsToProcess.push(new Date(iterMonth));
		iterMonth.setMonth(iterMonth.getMonth() - 1);
	}

	// Process in chronological order
	monthsToProcess.reverse();

	// Calculate forward from the earliest month
	// First, sum all changes from the earliest month to get the starting balance
	let totalChanges = 0;
	for (const [, change] of monthlyChanges) {
		totalChanges += change;
	}
	const startingBalance = currentBalance - totalChanges;

	// Now build forward
	runningBalance = startingBalance;
	for (const monthDate of monthsToProcess) {
		const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
		const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

		// Add this month's changes to get end-of-month balance
		runningBalance += monthlyChanges.get(monthKey) || 0;

		months.push({
			month: monthKey,
			label: monthLabel,
			value: Math.round(runningBalance * 100) / 100
		});
	}

	// Calculate assets and debts from account types
	let assets = 0;
	let debts = 0;

	for (const acc of accountsResult.rows) {
		const balance = (acc.balance as number) || 0;
		const type = acc.type as string;

		// Credit cards and loans are typically debt accounts
		if (type === 'credit_card' || type === 'loan' || type === 'line_of_credit') {
			if (balance < 0) {
				debts += Math.abs(balance);
			} else {
				assets += balance;
			}
		} else {
			// Checking, savings, cash, investment are asset accounts
			if (balance >= 0) {
				assets += balance;
			} else {
				debts += Math.abs(balance);
			}
		}
	}

	// Calculate monthly change
	const previousMonthValue = months.length >= 2 ? months[months.length - 2].value : currentBalance;
	const monthlyChange = currentBalance - previousMonthValue;
	const monthlyChangePercent =
		previousMonthValue !== 0 ? (monthlyChange / Math.abs(previousMonthValue)) * 100 : 0;

	return successResponse({
		currentNetWorth: currentBalance,
		assets: Math.round(assets * 100) / 100,
		debts: Math.round(debts * 100) / 100,
		monthlyChange: Math.round(monthlyChange * 100) / 100,
		monthlyChangePercent: Math.round(monthlyChangePercent * 10) / 10,
		history: months
	});
};

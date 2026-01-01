// Demo data generator for /demo page
// Generates realistic mock data for showcase purposes

import { ACCOUNT_TYPES, CATEGORY_TYPES, CLEARED_STATUSES } from '$lib/constants';
import type { Account, Category, Transaction } from '$lib/types';

// Deterministic random based on seed for consistent demo data
function seededRandom(seed: number) {
	return function() {
		seed = (seed * 1103515245 + 12345) & 0x7fffffff;
		return seed / 0x7fffffff;
	};
}

const random = seededRandom(42);

function randomBetween(min: number, max: number): number {
	return Math.floor(random() * (max - min + 1)) + min;
}

function randomFromArray<T>(arr: T[]): T {
	return arr[Math.floor(random() * arr.length)];
}

function randomDate(daysBack: number): string {
	const date = new Date();
	date.setDate(date.getDate() - randomBetween(0, daysBack));
	return date.toISOString().split('T')[0];
}

// Demo Accounts
export function generateDemoAccounts(): Account[] {
	return [
		{
			id: 1,
			user_id: 0,
			name: 'Cont Principal',
			type: 'checking',
			balance: 12450.75,
			currency: 'RON',
			color: '#22C55E',
			icon: undefined,
			notes: undefined,
			is_active: true,
			created_at: '2024-01-01',
			updated_at: new Date().toISOString()
		},
		{
			id: 2,
			user_id: 0,
			name: 'Economii',
			type: 'savings',
			balance: 35000.00,
			currency: 'RON',
			color: '#8B5CF6',
			icon: undefined,
			notes: undefined,
			is_active: true,
			created_at: '2024-01-01',
			updated_at: new Date().toISOString()
		},
		{
			id: 3,
			user_id: 0,
			name: 'Card Credit',
			type: 'credit_card',
			balance: -2340.50,
			currency: 'RON',
			color: '#EF4444',
			icon: undefined,
			notes: undefined,
			is_active: true,
			created_at: '2024-01-01',
			updated_at: new Date().toISOString()
		},
		{
			id: 4,
			user_id: 0,
			name: 'Cash',
			type: 'cash',
			balance: 450.00,
			currency: 'RON',
			color: '#F59E0B',
			icon: undefined,
			notes: undefined,
			is_active: true,
			created_at: '2024-01-01',
			updated_at: new Date().toISOString()
		},
		{
			id: 5,
			user_id: 0,
			name: 'Investiții ETF',
			type: 'investment',
			balance: 28500.00,
			currency: 'EUR',
			color: '#06B6D4',
			icon: undefined,
			notes: undefined,
			is_active: true,
			created_at: '2024-01-01',
			updated_at: new Date().toISOString()
		}
	];
}

// Demo Categories
export function generateDemoCategories(): Category[] {
	const expenseCategories = [
		{ id: 1, name: 'Supermarket', color: '#22C55E', icon: '🛒' },
		{ id: 2, name: 'Restaurante', color: '#F97316', icon: '🍕' },
		{ id: 3, name: 'Transport', color: '#3B82F6', icon: '🚗' },
		{ id: 4, name: 'Utilități', color: '#14B8A6', icon: '💡' },
		{ id: 5, name: 'Abonamente', color: '#EF4444', icon: '📺' },
		{ id: 6, name: 'Sănătate', color: '#10B981', icon: '💊' },
		{ id: 7, name: 'Îmbrăcăminte', color: '#8B5CF6', icon: '👕' },
		{ id: 8, name: 'Educație', color: '#06B6D4', icon: '📚' },
		{ id: 9, name: 'Divertisment', color: '#A855F7', icon: '🎬' },
		{ id: 10, name: 'Altele', color: '#6B7280', icon: '📦' }
	];

	const incomeCategories = [
		{ id: 11, name: 'Salariu', color: '#22C55E', icon: '💰' },
		{ id: 12, name: 'Freelance', color: '#3B82F6', icon: '💻' },
		{ id: 13, name: 'Dividende', color: '#8B5CF6', icon: '📈' },
		{ id: 14, name: 'Alte venituri', color: '#F59E0B', icon: '🎁' }
	];

	return [
		...expenseCategories.map(c => ({
			id: c.id,
			user_id: 0,
			name: c.name,
			type: 'expense' as const,
			color: c.color,
			icon: c.icon,
			parent_id: undefined,
			group_name: undefined,
			is_active: true,
			is_hidden: false,
			created_at: '2024-01-01'
		})),
		...incomeCategories.map(c => ({
			id: c.id,
			user_id: 0,
			name: c.name,
			type: 'income' as const,
			color: c.color,
			icon: c.icon,
			parent_id: undefined,
			group_name: undefined,
			is_active: true,
			is_hidden: false,
			created_at: '2024-01-01'
		}))
	];
}

// Demo Payees
const demoPayees = [
	'Kaufland', 'Lidl', 'Carrefour', 'Mega Image', 'Profi',
	'McDonald\'s', 'KFC', 'Starbucks', 'Dristor Kebap',
	'OMV', 'Petrom', 'MOL', 'Bolt', 'Uber',
	'Enel', 'E.ON', 'Digi', 'Orange', 'Vodafone',
	'Netflix', 'Spotify', 'YouTube Premium', 'HBO Max',
	'Farmacia Tei', 'Dr. Max', 'Catena',
	'H&M', 'Zara', 'Reserved', 'Decathlon',
	'Emag', 'Altex', 'Dedeman', 'IKEA'
];

// Demo Transactions
export function generateDemoTransactions(days: number = 90): Transaction[] {
	const accounts = generateDemoAccounts();
	const categories = generateDemoCategories();
	const transactions: Transaction[] = [];
	
	let id = 1;

	// Generate regular expenses
	for (let i = 0; i < 150; i++) {
		const category = randomFromArray(categories.filter(c => c.type === 'expense'));
		const account = randomFromArray(accounts.filter(a => a.type !== 'investment'));
		
		let amount: number;
		switch (category.name) {
			case 'Supermarket':
				amount = -randomBetween(50, 400);
				break;
			case 'Restaurante':
				amount = -randomBetween(30, 200);
				break;
			case 'Transport':
				amount = -randomBetween(20, 150);
				break;
			case 'Utilități':
				amount = -randomBetween(100, 500);
				break;
			case 'Abonamente':
				amount = -randomBetween(20, 80);
				break;
			case 'Sănătate':
				amount = -randomBetween(50, 300);
				break;
			case 'Îmbrăcăminte':
				amount = -randomBetween(100, 500);
				break;
			case 'Divertisment':
				amount = -randomBetween(50, 200);
				break;
			default:
				amount = -randomBetween(20, 200);
		}

		transactions.push({
			id: id++,
			user_id: 0,
			account_id: account.id,
			account_name: account.name,
			category_id: category.id,
			category_name: category.name,
			category_color: category.color,
			payee: randomFromArray(demoPayees),
			amount,
			description: '',
			date: randomDate(days),
			cleared: randomFromArray(['cleared', 'cleared', 'cleared', 'uncleared']) as 'cleared' | 'uncleared' | 'reconciled',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		});
	}

	// Generate monthly salaries
	for (let month = 0; month < 3; month++) {
		const date = new Date();
		date.setMonth(date.getMonth() - month);
		date.setDate(10); // Salary on 10th

		transactions.push({
			id: id++,
			user_id: 0,
			account_id: 1,
			account_name: 'Cont Principal',
			category_id: 11,
			category_name: 'Salariu',
			category_color: '#22C55E',
			payee: 'Angajator SRL',
			amount: 8500 + randomBetween(-500, 500),
			description: 'Salariu lunar',
			date: date.toISOString().split('T')[0],
			cleared: 'cleared',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		});
	}

	// Generate some freelance income
	for (let i = 0; i < 5; i++) {
		transactions.push({
			id: id++,
			user_id: 0,
			account_id: 1,
			account_name: 'Cont Principal',
			category_id: 12,
			category_name: 'Freelance',
			category_color: '#3B82F6',
			payee: randomFromArray(['Client Tech', 'Startup ABC', 'Agency XYZ', 'Consulting Pro']),
			amount: randomBetween(500, 3000),
			description: 'Proiect freelance',
			date: randomDate(days),
			cleared: 'cleared',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		});
	}

	// Sort by date descending
	transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return transactions;
}

// Demo Dashboard Stats
export function generateDemoStats() {
	const accounts = generateDemoAccounts();
	const transactions = generateDemoTransactions(30);
	
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	
	const monthlyTransactions = transactions.filter(t => new Date(t.date) >= monthStart);
	
	const monthlyIncome = monthlyTransactions
		.filter(t => t.amount > 0)
		.reduce((sum, t) => sum + t.amount, 0);
	
	const monthlyExpenses = Math.abs(
		monthlyTransactions
			.filter(t => t.amount < 0)
			.reduce((sum, t) => sum + t.amount, 0)
	);

	const totalBalance = accounts
		.filter(a => a.is_active && a.currency === 'RON')
		.reduce((sum, a) => sum + a.balance, 0);

	return {
		totalBalance,
		monthlyIncome,
		monthlyExpenses,
		accountsCount: accounts.length,
		savingsRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome * 100).toFixed(1) : 0
	};
}

// Demo Budgets
export function generateDemoBudgets() {
	const categories = generateDemoCategories().filter(c => c.type === 'expense');
	const transactions = generateDemoTransactions(30);
	
	return categories.slice(0, 8).map(category => {
		const spent = Math.abs(
			transactions
				.filter(t => t.category_id === category.id)
				.reduce((sum, t) => sum + t.amount, 0)
		);
		
		const budgeted = Math.round(spent * (1 + random() * 0.5)); // Budget is 100-150% of spent
		
		return {
			id: category.id,
			category_id: category.id,
			category_name: category.name,
			category_color: category.color,
			budgeted,
			spent,
			remaining: budgeted - spent,
			percentage: budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0
		};
	});
}

// Demo Spending by Category
export function generateDemoSpendingByCategory() {
	const categories = generateDemoCategories().filter(c => c.type === 'expense');
	const transactions = generateDemoTransactions(30);
	
	const spending = categories.map(category => {
		const amount = Math.abs(
			transactions
				.filter(t => t.category_id === category.id)
				.reduce((sum, t) => sum + t.amount, 0)
		);
		
		return {
			id: category.id,
			name: category.name,
			color: category.color,
			amount,
			count: transactions.filter(t => t.category_id === category.id).length
		};
	}).filter(c => c.amount > 0);
	
	const total = spending.reduce((sum, c) => sum + c.amount, 0);
	
	return spending
		.map(c => ({ ...c, percentage: Math.round((c.amount / total) * 100) }))
		.sort((a, b) => b.amount - a.amount);
}

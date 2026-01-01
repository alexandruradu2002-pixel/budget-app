// Demo data generator for /demo page
// Generates realistic mock data for showcase purposes
// All data is completely fictional for demonstration

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

// ============================================================
// FICTIONAL DEMO DATA - All names are made up for demonstration
// ============================================================

// Demo Accounts - Generic fictional bank accounts
export function generateDemoAccounts(): Account[] {
	return [
		{
			id: 1,
			user_id: 0,
			name: 'Primary Checking',
			type: 'checking',
			balance: 4825.50,
			currency: 'USD',
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
			name: 'Emergency Fund',
			type: 'savings',
			balance: 15000.00,
			currency: 'USD',
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
			name: 'Rewards Card',
			type: 'credit_card',
			balance: -1240.75,
			currency: 'USD',
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
			name: 'Wallet Cash',
			type: 'cash',
			balance: 180.00,
			currency: 'USD',
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
			name: 'Investment Portfolio',
			type: 'investment',
			balance: 32500.00,
			currency: 'USD',
			color: '#06B6D4',
			icon: undefined,
			notes: undefined,
			is_active: true,
			created_at: '2024-01-01',
			updated_at: new Date().toISOString()
		}
	];
}

// Demo Categories - Standard budget categories
export function generateDemoCategories(): Category[] {
	const expenseCategories = [
		{ id: 1, name: 'Groceries', color: '#22C55E', icon: '🛒' },
		{ id: 2, name: 'Dining Out', color: '#F97316', icon: '🍕' },
		{ id: 3, name: 'Transportation', color: '#3B82F6', icon: '🚗' },
		{ id: 4, name: 'Utilities', color: '#14B8A6', icon: '💡' },
		{ id: 5, name: 'Subscriptions', color: '#EF4444', icon: '📺' },
		{ id: 6, name: 'Healthcare', color: '#10B981', icon: '💊' },
		{ id: 7, name: 'Shopping', color: '#8B5CF6', icon: '👕' },
		{ id: 8, name: 'Education', color: '#06B6D4', icon: '📚' },
		{ id: 9, name: 'Entertainment', color: '#A855F7', icon: '🎬' },
		{ id: 10, name: 'Miscellaneous', color: '#6B7280', icon: '📦' }
	];

	const incomeCategories = [
		{ id: 11, name: 'Salary', color: '#22C55E', icon: '💰' },
		{ id: 12, name: 'Freelance', color: '#3B82F6', icon: '💻' },
		{ id: 13, name: 'Investments', color: '#8B5CF6', icon: '📈' },
		{ id: 14, name: 'Other Income', color: '#F59E0B', icon: '🎁' }
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

// Fictional Payees - Generic business names
const demoPayees: Record<string, string[]> = {
	Groceries: [
		'Fresh Market', 'Green Basket', 'Daily Mart', 'Corner Store', 
		'Sunrise Foods', 'Valley Grocers', 'Farm Fresh', 'Quick Stop'
	],
	'Dining Out': [
		'The Golden Fork', 'Blue Moon Cafe', 'Urban Bites', 'Sunset Grill',
		'Pizza Palace', 'Noodle House', 'Coffee Corner', 'Sweet Treats Bakery'
	],
	Transportation: [
		'City Fuel Station', 'Metro Transit', 'Quick Ride', 'Green Cab',
		'Auto Service Pro', 'Park & Go', 'Highway Express', 'Bike Share Co'
	],
	Utilities: [
		'Power Grid Co', 'Clear Water Utilities', 'City Gas Services', 
		'NetConnect ISP', 'Mobile Plus', 'Home Energy', 'TeleCom Services'
	],
	Subscriptions: [
		'StreamFlix', 'MusicFlow', 'CloudStore', 'NewsDaily',
		'FitLife App', 'GameZone Pro', 'Learning Hub', 'Photo Cloud'
	],
	Healthcare: [
		'City Pharmacy', 'Wellness Clinic', 'Dr. Smith Office', 
		'MediCare Center', 'HealthFirst', 'Vision Plus', 'Dental Care'
	],
	Shopping: [
		'Style Boutique', 'Tech World', 'Home Essentials', 'Book Nook',
		'Sports Gear', 'Fashion Hub', 'Gadget Store', 'Outdoor Living'
	],
	Education: [
		'Online Academy', 'Language School', 'Skill Workshop',
		'University Bookstore', 'Study Supplies', 'Learning Center'
	],
	Entertainment: [
		'Cinema City', 'Fun Zone', 'Concert Hall', 'Game Night',
		'Art Gallery', 'Museum Pass', 'Theme Park', 'Escape Room'
	],
	Miscellaneous: [
		'General Store', 'Quick Services', 'Local Shop', 'Community Market'
	]
};

const incomePayees: Record<string, string[]> = {
	Salary: ['Acme Corporation', 'Tech Solutions Inc', 'Global Enterprises'],
	Freelance: ['Design Client', 'Web Project', 'Consulting Gig', 'Creative Work'],
	Investments: ['Dividend Payment', 'Stock Sale', 'Bond Interest'],
	'Other Income': ['Gift Received', 'Refund', 'Cashback Reward', 'Side Project']
};

function getPayeeForCategory(categoryName: string, isIncome: boolean): string {
	if (isIncome) {
		const payees = incomePayees[categoryName] || incomePayees['Other Income'];
		return randomFromArray(payees);
	}
	const payees = demoPayees[categoryName] || demoPayees['Miscellaneous'];
	return randomFromArray(payees);
}

// Demo Transactions
export function generateDemoTransactions(days: number = 90): Transaction[] {
	const accounts = generateDemoAccounts();
	const categories = generateDemoCategories();
	const transactions: Transaction[] = [];
	
	let id = 1;

	// Generate regular expenses
	for (let i = 0; i < 120; i++) {
		const category = randomFromArray(categories.filter(c => c.type === 'expense'));
		const account = randomFromArray(accounts.filter(a => a.type !== 'investment'));
		
		let amount: number;
		switch (category.name) {
			case 'Groceries':
				amount = -randomBetween(25, 180);
				break;
			case 'Dining Out':
				amount = -randomBetween(12, 85);
				break;
			case 'Transportation':
				amount = -randomBetween(15, 120);
				break;
			case 'Utilities':
				amount = -randomBetween(50, 200);
				break;
			case 'Subscriptions':
				amount = -randomBetween(8, 50);
				break;
			case 'Healthcare':
				amount = -randomBetween(20, 150);
				break;
			case 'Shopping':
				amount = -randomBetween(30, 250);
				break;
			case 'Entertainment':
				amount = -randomBetween(15, 100);
				break;
			default:
				amount = -randomBetween(10, 100);
		}

		transactions.push({
			id: id++,
			user_id: 0,
			account_id: account.id,
			account_name: account.name,
			category_id: category.id,
			category_name: category.name,
			category_color: category.color,
			payee: getPayeeForCategory(category.name, false),
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
		date.setDate(15); // Salary on 15th

		transactions.push({
			id: id++,
			user_id: 0,
			account_id: 1,
			account_name: 'Primary Checking',
			category_id: 11,
			category_name: 'Salary',
			category_color: '#22C55E',
			payee: 'Acme Corporation',
			amount: 4200 + randomBetween(-200, 200),
			description: 'Monthly salary',
			date: date.toISOString().split('T')[0],
			cleared: 'cleared',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		});
	}

	// Generate some freelance income
	for (let i = 0; i < 4; i++) {
		transactions.push({
			id: id++,
			user_id: 0,
			account_id: 1,
			account_name: 'Primary Checking',
			category_id: 12,
			category_name: 'Freelance',
			category_color: '#3B82F6',
			payee: getPayeeForCategory('Freelance', true),
			amount: randomBetween(200, 1500),
			description: 'Freelance project',
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
		.filter(a => a.is_active)
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

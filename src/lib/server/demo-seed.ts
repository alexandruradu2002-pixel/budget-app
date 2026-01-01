// Demo user seed - creates a shared demo user with realistic data
// All data is fictional for demonstration purposes
import db from './db';

// Demo user has a fixed ID to be shared across all demo sessions
export const DEMO_USER_ID = 999;
export const DEMO_USER_EMAIL = 'demo@budget.app';

// Track if demo user is already seeded this session
let demoSeeded = false;

/**
 * Seeds the demo user with sample data.
 * This is idempotent - will not recreate data if it already exists.
 */
export async function seedDemoUser(): Promise<void> {
	// Quick check if already seeded this session
	if (demoSeeded) {
		return;
	}

	// Check if demo user already exists with data
	const existingUser = await db.execute({
		sql: 'SELECT id FROM users WHERE id = ?',
		args: [DEMO_USER_ID]
	});

	if (existingUser.rows.length > 0) {
		// Check if data exists
		const accountCount = await db.execute({
			sql: 'SELECT COUNT(*) as count FROM accounts WHERE user_id = ?',
			args: [DEMO_USER_ID]
		});

		if ((accountCount.rows[0].count as number) > 0) {
			demoSeeded = true;
			return;
		}
	}

	console.log('🎭 Seeding demo user...');

	// Create demo user if not exists
	if (existingUser.rows.length === 0) {
		await db.execute({
			sql: `INSERT INTO users (id, email, name, password_hash, roles) VALUES (?, ?, ?, ?, ?)`,
			args: [
				DEMO_USER_ID,
				DEMO_USER_EMAIL,
				'Demo User',
				'demo-not-for-login',
				'["demo"]' // Special demo role
			]
		});
	}

	// ============================================
	// Demo Accounts (USD based for international appeal)
	// ============================================
	const accounts = [
		{ name: 'Primary Checking', type: 'checking', balance: 4825.50, currency: 'USD', color: '#22C55E' },
		{ name: 'Savings Account', type: 'savings', balance: 15000.00, currency: 'USD', color: '#8B5CF6' },
		{ name: 'Credit Card', type: 'credit_card', balance: -1240.75, currency: 'USD', color: '#EF4444' },
		{ name: 'Cash Wallet', type: 'cash', balance: 180.00, currency: 'USD', color: '#F59E0B' },
		{ name: 'Investment Account', type: 'investment', balance: 32500.00, currency: 'USD', color: '#06B6D4' }
	];

	for (const acc of accounts) {
		await db.execute({
			sql: `INSERT INTO accounts (user_id, name, type, balance, currency, color) VALUES (?, ?, ?, ?, ?, ?)`,
			args: [DEMO_USER_ID, acc.name, acc.type, acc.balance, acc.currency, acc.color]
		});
	}
	console.log('✅ Created demo accounts');

	// ============================================
	// Demo Categories
	// ============================================
	const expenseCategories = [
		{ name: 'Groceries', color: '#22C55E', group_name: 'Essentials' },
		{ name: 'Dining Out', color: '#F97316', group_name: 'Essentials' },
		{ name: 'Transportation', color: '#3B82F6', group_name: 'Essentials' },
		{ name: 'Utilities', color: '#14B8A6', group_name: 'Bills' },
		{ name: 'Rent/Mortgage', color: '#6366F1', group_name: 'Bills' },
		{ name: 'Internet & Phone', color: '#8B5CF6', group_name: 'Bills' },
		{ name: 'Subscriptions', color: '#EF4444', group_name: 'Entertainment' },
		{ name: 'Entertainment', color: '#A855F7', group_name: 'Entertainment' },
		{ name: 'Shopping', color: '#EC4899', group_name: 'Lifestyle' },
		{ name: 'Healthcare', color: '#10B981', group_name: 'Health' },
		{ name: 'Personal Care', color: '#F59E0B', group_name: 'Health' },
		{ name: 'Education', color: '#06B6D4', group_name: 'Growth' },
		{ name: 'Savings Goal', color: '#84CC16', group_name: 'Goals' },
		{ name: 'Miscellaneous', color: '#6B7280', group_name: 'Other' }
	];

	const incomeCategories = [
		{ name: 'Salary', color: '#22C55E', group_name: 'Income' },
		{ name: 'Freelance', color: '#3B82F6', group_name: 'Income' },
		{ name: 'Investments', color: '#8B5CF6', group_name: 'Income' },
		{ name: 'Other Income', color: '#F59E0B', group_name: 'Income' }
	];

	for (const cat of expenseCategories) {
		await db.execute({
			sql: `INSERT INTO categories (user_id, name, type, color, group_name) VALUES (?, ?, 'expense', ?, ?)`,
			args: [DEMO_USER_ID, cat.name, cat.color, cat.group_name]
		});
	}

	for (const cat of incomeCategories) {
		await db.execute({
			sql: `INSERT INTO categories (user_id, name, type, color, group_name) VALUES (?, ?, 'income', ?, ?)`,
			args: [DEMO_USER_ID, cat.name, cat.color, cat.group_name]
		});
	}
	console.log('✅ Created demo categories');

	// Get created IDs for transactions
	const accResult = await db.execute({
		sql: 'SELECT id, name FROM accounts WHERE user_id = ?',
		args: [DEMO_USER_ID]
	});
	const catResult = await db.execute({
		sql: 'SELECT id, name FROM categories WHERE user_id = ?',
		args: [DEMO_USER_ID]
	});

	const accountMap = new Map(accResult.rows.map((r) => [r.name as string, r.id as number]));
	const categoryMap = new Map(catResult.rows.map((r) => [r.name as string, r.id as number]));

	// ============================================
	// Demo Transactions (last 90 days)
	// ============================================
	const today = new Date();
	const transactions: Array<{
		desc: string;
		payee: string;
		amount: number;
		daysAgo: number;
		account: string;
		category: string;
	}> = [];

	// Generate realistic transaction patterns
	const expensePayees: Record<string, string[]> = {
		'Groceries': ['Fresh Market', 'Whole Foods', 'Trader Joe\'s', 'Costco', 'Safeway'],
		'Dining Out': ['Starbucks', 'Chipotle', 'Local Pizza', 'Thai Kitchen', 'Burger Joint'],
		'Transportation': ['Shell Gas', 'Uber', 'Metro Transit', 'Parking Garage'],
		'Utilities': ['Electric Company', 'Water Utility', 'Gas Services'],
		'Rent/Mortgage': ['Apartment Complex'],
		'Internet & Phone': ['Verizon', 'Comcast'],
		'Subscriptions': ['Netflix', 'Spotify', 'Adobe CC', 'iCloud', 'NYT'],
		'Entertainment': ['AMC Cinema', 'Concert Tickets', 'Bowling Alley'],
		'Shopping': ['Amazon', 'Target', 'Best Buy', 'IKEA'],
		'Healthcare': ['CVS Pharmacy', 'Dr. Smith Office', 'Dental Care'],
		'Personal Care': ['Hair Salon', 'Gym Membership'],
		'Education': ['Online Course', 'Books & Materials'],
		'Savings Goal': ['Transfer to Savings'],
		'Miscellaneous': ['Random Purchase', 'Gift Shop']
	};

	const incomePayees: Record<string, string[]> = {
		'Salary': ['Employer Inc.'],
		'Freelance': ['Client Project', 'Consulting Work'],
		'Investments': ['Dividend Payment', 'Interest'],
		'Other Income': ['Refund', 'Cash Back']
	};

	// Monthly salary (1st and 15th)
	for (let month = 0; month < 3; month++) {
		transactions.push({
			desc: 'Bi-weekly Salary',
			payee: 'Employer Inc.',
			amount: 2750,
			daysAgo: month * 30 + 1,
			account: 'Primary Checking',
			category: 'Salary'
		});
		transactions.push({
			desc: 'Bi-weekly Salary',
			payee: 'Employer Inc.',
			amount: 2750,
			daysAgo: month * 30 + 15,
			account: 'Primary Checking',
			category: 'Salary'
		});
	}

	// Rent on 1st of each month
	for (let month = 0; month < 3; month++) {
		transactions.push({
			desc: 'Monthly Rent',
			payee: 'Apartment Complex',
			amount: -1500,
			daysAgo: month * 30,
			account: 'Primary Checking',
			category: 'Rent/Mortgage'
		});
	}

	// Regular bills
	const monthlyBills = [
		{ payee: 'Electric Company', amount: -85, category: 'Utilities' },
		{ payee: 'Comcast', amount: -79, category: 'Internet & Phone' },
		{ payee: 'Verizon', amount: -65, category: 'Internet & Phone' },
		{ payee: 'Netflix', amount: -15.99, category: 'Subscriptions' },
		{ payee: 'Spotify', amount: -10.99, category: 'Subscriptions' },
		{ payee: 'Gym Membership', amount: -29.99, category: 'Personal Care' }
	];

	for (let month = 0; month < 3; month++) {
		for (const bill of monthlyBills) {
			transactions.push({
				desc: bill.payee,
				payee: bill.payee,
				amount: bill.amount,
				daysAgo: month * 30 + Math.floor(Math.random() * 5) + 1,
				account: 'Primary Checking',
				category: bill.category
			});
		}
	}

	// Weekly groceries
	for (let week = 0; week < 12; week++) {
		const groceryStores = expensePayees['Groceries'];
		const store = groceryStores[week % groceryStores.length];
		transactions.push({
			desc: 'Weekly Groceries',
			payee: store,
			amount: -(80 + Math.floor(Math.random() * 60)),
			daysAgo: week * 7 + Math.floor(Math.random() * 3),
			account: 'Credit Card',
			category: 'Groceries'
		});
	}

	// Random dining out (2-3 times per week)
	for (let i = 0; i < 30; i++) {
		const restaurants = expensePayees['Dining Out'];
		transactions.push({
			desc: restaurants[Math.floor(Math.random() * restaurants.length)],
			payee: restaurants[Math.floor(Math.random() * restaurants.length)],
			amount: -(12 + Math.floor(Math.random() * 35)),
			daysAgo: Math.floor(Math.random() * 90),
			account: 'Credit Card',
			category: 'Dining Out'
		});
	}

	// Gas/transportation (weekly)
	for (let week = 0; week < 12; week++) {
		transactions.push({
			desc: 'Gas Station',
			payee: 'Shell Gas',
			amount: -(35 + Math.floor(Math.random() * 25)),
			daysAgo: week * 7 + Math.floor(Math.random() * 4),
			account: 'Credit Card',
			category: 'Transportation'
		});
	}

	// Random shopping
	for (let i = 0; i < 8; i++) {
		const shops = expensePayees['Shopping'];
		transactions.push({
			desc: 'Shopping',
			payee: shops[Math.floor(Math.random() * shops.length)],
			amount: -(25 + Math.floor(Math.random() * 150)),
			daysAgo: Math.floor(Math.random() * 90),
			account: 'Credit Card',
			category: 'Shopping'
		});
	}

	// Entertainment (occasional)
	for (let i = 0; i < 5; i++) {
		transactions.push({
			desc: 'Entertainment',
			payee: expensePayees['Entertainment'][Math.floor(Math.random() * expensePayees['Entertainment'].length)],
			amount: -(15 + Math.floor(Math.random() * 50)),
			daysAgo: Math.floor(Math.random() * 90),
			account: 'Credit Card',
			category: 'Entertainment'
		});
	}

	// Monthly savings transfer
	for (let month = 0; month < 3; month++) {
		transactions.push({
			desc: 'Transfer to Savings',
			payee: 'Transfer to Savings',
			amount: -500,
			daysAgo: month * 30 + 2,
			account: 'Primary Checking',
			category: 'Savings Goal'
		});
	}

	// Insert all transactions
	for (const tx of transactions) {
		const accountId = accountMap.get(tx.account);
		const categoryId = categoryMap.get(tx.category);
		const date = new Date(today);
		date.setDate(date.getDate() - tx.daysAgo);
		const dateStr = date.toISOString().split('T')[0];

		if (accountId && categoryId) {
			await db.execute({
				sql: `INSERT INTO transactions (user_id, account_id, category_id, amount, description, payee, date) 
					  VALUES (?, ?, ?, ?, ?, ?, ?)`,
				args: [DEMO_USER_ID, accountId, categoryId, tx.amount, tx.desc, tx.payee, dateStr]
			});
		}
	}
	console.log('✅ Created', transactions.length, 'demo transactions');

	// ============================================
	// Demo Budget Allocations (current month)
	// ============================================
	const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM

	const budgets = [
		{ category: 'Groceries', amount: 500 },
		{ category: 'Dining Out', amount: 200 },
		{ category: 'Transportation', amount: 300 },
		{ category: 'Utilities', amount: 150 },
		{ category: 'Rent/Mortgage', amount: 1500 },
		{ category: 'Internet & Phone', amount: 150 },
		{ category: 'Subscriptions', amount: 75 },
		{ category: 'Entertainment', amount: 100 },
		{ category: 'Shopping', amount: 200 },
		{ category: 'Healthcare', amount: 100 },
		{ category: 'Personal Care', amount: 75 },
		{ category: 'Savings Goal', amount: 500 }
	];

	for (const budget of budgets) {
		const categoryId = categoryMap.get(budget.category);
		if (categoryId) {
			await db.execute({
				sql: `INSERT INTO budget_allocations (user_id, category_id, month, assigned) VALUES (?, ?, ?, ?)`,
				args: [DEMO_USER_ID, categoryId, currentMonth, budget.amount]
			});
		}
	}
	console.log('✅ Created demo budget allocations');

	// ============================================
	// Demo Payees
	// ============================================
	const allPayees = new Set<string>();
	for (const payees of Object.values(expensePayees)) {
		payees.forEach(p => allPayees.add(p));
	}
	for (const payees of Object.values(incomePayees)) {
		payees.forEach(p => allPayees.add(p));
	}

	for (const payee of allPayees) {
		await db.execute({
			sql: `INSERT OR IGNORE INTO payees (user_id, name) VALUES (?, ?)`,
			args: [DEMO_USER_ID, payee]
		});
	}
	console.log('✅ Created demo payees');

	demoSeeded = true;
	console.log('🎭 Demo user seeding complete!');
}

/**
 * Checks if a user ID is the demo user
 */
export function isDemoUser(userId: number): boolean {
	return userId === DEMO_USER_ID;
}

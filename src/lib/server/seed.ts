// Seed script for development - adds initial accounts and categories
import db from './db';

export async function seedDatabase(userId: number) {
	console.log('🌱 Seeding database for user:', userId);

	// First, ensure the user exists
	const existingUser = await db.execute({
		sql: 'SELECT id FROM users WHERE id = ?',
		args: [userId]
	});
	
	if (existingUser.rows.length === 0) {
		// Create the default user
		await db.execute({
			sql: `INSERT INTO users (id, email, name, password_hash, roles) VALUES (?, ?, ?, ?, ?)`,
			args: [userId, 'alex@budget.app', 'Alex', 'not-used', '["admin", "user"]']
		});
		console.log('✅ Created default user');
	}

	// Check if already seeded
	const existingAccounts = await db.execute({
		sql: 'SELECT COUNT(*) as count FROM accounts WHERE user_id = ?',
		args: [userId]
	});
	if ((existingAccounts.rows[0].count as number) > 0) {
		console.log('✅ Database already seeded');
		return;
	}

	// ============================================
	// Accounts
	// ============================================
	const accounts = [
		{ name: 'BANI', type: 'checking', balance: 5000, currency: 'RON', color: '#22C55E' },
		{ name: 'SALARIU', type: 'checking', balance: 3500, currency: 'RON', color: '#3B82F6' },
		{ name: 'Economii', type: 'savings', balance: 15000, currency: 'RON', color: '#8B5CF6' },
		{ name: 'Cash', type: 'cash', balance: 500, currency: 'RON', color: '#F59E0B' }
	];

	for (const acc of accounts) {
		await db.execute({
			sql: `INSERT INTO accounts (user_id, name, type, balance, currency, color) VALUES (?, ?, ?, ?, ?, ?)`,
			args: [userId, acc.name, acc.type, acc.balance, acc.currency, acc.color]
		});
	}
	console.log('✅ Created', accounts.length, 'accounts');

	// ============================================
	// Expense Categories
	// ============================================
	const expenseCategories = [
		{ name: 'SuperMarchet', color: '#22C55E' },
		{ name: 'Restaurant/Cantina', color: '#F97316' },
		{ name: 'Foodpanda/Glovo/Tazz', color: '#EC4899' },
		{ name: 'Transport', color: '#3B82F6' },
		{ name: 'Benzină', color: '#6366F1' },
		{ name: 'Utilități', color: '#14B8A6' },
		{ name: 'Ieșiri', color: '#A855F7' },
		{ name: 'Pets', color: '#F59E0B' },
		{ name: '100GB GOOGLE', color: '#4285F4' },
		{ name: 'Subscriptions', color: '#EF4444' },
		{ name: 'Sănătate', color: '#10B981' },
		{ name: 'Îmbrăcăminte', color: '#8B5CF6' },
		{ name: 'Educație', color: '#06B6D4' },
		{ name: 'Alte cheltuieli', color: '#6B7280' }
	];

	for (const cat of expenseCategories) {
		await db.execute({
			sql: `INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, 'expense', ?)`,
			args: [userId, cat.name, cat.color]
		});
	}
	console.log('✅ Created', expenseCategories.length, 'expense categories');

	// ============================================
	// Income Categories
	// ============================================
	const incomeCategories = [
		{ name: 'Salariu', color: '#22C55E' },
		{ name: 'Freelance', color: '#3B82F6' },
		{ name: 'Transfer', color: '#8B5CF6' },
		{ name: 'Cadou', color: '#EC4899' },
		{ name: 'Investiții', color: '#F59E0B' },
		{ name: 'Alte venituri', color: '#6B7280' }
	];

	for (const cat of incomeCategories) {
		await db.execute({
			sql: `INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, 'income', ?)`,
			args: [userId, cat.name, cat.color]
		});
	}
	console.log('✅ Created', incomeCategories.length, 'income categories');

	// ============================================
	// Sample Transactions
	// ============================================
	const sampleTransactions = [
		{ desc: 'Bjj', amount: -300, date: '2025-12-01', account: 'BANI', category: 'Restaurant/Cantina', notes: 'Ab bhj 12 intrari' },
		{ desc: 'Lidl', amount: -49, date: '2025-12-01', account: 'SALARIU', category: 'SuperMarchet' },
		{ desc: 'Film', amount: -38, date: '2025-11-30', account: 'BANI', category: 'Ieșiri', notes: 'Cravata galbrna' },
		{ desc: 'Lidl', amount: -322, date: '2025-11-29', account: 'SALARIU', category: 'SuperMarchet' },
		{ desc: 'Patiiiiiiiiiiiiiiii', amount: 100, date: '2025-11-29', account: 'SALARIU', category: 'Alte venituri' },
		{ desc: 'Big Belly', amount: -72, date: '2025-11-28', account: 'SALARIU', category: 'Foodpanda/Glovo/Tazz' },
		{ desc: 'Borgir', amount: -60, date: '2025-11-28', account: 'SALARIU', category: 'Foodpanda/Glovo/Tazz' },
		{ desc: 'Google', amount: -10, date: '2025-11-27', account: 'SALARIU', category: '100GB GOOGLE' },
		{ desc: 'Transfer from Portofoliu - TRADING 212\nTo BANI', amount: 140, date: '2025-11-27', account: 'BANI', category: 'Transfer' },
		{ desc: 'Mancare Pisica', amount: -85, date: '2025-11-26', account: 'SALARIU', category: 'Pets' }
	];

	// Get account and category IDs
	const accResult = await db.execute({
		sql: 'SELECT id, name FROM accounts WHERE user_id = ?',
		args: [userId]
	});
	const catResult = await db.execute({
		sql: 'SELECT id, name FROM categories WHERE user_id = ?',
		args: [userId]
	});

	const accountMap = new Map(accResult.rows.map((r) => [r.name, r.id]));
	const categoryMap = new Map(catResult.rows.map((r) => [r.name, r.id]));

	for (const tx of sampleTransactions) {
		const accountId = accountMap.get(tx.account);
		const categoryId = categoryMap.get(tx.category);

		if (accountId && categoryId) {
			await db.execute({
				sql: `INSERT INTO transactions (user_id, account_id, category_id, amount, description, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
				args: [userId, accountId, categoryId, tx.amount, tx.desc, tx.date, tx.notes || null]
			});
		}
	}
	console.log('✅ Created', sampleTransactions.length, 'sample transactions');

	console.log('🌱 Seeding complete!');
}

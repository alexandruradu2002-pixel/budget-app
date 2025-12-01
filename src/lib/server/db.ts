// Database client and schema initialization
import { createClient } from '@libsql/client';
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from '$env/static/private';

// Use in-memory SQLite if credentials are missing (dev/test mode)
const useMockDb = !TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN;

const db = useMockDb
	? createClient({
			url: ':memory:'
		})
	: createClient({
			url: TURSO_DATABASE_URL!,
			authToken: TURSO_AUTH_TOKEN!
		});

if (useMockDb) {
	console.warn('⚠️  Using in-memory SQLite (no Turso credentials found)');
	console.warn('⚠️  Data will not persist across restarts!');
}

// ============================================
// Database Schema Initialization
// ============================================
export async function initializeDatabase() {
	console.log('🗄️  Initializing database schema...');

	// Users table
	await db.execute(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			roles TEXT DEFAULT '["user"]',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`);

	// Sessions table
	await db.execute(`
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			user_agent TEXT,
			ip_address TEXT,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)
	`);

	// Accounts table
	await db.execute(`
		CREATE TABLE IF NOT EXISTS accounts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			type TEXT NOT NULL CHECK(type IN ('checking', 'savings', 'credit_card', 'cash', 'investment', 'other')),
			balance REAL DEFAULT 0,
			currency TEXT DEFAULT 'USD',
			color TEXT DEFAULT '#3B82F6',
			icon TEXT,
			is_active BOOLEAN DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)
	`);

	// Categories table
	await db.execute(`
		CREATE TABLE IF NOT EXISTS categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
			color TEXT DEFAULT '#6B7280',
			icon TEXT,
			parent_id INTEGER,
			is_active BOOLEAN DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
		)
	`);

	// Transactions table
	await db.execute(`
		CREATE TABLE IF NOT EXISTS transactions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			account_id INTEGER NOT NULL,
			category_id INTEGER NOT NULL,
			amount REAL NOT NULL,
			description TEXT NOT NULL,
			date TEXT NOT NULL,
			notes TEXT,
			tags TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
			FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
		)
	`);

	// Budgets table
	await db.execute(`
		CREATE TABLE IF NOT EXISTS budgets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			category_id INTEGER NOT NULL,
			amount REAL NOT NULL,
			period TEXT DEFAULT 'monthly',
			start_date TEXT NOT NULL,
			end_date TEXT,
			is_active BOOLEAN DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
		)
	`);

	// Create indexes
	await db.execute('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)');

	console.log('✅ Database schema initialized');
}

// Auto-initialize on import
initializeDatabase().catch(console.error);

export default db;

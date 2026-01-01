// Database client and schema initialization
// Supports both Turso (cloud SQLite) and local SQLite file
import { createClient } from '@libsql/client';
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from '$env/static/private';

// Database mode detection:
// 1. Turso cloud: Both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN set
// 2. Local SQLite file: TURSO_DATABASE_URL is file:path (no auth needed)
// 3. In-memory SQLite: No credentials (dev/test mode, data doesn't persist)

const isLocalFile = TURSO_DATABASE_URL?.startsWith('file:');
const useTursoCloud = TURSO_DATABASE_URL && TURSO_AUTH_TOKEN && !isLocalFile;
const useLocalFile = isLocalFile;
const useMockDb = !useTursoCloud && !useLocalFile;

let db: ReturnType<typeof createClient>;

if (useTursoCloud) {
	// Production: Turso cloud database
	db = createClient({
		url: TURSO_DATABASE_URL!,
		authToken: TURSO_AUTH_TOKEN!
	});
	console.log('🌐 Connected to Turso cloud database');
} else if (useLocalFile) {
	// Self-hosted: Local SQLite file (no auth token needed)
	db = createClient({
		url: TURSO_DATABASE_URL!
	});
	console.log('📁 Connected to local SQLite:', TURSO_DATABASE_URL);
} else {
	// Development: In-memory SQLite
	db = createClient({
		url: ':memory:'
	});
	console.warn('⚠️  Using in-memory SQLite (no database credentials found)');
	console.warn('⚠️  Data will not persist across restarts!');
}

export default db;

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
			theme TEXT DEFAULT 'midnight-blue',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`);

	// Add theme column if it doesn't exist (migration for existing databases)
	try {
		await db.execute(`ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'midnight-blue'`);
	} catch {
		// Column already exists, ignore error
	}

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
			currency TEXT DEFAULT 'RON',
			color TEXT DEFAULT '#3B82F6',
			icon TEXT,
			notes TEXT,
			is_active BOOLEAN DEFAULT 1,
			ynab_account_name TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)
	`);

	// Categories table (supports YNAB hierarchy: Category Group → Category)
	await db.execute(`
		CREATE TABLE IF NOT EXISTS categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
			color TEXT DEFAULT '#6B7280',
			icon TEXT,
			parent_id INTEGER,
			group_name TEXT,
			is_active BOOLEAN DEFAULT 1,
			is_hidden BOOLEAN DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
		)
	`);

	// Transactions table (with YNAB fields)
	await db.execute(`
		CREATE TABLE IF NOT EXISTS transactions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			account_id INTEGER NOT NULL,
			category_id INTEGER,
			amount REAL NOT NULL,
			description TEXT NOT NULL,
			date TEXT NOT NULL,
			payee TEXT,
			memo TEXT,
			cleared TEXT CHECK(cleared IN ('cleared', 'uncleared', 'reconciled')),
			transfer_account_id INTEGER,
			notes TEXT,
			tags TEXT,
			ynab_import_id TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
			FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
			FOREIGN KEY (transfer_account_id) REFERENCES accounts(id) ON DELETE SET NULL
		)
	`);

	// Budgets table (monthly targets)
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

	// Budget Allocations table (YNAB Plan.csv - monthly assigned amounts)
	await db.execute(`
		CREATE TABLE IF NOT EXISTS budget_allocations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			category_id INTEGER NOT NULL,
			month TEXT NOT NULL,
			assigned REAL DEFAULT 0,
			activity REAL DEFAULT 0,
			available REAL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
			UNIQUE(user_id, category_id, month)
		)
	`);

	// Payees table (stores payees independently from transactions)
	await db.execute(`
		CREATE TABLE IF NOT EXISTS payees (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE(user_id, name)
		)
	`);

	// Category Groups table (persists empty groups)
	await db.execute(`
		CREATE TABLE IF NOT EXISTS category_groups (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			sort_order INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE(user_id, name)
		)
	`);

	// Learned Locations table (for auto-completing payee/category/account based on location)
	await db.execute(`
		CREATE TABLE IF NOT EXISTS learned_locations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			latitude REAL NOT NULL,
			longitude REAL NOT NULL,
			radius INTEGER DEFAULT 50,
			payee TEXT,
			category_id INTEGER,
			account_id INTEGER,
			times_used INTEGER DEFAULT 1,
			last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
			FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
		)
	`);

	// Create indexes (only for columns that always exist)
	await db.execute('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_budget_allocations_user_id ON budget_allocations(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_budget_allocations_month ON budget_allocations(month)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_category_groups_user_id ON category_groups(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_payees_user_id ON payees(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_learned_locations_user_id ON learned_locations(user_id)');
	await db.execute('CREATE INDEX IF NOT EXISTS idx_learned_locations_coords ON learned_locations(latitude, longitude)');

	// Migrations: Add missing columns to existing tables
	// Categories migrations
	try {
		await db.execute('ALTER TABLE categories ADD COLUMN group_name TEXT');
		console.log('✅ Added group_name column to categories');
	} catch {
		// Column already exists, ignore
	}

	try {
		await db.execute('ALTER TABLE categories ADD COLUMN is_hidden BOOLEAN DEFAULT 0');
		console.log('✅ Added is_hidden column to categories');
	} catch {
		// Column already exists, ignore
	}

	try {
		await db.execute('ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0');
		console.log('✅ Added sort_order column to categories');
	} catch {
		// Column already exists, ignore
	}

	try {
		await db.execute('ALTER TABLE categories ADD COLUMN group_sort_order INTEGER DEFAULT 0');
		console.log('✅ Added group_sort_order column to categories');
	} catch {
		// Column already exists, ignore
	}

	// Accounts migrations
	try {
		await db.execute('ALTER TABLE accounts ADD COLUMN sort_order INTEGER DEFAULT 0');
		console.log('✅ Added sort_order column to accounts');
	} catch {
		// Column already exists, ignore
	}

	// Transactions migrations (YNAB fields)
	try {
		await db.execute('ALTER TABLE transactions ADD COLUMN payee TEXT');
		console.log('✅ Added payee column to transactions');
	} catch {
		// Column already exists, ignore
	}

	try {
		await db.execute('ALTER TABLE transactions ADD COLUMN memo TEXT');
		console.log('✅ Added memo column to transactions');
	} catch {
		// Column already exists, ignore
	}

	try {
		await db.execute('ALTER TABLE transactions ADD COLUMN cleared TEXT');
		console.log('✅ Added cleared column to transactions');
	} catch {
		// Column already exists, ignore
	}

	try {
		await db.execute('ALTER TABLE transactions ADD COLUMN ynab_import_id TEXT');
		console.log('✅ Added ynab_import_id column to transactions');
	} catch {
		// Column already exists, ignore
	}

	try {
		await db.execute('ALTER TABLE transactions ADD COLUMN transfer_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL');
		console.log('✅ Added transfer_account_id column to transactions');
	} catch {
		// Column already exists, ignore
	}

	try {
		await db.execute('ALTER TABLE transactions ADD COLUMN original_currency TEXT');
		console.log('✅ Added original_currency column to transactions');
	} catch {
		// Column already exists, ignore
	}

	try {
		await db.execute('ALTER TABLE transactions ADD COLUMN original_amount REAL');
		console.log('✅ Added original_amount column to transactions');
	} catch {
		// Column already exists, ignore
	}

	// Create indexes for migrated columns (after migrations)
	try {
		await db.execute('CREATE INDEX IF NOT EXISTS idx_categories_group ON categories(group_name)');
	} catch {
		// Index already exists or column missing, ignore
	}

	try {
		await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_payee ON transactions(payee)');
	} catch {
		// Index already exists or column missing, ignore
	}

	try {
		await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_ynab_import ON transactions(ynab_import_id)');
	} catch {
		// Index already exists or column missing, ignore
	}

	try {
		await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_transfer ON transactions(transfer_account_id)');
	} catch {
		// Index already exists or column missing, ignore
	}

	// Learned locations migrations
	try {
		await db.execute('ALTER TABLE learned_locations ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL');
		console.log('✅ Added account_id column to learned_locations');
	} catch {
		// Column already exists, ignore
	}

	// Budgets migrations
	try {
		await db.execute("ALTER TABLE budgets ADD COLUMN currency TEXT DEFAULT 'RON'");
		console.log('✅ Added currency column to budgets');
	} catch {
		// Column already exists, ignore
	}

	// Accounts migrations
	try {
		await db.execute('ALTER TABLE accounts ADD COLUMN notes TEXT');
		console.log('✅ Added notes column to accounts');
	} catch {
		// Column already exists, ignore
	}

	console.log('✅ Database schema initialized');
}

// Auto-initialize on import
initializeDatabase().catch(console.error);

// ============================================
// Types - Budget App
// ============================================

// ---- Users & Auth ----
export interface User {
	id: number;
	email: string;
	name: string;
	password_hash: string;
	roles: string[]; // ['user', 'admin']
	created_at: string;
}

export interface Session {
	id: string;
	userId: number;
	email: string;
	name: string;
	roles: string[];
	expiresAt: Date;
}

// ---- Accounts ----
export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'other';

export interface Account {
	id: number;
	user_id: number;
	name: string; // "Bank of America Checking"
	type: AccountType;
	balance: number; // Current balance
	currency: string; // 'USD', 'EUR', 'RON'
	color: string; // Hex color for UI
	icon?: string; // Icon name
	is_active: boolean;
	sort_order?: number; // For custom ordering
	ynab_account_name?: string; // Original YNAB account name
	created_at: string;
	updated_at: string;
}

// ---- Categories ----
export type CategoryType = 'expense' | 'income';

export interface Category {
	id: number;
	user_id: number;
	name: string; // "Groceries", "Salary"
	type: CategoryType;
	color: string; // Hex color
	icon?: string;
	parent_id?: number; // For subcategories
	group_name?: string; // YNAB Category Group (e.g., "MANCARE", "EU", "Subscriptions")
	is_active: boolean;
	is_hidden: boolean; // For hidden categories from YNAB
	created_at: string;
	target?: number | null; // Monthly budget target amount (from budgets table)
	target_currency?: string | null; // Currency of the target (from budgets table)
}

// ---- Transactions ----
export type ClearedStatus = 'cleared' | 'uncleared' | 'reconciled';

export interface Transaction {
	id: number;
	user_id: number;
	account_id: number;
	category_id?: number; // Optional for transfers
	amount: number; // Positive for income, negative for expense
	description: string;
	date: string; // YYYY-MM-DD
	payee?: string; // YNAB payee field
	memo?: string; // YNAB memo field
	flag?: string; // YNAB flag color
	cleared?: ClearedStatus; // YNAB cleared status
	transfer_account_id?: number; // For transfer transactions
	notes?: string;
	tags?: string[]; // ['recurring', 'tax-deductible']
	ynab_import_id?: string; // Unique ID for duplicate detection
	created_at: string;
	updated_at: string;

	// Joined data
	account_name?: string;
	category_name?: string;
	category_color?: string;
	category_group?: string;
}

// ---- Budgets ----
export interface Budget {
	id: number;
	user_id: number;
	category_id: number;
	amount: number; // Budget limit
	period: string; // 'monthly', 'weekly', 'yearly'
	start_date: string; // YYYY-MM-DD
	end_date?: string; // Optional end date
	is_active: boolean;
	created_at: string;

	// Computed
	spent?: number; // Amount spent in current period
	remaining?: number;
	percentage?: number; // spent / amount * 100
}

// ---- Reports ----
export interface SpendingByCategory {
	category_id: number;
	category_name: string;
	category_color: string;
	total: number;
	count: number;
	percentage: number;
}

export interface MonthlyTrend {
	month: string; // 'YYYY-MM'
	income: number;
	expenses: number;
	net: number;
}

export interface AccountSummary {
	total_balance: number;
	total_income: number;
	total_expenses: number;
	net_worth: number;
}

// ---- Budget Planning (YNAB-style) ----
export interface CategoryBudget {
	id: number;
	category_id: number;
	name: string;
	assigned: number; // Amount assigned to this category
	activity: number; // Amount spent (negative) or received (positive)
	available: number; // assigned + activity + rollover
	color?: string;
	icon?: string;
}

export interface CategoryGroup {
	id: number;
	name: string;
	assigned: number; // Sum of all categories
	available: number; // Sum of all categories
	categories: CategoryBudget[];
	isExpanded: boolean;
}

export interface BudgetMonth {
	month: string; // 'YYYY-MM'
	readyToAssign: number; // Total available to budget
	categoryGroups: CategoryGroup[];
}

// ---- Budget Allocations (YNAB Plan.csv) ----
export interface BudgetAllocation {
	id: number;
	user_id: number;
	category_id: number;
	month: string; // 'YYYY-MM' format
	assigned: number; // Amount budgeted for this month
	activity: number; // Spending/income in this month
	available: number; // Running balance
	created_at: string;
	updated_at: string;

	// Joined data
	category_name?: string;
	category_group?: string;
}

// ---- Learned Locations (for auto-completing payee/category/account) ----
export interface LearnedLocation {
	id: number;
	user_id: number;
	latitude: number;
	longitude: number;
	radius: number; // meters
	payee?: string;
	category_id?: number;
	account_id?: number;
	times_used: number;
	last_used: string;
	created_at: string;

	// Joined data
	category_name?: string;
	category_color?: string;
	account_name?: string;
}

export interface LocationSuggestion {
	payee?: string;
	category_id?: number;
	category_name?: string;
	category_color?: string;
	account_id?: number;
	account_name?: string;
	confidence: number; // 0-1, based on times_used and distance
	distance: number; // meters from current location
}

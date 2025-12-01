// ============================================
// Constants - Budget App
// ============================================

// ---- Account Types ----
export const ACCOUNT_TYPES = [
	'checking',
	'savings',
	'credit_card',
	'cash',
	'investment',
	'other'
] as const;

export type AccountTypeValue = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountTypeValue, string> = {
	checking: 'Checking',
	savings: 'Savings',
	credit_card: 'Credit Card',
	cash: 'Cash',
	investment: 'Investment',
	other: 'Other'
};

export const ACCOUNT_TYPE_ICONS: Record<AccountTypeValue, string> = {
	checking: '🏦',
	savings: '💰',
	credit_card: '💳',
	cash: '💵',
	investment: '📈',
	other: '📁'
};

// ---- Category Types ----
export const CATEGORY_TYPES = ['expense', 'income'] as const;

export type CategoryTypeValue = (typeof CATEGORY_TYPES)[number];

export const CATEGORY_TYPE_LABELS: Record<CategoryTypeValue, string> = {
	expense: 'Expense',
	income: 'Income'
};

// ---- Transaction Cleared Status ----
export const CLEARED_STATUSES = ['cleared', 'uncleared', 'reconciled'] as const;

export type ClearedStatusValue = (typeof CLEARED_STATUSES)[number];

export const CLEARED_STATUS_LABELS: Record<ClearedStatusValue, string> = {
	cleared: 'Cleared',
	uncleared: 'Uncleared',
	reconciled: 'Reconciled'
};

// ---- Budget Periods ----
export const BUDGET_PERIODS = ['weekly', 'monthly', 'yearly'] as const;

export type BudgetPeriodValue = (typeof BUDGET_PERIODS)[number];

export const BUDGET_PERIOD_LABELS: Record<BudgetPeriodValue, string> = {
	weekly: 'Weekly',
	monthly: 'Monthly',
	yearly: 'Yearly'
};

// ---- Currency ----
export const DEFAULT_CURRENCY = 'RON';

export const SUPPORTED_CURRENCIES = ['RON', 'EUR', 'USD', 'GBP'] as const;

export type CurrencyValue = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<CurrencyValue, string> = {
	RON: 'lei',
	EUR: '€',
	USD: '$',
	GBP: '£'
};

// ---- Colors ----
export const DEFAULT_ACCOUNT_COLOR = '#3B82F6';
export const DEFAULT_CATEGORY_COLOR = '#6B7280';

export const PRESET_COLORS = [
	'#EF4444', // Red
	'#F97316', // Orange
	'#F59E0B', // Amber
	'#EAB308', // Yellow
	'#84CC16', // Lime
	'#22C55E', // Green
	'#10B981', // Emerald
	'#14B8A6', // Teal
	'#06B6D4', // Cyan
	'#0EA5E9', // Sky
	'#3B82F6', // Blue
	'#6366F1', // Indigo
	'#8B5CF6', // Violet
	'#A855F7', // Purple
	'#D946EF', // Fuchsia
	'#EC4899', // Pink
	'#F43F5E', // Rose
	'#6B7280', // Gray
] as const;

// ---- Pagination ----
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 500;

// ---- Date Formats ----
export const DATE_FORMAT = 'YYYY-MM-DD';
export const MONTH_FORMAT = 'YYYY-MM';

// ---- Flag Colors (YNAB compatibility) ----
export const FLAG_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;

export type FlagColorValue = (typeof FLAG_COLORS)[number];

export const FLAG_COLOR_HEX: Record<FlagColorValue, string> = {
	red: '#EF4444',
	orange: '#F97316',
	yellow: '#EAB308',
	green: '#22C55E',
	blue: '#3B82F6',
	purple: '#8B5CF6'
};

// YNAB CSV Import Utilities
// Parsează și importă date din exportul YNAB (Register.csv și Plan.csv)

import db from './db';

// ============================================
// Types pentru YNAB CSV
// ============================================

export interface YNABTransaction {
	account: string;
	flag: string;
	date: string; // MM/DD/YYYY
	payee: string;
	categoryGroupCategory: string; // "Group: Category"
	categoryGroup: string;
	category: string;
	memo: string;
	outflow: number; // În lei
	inflow: number;
	cleared: string;
}

export interface YNABBudget {
	month: string; // "Dec 2021"
	categoryGroupCategory: string;
	categoryGroup: string;
	category: string;
	assigned: number;
	activity: number;
	available: number;
}

export interface ImportResult {
	success: boolean;
	accounts: { created: number; existing: number };
	categories: { created: number; existing: number };
	transactions: { imported: number; skipped: number };
	budgets: { imported: number; skipped: number };
	errors: string[];
}

// ============================================
// CSV Parsing Helpers
// ============================================

/**
 * Parsează o valoare monetară din YNAB (ex: "1,234.56lei" sau "-100.00lei")
 */
function parseYNABAmount(value: string): number {
	if (!value) return 0;
	// Elimină "lei", spații, și convertește virgula la punct
	const cleaned = value
		.replace(/lei/gi, '')
		.replace(/\s/g, '')
		.replace(/,/g, '');
	const num = parseFloat(cleaned);
	return isNaN(num) ? 0 : num;
}

/**
 * Parsează data din format YNAB (MM/DD/YYYY) în format ISO (YYYY-MM-DD)
 */
function parseYNABDate(dateStr: string): string {
	const parts = dateStr.split('/');
	if (parts.length !== 3) return dateStr;
	const [month, day, year] = parts;
	return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Parsează un rând CSV cu suport pentru ghilimele
 */
function parseCSVRow(row: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < row.length; i++) {
		const char = row[i];
		if (char === '"') {
			if (inQuotes && row[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			result.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	result.push(current.trim());
	return result;
}

/**
 * Parsează întregul CSV în array de rânduri
 */
function parseCSV(csvContent: string): string[][] {
	const lines = csvContent.split('\n').filter((line) => line.trim());
	return lines.map(parseCSVRow);
}

// ============================================
// YNAB Register Parser
// ============================================

export function parseYNABRegister(csvContent: string): YNABTransaction[] {
	const rows = parseCSV(csvContent);
	if (rows.length < 2) return [];

	// Skip header row
	const transactions: YNABTransaction[] = [];

	for (let i = 1; i < rows.length; i++) {
		const row = rows[i];
		if (row.length < 11) continue;

		// Ignoră transferurile interne (categoria goală sau Transfer)
		const categoryGroup = row[5] || '';
		const category = row[6] || '';
		const payee = row[3] || '';

		// Skip transfers between accounts
		if (payee.startsWith('Transfer :') || payee.startsWith('Transfer:')) {
			continue;
		}

		// Skip transactions without category (unassigned/transfers)
		if (!categoryGroup && !category) {
			continue;
		}

		transactions.push({
			account: row[0] || '',
			flag: row[1] || '',
			date: row[2] || '',
			payee: payee,
			categoryGroupCategory: row[4] || '',
			categoryGroup: categoryGroup,
			category: category,
			memo: row[7] || '',
			outflow: parseYNABAmount(row[8]),
			inflow: parseYNABAmount(row[9]),
			cleared: row[10] || ''
		});
	}

	return transactions;
}

// ============================================
// YNAB Plan/Budget Parser
// ============================================

export function parseYNABPlan(csvContent: string): YNABBudget[] {
	const rows = parseCSV(csvContent);
	if (rows.length < 2) return [];

	const budgets: YNABBudget[] = [];

	for (let i = 1; i < rows.length; i++) {
		const row = rows[i];
		if (row.length < 7) continue;

		// Skip Hidden Categories
		const categoryGroup = row[2] || '';
		if (categoryGroup === 'Hidden Categories') continue;

		// Skip Inflow categories
		if (categoryGroup === 'Inflow') continue;

		budgets.push({
			month: row[0] || '',
			categoryGroupCategory: row[1] || '',
			categoryGroup: categoryGroup,
			category: row[3] || '',
			assigned: parseYNABAmount(row[4]),
			activity: parseYNABAmount(row[5]),
			available: parseYNABAmount(row[6])
		});
	}

	return budgets;
}

// ============================================
// Account Type Mapper
// ============================================

function mapAccountType(
	accountName: string
): 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'other' {
	const name = accountName.toLowerCase();

	if (name.includes('trading') || name.includes('portofoliu') || name.includes('invest')) {
		return 'investment';
	}
	if (name.includes('cash') || name.includes('bani') || name.includes('numerar')) {
		return 'cash';
	}
	if (name.includes('salar') || name.includes('salary')) {
		return 'checking';
	}
	if (name.includes('savings') || name.includes('economii') || name.includes('bursa')) {
		return 'savings';
	}
	if (name.includes('credit') || name.includes('card')) {
		return 'credit_card';
	}

	return 'checking';
}

// ============================================
// Color Generator
// ============================================

const CATEGORY_COLORS: Record<string, string> = {
	MANCARE: '#22C55E', // Green
	EU: '#3B82F6', // Blue
	Subscriptions: '#8B5CF6', // Purple
	'Misc.': '#F59E0B', // Amber
	Inflow: '#10B981', // Emerald
	default: '#6B7280' // Gray
};

const ACCOUNT_COLORS = [
	'#3B82F6', // Blue
	'#22C55E', // Green
	'#F59E0B', // Amber
	'#EF4444', // Red
	'#8B5CF6', // Purple
	'#EC4899', // Pink
	'#14B8A6', // Teal
	'#F97316' // Orange
];

function getCategoryColor(groupName: string): string {
	return CATEGORY_COLORS[groupName] || CATEGORY_COLORS.default;
}

// ============================================
// Main Import Function
// ============================================

export async function importYNABData(
	userId: number,
	registerCSV: string,
	planCSV?: string
): Promise<ImportResult> {
	const result: ImportResult = {
		success: false,
		accounts: { created: 0, existing: 0 },
		categories: { created: 0, existing: 0 },
		transactions: { imported: 0, skipped: 0 },
		budgets: { imported: 0, skipped: 0 },
		errors: []
	};

	try {
		// 1. Parse CSV-uri
		const transactions = parseYNABRegister(registerCSV);
		const budgets = planCSV ? parseYNABPlan(planCSV) : [];

		console.log(`📊 Parsed ${transactions.length} transactions, ${budgets.length} budget entries`);

		// 2. Extract unique accounts și categories
		const uniqueAccounts = [...new Set(transactions.map((t) => t.account))].filter(Boolean);
		const uniqueCategoryGroups = [
			...new Set(transactions.map((t) => t.categoryGroup))
		].filter(Boolean);
		const uniqueCategories = [...new Set(transactions.map((t) => t.category))].filter(Boolean);

		console.log(
			`📁 Found ${uniqueAccounts.length} accounts, ${uniqueCategoryGroups.length} category groups`
		);

		// 3. Create accounts
		const accountMap = new Map<string, number>(); // name -> id

		for (let i = 0; i < uniqueAccounts.length; i++) {
			const accountName = uniqueAccounts[i];

			// Check if exists
			const existing = await db.execute({
				sql: 'SELECT id FROM accounts WHERE user_id = ? AND name = ?',
				args: [userId, accountName]
			});

			if (existing.rows.length > 0) {
				accountMap.set(accountName, existing.rows[0].id as number);
				result.accounts.existing++;
			} else {
				const insertResult = await db.execute({
					sql: `INSERT INTO accounts (user_id, name, type, balance, currency, color, is_active)
                  VALUES (?, ?, ?, 0, 'RON', ?, 1)`,
					args: [
						userId,
						accountName,
						mapAccountType(accountName),
						ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]
					]
				});
				accountMap.set(accountName, Number(insertResult.lastInsertRowid));
				result.accounts.created++;
			}
		}

		// 4. Create category groups (as parent categories)
		const categoryGroupMap = new Map<string, number>(); // group name -> id

		for (const groupName of uniqueCategoryGroups) {
			// Skip Inflow category
			if (groupName === 'Inflow') continue;

			const existing = await db.execute({
				sql: 'SELECT id FROM categories WHERE user_id = ? AND name = ? AND parent_id IS NULL AND group_name IS NULL',
				args: [userId, groupName]
			});

			if (existing.rows.length > 0) {
				categoryGroupMap.set(groupName, existing.rows[0].id as number);
			} else {
				const insertResult = await db.execute({
					sql: `INSERT INTO categories (user_id, name, type, color, parent_id, group_name, is_active)
                  VALUES (?, ?, 'expense', ?, NULL, NULL, 1)`,
					args: [userId, groupName, getCategoryColor(groupName)]
				});
				categoryGroupMap.set(groupName, Number(insertResult.lastInsertRowid));
				result.categories.created++;
			}
		}

		// 5. Create subcategories
		const categoryMap = new Map<string, number>(); // "group:category" -> id

		// Create special "Income" category
		let incomeCategoryId: number;
		const existingIncome = await db.execute({
			sql: 'SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ?',
			args: [userId, 'Income', 'income']
		});

		if (existingIncome.rows.length > 0) {
			incomeCategoryId = existingIncome.rows[0].id as number;
		} else {
			const incomeResult = await db.execute({
				sql: `INSERT INTO categories (user_id, name, type, color, parent_id, group_name, is_active)
              VALUES (?, 'Income', 'income', '#10B981', NULL, 'Inflow', 1)`,
				args: [userId]
			});
			incomeCategoryId = Number(incomeResult.lastInsertRowid);
			result.categories.created++;
		}

		// Map pentru categorii bazate pe grup + categorie
		for (const t of transactions) {
			if (!t.categoryGroup || !t.category) continue;
			if (t.categoryGroup === 'Inflow') continue;

			const key = `${t.categoryGroup}:${t.category}`;
			if (categoryMap.has(key)) continue;

			const parentId = categoryGroupMap.get(t.categoryGroup);
			if (!parentId) continue;

			const existing = await db.execute({
				sql: 'SELECT id FROM categories WHERE user_id = ? AND name = ? AND parent_id = ?',
				args: [userId, t.category, parentId]
			});

			if (existing.rows.length > 0) {
				categoryMap.set(key, existing.rows[0].id as number);
				result.categories.existing++;
			} else {
				// Create subcategory with group_name set for easy grouping in Plan page
				const insertResult = await db.execute({
					sql: `INSERT INTO categories (user_id, name, type, color, parent_id, group_name, is_active)
                  VALUES (?, ?, 'expense', ?, ?, ?, 1)`,
					args: [userId, t.category, getCategoryColor(t.categoryGroup), parentId, t.categoryGroup]
				});
				categoryMap.set(key, Number(insertResult.lastInsertRowid));
				result.categories.created++;
			}
		}

		// 6. Import transactions
		for (const t of transactions) {
			const accountId = accountMap.get(t.account);
			if (!accountId) {
				result.transactions.skipped++;
				continue;
			}

			// Determine category ID
			let categoryId: number;
			if (t.categoryGroup === 'Inflow') {
				categoryId = incomeCategoryId;
			} else {
				const key = `${t.categoryGroup}:${t.category}`;
				const catId = categoryMap.get(key);
				if (!catId) {
					result.transactions.skipped++;
					continue;
				}
				categoryId = catId;
			}

			// Calculate amount (positive for inflow, negative for outflow)
			const amount = t.inflow > 0 ? t.inflow : -t.outflow;
			const date = parseYNABDate(t.date);
			const description = t.payee || 'Unknown';

			// Check for duplicates (same date, amount, description, account)
			const existingTx = await db.execute({
				sql: `SELECT id FROM transactions 
              WHERE user_id = ? AND account_id = ? AND date = ? 
              AND amount = ? AND description = ?`,
				args: [userId, accountId, date, amount, description]
			});

			if (existingTx.rows.length > 0) {
				result.transactions.skipped++;
				continue;
			}

			await db.execute({
				sql: `INSERT INTO transactions (user_id, account_id, category_id, amount, description, date, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
				args: [userId, accountId, categoryId, amount, description, date, t.memo || null]
			});
			result.transactions.imported++;
		}

		// 7. Update account balances
		for (const [accountName, accountId] of accountMap) {
			const balanceResult = await db.execute({
				sql: 'SELECT COALESCE(SUM(amount), 0) as balance FROM transactions WHERE account_id = ?',
				args: [accountId]
			});
			const balance = (balanceResult.rows[0]?.balance as number) || 0;

			await db.execute({
				sql: 'UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
				args: [balance, accountId]
			});
		}

		// 8. Import budgets (optional)
		if (budgets.length > 0) {
			for (const b of budgets) {
				if (!b.categoryGroup || !b.category) continue;
				if (b.assigned === 0) continue;

				const key = `${b.categoryGroup}:${b.category}`;
				const categoryId = categoryMap.get(key);
				if (!categoryId) {
					result.budgets.skipped++;
					continue;
				}

				// Parse month to date (e.g., "Dec 2021" -> "2021-12-01")
				const monthMatch = b.month.match(/(\w+)\s+(\d{4})/);
				if (!monthMatch) {
					result.budgets.skipped++;
					continue;
				}

				const monthNames: Record<string, string> = {
					Jan: '01',
					Feb: '02',
					Mar: '03',
					Apr: '04',
					May: '05',
					Jun: '06',
					Jul: '07',
					Aug: '08',
					Sep: '09',
					Oct: '10',
					Nov: '11',
					Dec: '12'
				};

				const monthNum = monthNames[monthMatch[1]];
				const year = monthMatch[2];
				if (!monthNum) {
					result.budgets.skipped++;
					continue;
				}

				const startDate = `${year}-${monthNum}-01`;

				// Check if budget already exists
				const existingBudget = await db.execute({
					sql: `SELECT id FROM budgets 
                WHERE user_id = ? AND category_id = ? AND start_date = ?`,
					args: [userId, categoryId, startDate]
				});

				if (existingBudget.rows.length > 0) {
					result.budgets.skipped++;
					continue;
				}

				await db.execute({
					sql: `INSERT INTO budgets (user_id, category_id, amount, period, start_date, is_active)
                VALUES (?, ?, ?, 'monthly', ?, 1)`,
					args: [userId, categoryId, Math.abs(b.assigned), startDate]
				});
				result.budgets.imported++;
			}
		}

		result.success = true;
		console.log(`✅ Import complete: ${result.transactions.imported} transactions imported`);
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		result.errors.push(errorMsg);
		console.error('❌ Import error:', errorMsg);
	}

	return result;
}

// ============================================
// Utility: Get unique data from CSV without importing
// ============================================

export function analyzeYNABRegister(csvContent: string) {
	const transactions = parseYNABRegister(csvContent);

	const accounts = [...new Set(transactions.map((t) => t.account))].filter(Boolean);
	const categoryGroups = [...new Set(transactions.map((t) => t.categoryGroup))].filter(Boolean);
	const categories = [...new Set(transactions.map((t) => t.category))].filter(Boolean);
	const payees = [...new Set(transactions.map((t) => t.payee))].filter(Boolean);

	// Date range
	const dates = transactions.map((t) => parseYNABDate(t.date)).sort();

	// Totals
	const totalInflow = transactions.reduce((sum, t) => sum + t.inflow, 0);
	const totalOutflow = transactions.reduce((sum, t) => sum + t.outflow, 0);

	return {
		totalTransactions: transactions.length,
		accounts,
		categoryGroups,
		categories,
		uniquePayees: payees.length,
		dateRange: {
			start: dates[0],
			end: dates[dates.length - 1]
		},
		totals: {
			inflow: totalInflow,
			outflow: totalOutflow,
			net: totalInflow - totalOutflow
		}
	};
}

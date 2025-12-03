import { z } from 'zod';

// ============================================
// Auth Validation
// ============================================
export const signupSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	name: z.string().min(2, 'Name must be at least 2 characters')
});

export const loginSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(1, 'Password is required')
});

// ============================================
// Account Validation
// ============================================
export const accountSchema = z.object({
	name: z.string().min(1, 'Account name is required'),
	type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'other']),
	balance: z.number().default(0),
	currency: z.string().default('RON'),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#3B82F6'),
	icon: z.string().optional(),
	notes: z.string().optional().nullable(),
	ynab_account_name: z.string().optional()
});

// ============================================
// Category Validation
// ============================================
export const categorySchema = z.object({
	name: z.string().min(1, 'Category name is required'),
	type: z.enum(['expense', 'income']),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#6B7280'),
	icon: z.string().optional(),
	parent_id: z.number().optional(),
	group_name: z.string().optional(),
	is_hidden: z.boolean().default(false)
});

// ============================================
// Transaction Validation
// ============================================
export const transactionSchema = z.object({
	account_id: z.number().int().positive(),
	category_id: z.number().int().positive().optional(), // Optional for transfers
	amount: z.number(),
	description: z.string().min(1, 'Description is required'),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
	payee: z.string().optional(),
	memo: z.string().optional(),
	cleared: z.enum(['cleared', 'uncleared', 'reconciled']).optional(),
	is_transfer: z.boolean().optional(),
	transfer_account_id: z.number().int().positive().optional(),
	notes: z.string().optional(),
	tags: z.array(z.string()).optional(),
	ynab_import_id: z.string().optional()
});

// ============================================
// Budget Validation
// ============================================
export const budgetSchema = z.object({
	category_id: z.number().int().positive(),
	amount: z.number().positive(),
	period: z.enum(['weekly', 'monthly', 'yearly']).default('monthly'),
	start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
});

// ============================================
// Budget Allocation Validation (YNAB Plan)
// ============================================
export const budgetAllocationSchema = z.object({
	category_id: z.number().int().positive(),
	month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'),
	assigned: z.number().default(0),
	activity: z.number().default(0),
	available: z.number().default(0)
});

// ============================================
// Location Validation (for auto-complete)
// ============================================
export const locationSuggestSchema = z.object({
	latitude: z.number().min(-90).max(90),
	longitude: z.number().min(-180).max(180)
});

export const learnedLocationSchema = z.object({
	latitude: z.number().min(-90).max(90),
	longitude: z.number().min(-180).max(180),
	radius: z.number().int().positive().default(50),
	payee: z.string().optional(),
	category_id: z.number().int().positive().optional(),
	account_id: z.number().int().positive().optional()
});

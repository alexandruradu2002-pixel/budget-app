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
	currency: z.string().default('USD'),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#3B82F6'),
	icon: z.string().optional()
});

// ============================================
// Category Validation
// ============================================
export const categorySchema = z.object({
	name: z.string().min(1, 'Category name is required'),
	type: z.enum(['expense', 'income']),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#6B7280'),
	icon: z.string().optional(),
	parent_id: z.number().optional()
});

// ============================================
// Transaction Validation
// ============================================
export const transactionSchema = z.object({
	account_id: z.number().int().positive(),
	category_id: z.number().int().positive(),
	amount: z.number(),
	description: z.string().min(1, 'Description is required'),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
	notes: z.string().optional(),
	tags: z.array(z.string()).optional()
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

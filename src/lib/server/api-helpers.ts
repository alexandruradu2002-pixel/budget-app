// ============================================
// API Helpers - Server-side utilities for API routes
// ============================================

import { json, error, type RequestEvent } from '@sveltejs/kit';
import type { ZodSchema, ZodError } from 'zod';
import type { Client, InValue } from '@libsql/client';

/**
 * Parse and validate request body against a Zod schema
 * Throws a 400 error if validation fails
 */
export async function parseBody<T>(
	event: RequestEvent,
	schema: ZodSchema<T>
): Promise<T> {
	let body: unknown;
	
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const parsed = schema.safeParse(body);
	
	if (!parsed.success) {
		const firstError = parsed.error.errors[0];
		throw error(400, firstError.message);
	}

	return parsed.data;
}

/**
 * Parse and validate request body, returning result object instead of throwing
 * Useful when you need custom error handling
 */
export async function tryParseBody<T>(
	event: RequestEvent,
	schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: ZodError<T> }> {
	let body: unknown;
	
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	return schema.safeParse(body) as { success: true; data: T } | { success: false; error: ZodError<T> };
}

/**
 * Parse URL search params with type coercion
 */
export function parseSearchParams(url: URL) {
	return {
		getString: (key: string, defaultValue?: string): string | undefined => {
			return url.searchParams.get(key) ?? defaultValue;
		},
		getInt: (key: string, defaultValue?: number): number | undefined => {
			const value = url.searchParams.get(key);
			if (value === null) return defaultValue;
			const parsed = parseInt(value, 10);
			return isNaN(parsed) ? defaultValue : parsed;
		},
		getBoolean: (key: string, defaultValue = false): boolean => {
			const value = url.searchParams.get(key);
			if (value === null) return defaultValue;
			return value === 'true' || value === '1';
		},
		getDate: (key: string): string | undefined => {
			const value = url.searchParams.get(key);
			if (!value) return undefined;
			// Validate YYYY-MM-DD format
			if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
			return undefined;
		}
	};
}

/**
 * Standard success response
 */
export function successResponse<T>(data: T, status = 200) {
	return json(data, { status });
}

/**
 * Standard created response (201)
 */
export function createdResponse<T>(data: T) {
	return json(data, { status: 201 });
}

/**
 * Handle database errors and return appropriate HTTP errors
 */
export function handleDbError(e: unknown): never {
	console.error('Database error:', e);
	
	if (e instanceof Error) {
		// SQLite constraint violation
		if (e.message.includes('UNIQUE constraint failed')) {
			throw error(409, 'Resource already exists');
		}
		if (e.message.includes('FOREIGN KEY constraint failed')) {
			throw error(400, 'Referenced resource does not exist');
		}
		if (e.message.includes('NOT NULL constraint failed')) {
			throw error(400, 'Missing required field');
		}
	}
	
	throw error(500, 'Database operation failed');
}

/**
 * Verify resource ownership - throws 404 if not found or not owned by user
 */
export async function verifyOwnership(
	db: Client,
	table: string,
	resourceId: number,
	userId: number,
	resourceName = 'Resource'
): Promise<void> {
	const result = await db.execute({
		sql: `SELECT id FROM ${table} WHERE id = ? AND user_id = ?`,
		args: [resourceId, userId]
	});
	
	if (result.rows.length === 0) {
		throw error(404, `${resourceName} not found`);
	}
}

/**
 * Build a dynamic WHERE clause from filters
 */
export function buildWhereClause(
	baseCondition: string,
	filters: Record<string, InValue | undefined>,
	baseArgs: InValue[]
): { sql: string; args: InValue[] } {
	let sql = baseCondition;
	const args: InValue[] = [...baseArgs];

	for (const [key, value] of Object.entries(filters)) {
		if (value !== undefined && value !== null && value !== '') {
			sql += ` AND ${key} = ?`;
			args.push(value);
		}
	}

	return { sql, args };
}

/**
 * Build pagination clause
 */
export function buildPagination(
	limit?: number,
	offset?: number,
	defaultLimit = 50,
	maxLimit = 500
): { sql: string; args: InValue[] } {
	const safeLimit = Math.min(limit ?? defaultLimit, maxLimit);
	const safeOffset = offset ?? 0;
	
	return {
		sql: ' LIMIT ? OFFSET ?',
		args: [safeLimit, safeOffset]
	};
}

/**
 * Build ORDER BY clause
 */
export function buildOrderBy(
	field: string,
	direction: 'ASC' | 'DESC' = 'DESC',
	allowedFields: string[] = []
): string {
	// Prevent SQL injection by validating field name
	if (allowedFields.length > 0 && !allowedFields.includes(field)) {
		throw error(400, `Invalid sort field: ${field}`);
	}
	
	return ` ORDER BY ${field} ${direction}`;
}

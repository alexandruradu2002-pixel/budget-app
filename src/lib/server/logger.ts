// ============================================
// Logger - Safe logging with data sanitization
// ============================================

import { dev } from '$app/environment';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	context?: Record<string, unknown>;
}

// ============================================
// Sensitive Data Sanitization
// ============================================

const SENSITIVE_FIELDS = [
	'password',
	'password_hash',
	'passwordhash',
	'token',
	'accesstoken',
	'refreshtoken',
	'authorization',
	'secret',
	'apikey',
	'api_key',
	'creditcard',
	'credit_card',
	'ssn',
	'session',
	'sessionid',
	'session_id',
	'cookie',
	'app_password'
];

/**
 * Recursively sanitize sensitive data from objects
 */
function sanitize(data: unknown): unknown {
	if (!data || typeof data !== 'object') {
		return data;
	}

	if (Array.isArray(data)) {
		return data.map(sanitize);
	}

	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
		const lowerKey = key.toLowerCase();

		if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
			sanitized[key] = '[REDACTED]';
		} else if (typeof value === 'object' && value !== null) {
			sanitized[key] = sanitize(value);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

// ============================================
// Logging Functions
// ============================================

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
	const entry: LogEntry = {
		timestamp: new Date().toISOString(),
		level,
		message,
		context: context ? (sanitize(context) as Record<string, unknown>) : undefined
	};

	const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;

	switch (level) {
		case 'error':
			console.error(prefix, message, entry.context || '');
			break;
		case 'warn':
			console.warn(prefix, message, entry.context || '');
			break;
		case 'debug':
			if (dev) {
				console.log(prefix, message, entry.context || '');
			}
			break;
		default:
			console.log(prefix, message, entry.context || '');
	}
}

/**
 * Log info message
 */
export function logInfo(message: string, context?: Record<string, unknown>) {
	log('info', message, context);
}

/**
 * Log warning message
 */
export function logWarn(message: string, context?: Record<string, unknown>) {
	log('warn', message, context);
}

/**
 * Log error with optional Error object
 */
export function logError(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
	log('error', message, {
		...context,
		error:
			error instanceof Error
				? {
						name: error.name,
						message: error.message,
						stack: dev ? error.stack : undefined // Only show stack in dev
					}
				: error
	});
}

/**
 * Log debug message (only in development)
 */
export function logDebug(message: string, context?: Record<string, unknown>) {
	log('debug', message, context);
}

/**
 * Log API request
 */
export function logRequest(
	method: string,
	path: string,
	status: number,
	duration?: number,
	userId?: number
) {
	const context: Record<string, unknown> = { method, path, status };
	if (duration !== undefined) context.duration = `${duration}ms`;
	if (userId !== undefined) context.userId = userId;

	if (status >= 500) {
		log('error', `${method} ${path} - ${status}`, context);
	} else if (status >= 400) {
		log('warn', `${method} ${path} - ${status}`, context);
	} else {
		log('info', `${method} ${path} - ${status}`, context);
	}
}

/**
 * Log security event (failed auth, rate limit, etc.)
 */
export function logSecurity(
	event: string,
	context?: Record<string, unknown>
) {
	log('warn', `[SECURITY] ${event}`, context);
}

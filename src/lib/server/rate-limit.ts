// ============================================
// Rate Limiting - Protecție împotriva abuzului API
// ============================================

import { json, type RequestEvent } from '@sveltejs/kit';

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

interface RateLimitOptions {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Maximum requests per window
}

// In-memory store (pentru producție folosește Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup periodic - șterge intrările expirate
setInterval(() => {
	const now = Date.now();
	for (const [key, value] of rateLimitStore.entries()) {
		if (now > value.resetTime) {
			rateLimitStore.delete(key);
		}
	}
}, 60000); // Cleanup la fiecare minut

/**
 * Get client identifier for rate limiting
 * Priority: userId > IP address
 */
function getClientIdentifier(event: RequestEvent): string {
	const user = event.locals.user;
	if (user) {
		return `user:${user.userId}`;
	}

	try {
		const ip = event.getClientAddress();
		return `ip:${ip}`;
	} catch {
		// Fallback for environments where getClientAddress fails
		return `ip:unknown`;
	}
}

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
	return (event: RequestEvent): Response | null => {
		const identifier = getClientIdentifier(event);
		const now = Date.now();
		const limit = rateLimitStore.get(identifier);

		// First request or window expired
		if (!limit || now > limit.resetTime) {
			rateLimitStore.set(identifier, {
				count: 1,
				resetTime: now + options.windowMs
			});
			return null; // Allow request
		}

		// Check if limit exceeded
		if (limit.count >= options.maxRequests) {
			const retryAfter = Math.ceil((limit.resetTime - now) / 1000);
			return json(
				{
					error: 'Too many requests. Please try again later.',
					retryAfter
				},
				{
					status: 429,
					headers: {
						'Retry-After': retryAfter.toString(),
						'X-RateLimit-Limit': options.maxRequests.toString(),
						'X-RateLimit-Remaining': '0',
						'X-RateLimit-Reset': new Date(limit.resetTime).toISOString()
					}
				}
			);
		}

		// Increment counter
		limit.count++;
		return null; // Allow request
	};
}

// ============================================
// Pre-configured Rate Limiters
// ============================================

/**
 * Auth endpoints - strict (protecție brute force)
 * 5 încercări per 15 minute
 */
export const authRateLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000, // 15 minute
	maxRequests: 5
});

/**
 * General API - moderat
 * 60 requests per minut
 */
export const apiRateLimiter = createRateLimiter({
	windowMs: 60 * 1000, // 1 minut
	maxRequests: 60
});

/**
 * Write operations (POST, PUT, DELETE) - mai restrictiv
 * 30 requests per minut
 */
export const writeRateLimiter = createRateLimiter({
	windowMs: 60 * 1000, // 1 minut
	maxRequests: 30
});

/**
 * Public endpoints - relaxat
 * 100 requests per minut
 */
export const publicRateLimiter = createRateLimiter({
	windowMs: 60 * 1000, // 1 minut
	maxRequests: 100
});

// ============================================
// Helper: Check rate limit and return early if exceeded
// ============================================

/**
 * Use in API routes to apply rate limiting
 * @example
 * const rateLimited = checkRateLimit(event, authRateLimiter);
 * if (rateLimited) return rateLimited;
 */
export function checkRateLimit(
	event: RequestEvent,
	limiter: ReturnType<typeof createRateLimiter>
): Response | null {
	return limiter(event);
}

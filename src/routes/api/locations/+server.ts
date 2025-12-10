import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { RequestEvent } from '@sveltejs/kit';
import { locationSuggestSchema, learnedLocationSchema } from '$lib/server/validation';
import { parseBody, parseSearchParams, successResponse, createdResponse, handleDbError } from '$lib/server/api-helpers';
import db from '$lib/server/db';
import type { InValue } from '@libsql/client';

// Helper to get user from locals (same pattern as other routes)
function requireAuth(event: RequestEvent) {
	if (!event.locals.user) {
		throw error(401, 'Unauthorized');
	}
	return event.locals.user;
}

// Haversine formula to calculate distance between two points in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371000; // Earth's radius in meters
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = 
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

// GET /api/locations?lat=...&lng=... - Get location suggestions
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const params = parseSearchParams(event.url);
	
	const lat = params.getString('lat');
	const lng = params.getString('lng');
	
	if (!lat || !lng) {
		throw error(400, 'Latitude and longitude are required');
	}
	
	const latitude = parseFloat(lat);
	const longitude = parseFloat(lng);
	
	if (isNaN(latitude) || isNaN(longitude)) {
		throw error(400, 'Invalid latitude or longitude');
	}
	
	// Validate coordinates
	const validated = locationSuggestSchema.safeParse({ latitude, longitude });
	if (!validated.success) {
		throw error(400, validated.error.errors[0].message);
	}
	
	try {
		// Get all learned locations for this user
		// We'll calculate distance on the server side for accuracy
		const result = await db.execute({
			sql: `
				SELECT 
					ll.*,
					p.name as payee_name,
					c.name as category_name,
					c.color as category_color,
					a.name as account_name
				FROM learned_locations ll
				LEFT JOIN payees p ON ll.payee = p.name AND p.user_id = ll.user_id
				LEFT JOIN categories c ON ll.category_id = c.id AND c.user_id = ll.user_id
				LEFT JOIN accounts a ON ll.account_id = a.id AND a.user_id = ll.user_id
				WHERE ll.user_id = ?
					AND (ll.payee IS NULL OR p.id IS NOT NULL)
					AND (ll.category_id IS NULL OR c.id IS NOT NULL)
					AND (ll.account_id IS NULL OR a.id IS NOT NULL)
				ORDER BY ll.times_used DESC, ll.last_used DESC
				LIMIT 100
			`,
			args: [user.userId] as InValue[]
		});
		
		// Filter by distance and calculate confidence
		const maxSearchRadius = 500; // meters - search within 500m (increased for GPS accuracy)
		const suggestions = result.rows
			.map(row => {
				const distance = calculateDistance(
					latitude, 
					longitude, 
					row.latitude as number, 
					row.longitude as number
				);
				
				// Calculate confidence based on distance and usage
				const distanceScore = Math.max(0, 1 - (distance / maxSearchRadius));
				const usageScore = Math.min(1, (row.times_used as number) / 10); // Cap at 10 uses
				const confidence = (distanceScore * 0.6) + (usageScore * 0.4);
				
				return {
					id: row.id as number,
					payee: row.payee as string | null,
					category_id: row.category_id as number | null,
					category_name: row.category_name as string | null,
					category_color: row.category_color as string | null,
					account_id: row.account_id as number | null,
					account_name: row.account_name as string | null,
					confidence: Math.round(confidence * 100) / 100,
					distance: Math.round(distance),
					times_used: row.times_used as number
				};
			})
			.filter(s => s.distance <= maxSearchRadius)
			.sort((a, b) => b.confidence - a.confidence)
			.slice(0, 5); // Return top 5 suggestions
		
		return successResponse({ suggestions });
	} catch (err) {
		return handleDbError(err);
	}
};

// POST /api/locations - Save/update a learned location
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const data = await parseBody(event, learnedLocationSchema);
	
	if (!data.payee && !data.category_id && !data.account_id) {
		throw error(400, 'At least payee, category_id or account_id is required');
	}
	
	try {
		// Check if a similar location already exists (within 100m radius - increased for GPS accuracy)
		const existing = await db.execute({
			sql: `
				SELECT id, latitude, longitude, times_used 
				FROM learned_locations 
				WHERE user_id = ?
				LIMIT 100
			`,
			args: [user.userId] as InValue[]
		});
		
		// Find if there's a matching location within the radius
		const searchRadius = data.radius ?? 100; // Increased default from 50m to 100m
		let matchingLocationId: number | null = null;
		let closestLocationId: number | null = null;
		let closestDistance = Infinity;
		
		for (const row of existing.rows) {
			const distance = calculateDistance(
				data.latitude,
				data.longitude,
				row.latitude as number,
				row.longitude as number
			);
			
			// Track closest location within radius for potential update
			if (distance <= searchRadius && distance < closestDistance) {
				closestDistance = distance;
				closestLocationId = row.id as number;
			}
			
			// Check if same payee, category, or account exists nearby
			if (distance <= searchRadius) {
				// Get the full record to check payee/category/account match
				const fullRecord = await db.execute({
					sql: 'SELECT * FROM learned_locations WHERE id = ?',
					args: [row.id as number] as InValue[]
				});
				
				if (fullRecord.rows.length > 0) {
					const record = fullRecord.rows[0];
					// Match if:
					// 1. Same payee (both non-null)
					// 2. Same category_id 
					// 3. Same account_id
					// 4. Record has null payee but same category or account (update it with new payee)
					const samePayee = data.payee && record.payee && record.payee === data.payee;
					const sameCategory = data.category_id && record.category_id === data.category_id;
					const sameAccount = data.account_id && record.account_id === data.account_id;
					const canUpdatePayee = !record.payee && data.payee && (sameCategory || sameAccount);
					
					if (samePayee || sameCategory || sameAccount || canUpdatePayee) {
						matchingLocationId = row.id as number;
						break;
					}
				}
			}
		}
		
		// If no exact match but there's a close location, use it for update
		if (!matchingLocationId && closestLocationId) {
			matchingLocationId = closestLocationId;
		}
		
		if (matchingLocationId) {
			// Update existing location
			// Build dynamic update - always update payee if we have one, otherwise keep existing
			// For category and account, use COALESCE to keep existing if new is null
			await db.execute({
				sql: `
					UPDATE learned_locations 
					SET 
						times_used = times_used + 1,
						last_used = CURRENT_TIMESTAMP,
						payee = CASE WHEN ? IS NOT NULL THEN ? ELSE payee END,
						category_id = COALESCE(?, category_id),
						account_id = COALESCE(?, account_id)
					WHERE id = ?
				`,
				args: [
					data.payee || null,  // For the IS NOT NULL check
					data.payee || null,  // For the actual value
					data.category_id || null, 
					data.account_id || null, 
					matchingLocationId
				] as InValue[]
			});
			
			return successResponse({ 
				id: matchingLocationId, 
				message: 'Location updated',
				updated: true 
			});
		} else {
			// Create new learned location
			const result = await db.execute({
				sql: `
					INSERT INTO learned_locations 
					(user_id, latitude, longitude, radius, payee, category_id, account_id)
					VALUES (?, ?, ?, ?, ?, ?, ?)
				`,
				args: [
					user.userId,
					data.latitude,
					data.longitude,
					data.radius,
					data.payee || null,
					data.category_id || null,
					data.account_id || null
				] as InValue[]
			});
			
			return createdResponse({ 
				id: Number(result.lastInsertRowid),
				message: 'Location learned' 
			});
		}
	} catch (err) {
		return handleDbError(err);
	}
};

// DELETE /api/locations?id=... - Delete a learned location
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event as RequestEvent);
	const params = parseSearchParams(event.url);
	const id = params.getInt('id');
	
	if (!id) {
		throw error(400, 'Location ID is required');
	}
	
	try {
		// Verify ownership
		const existing = await db.execute({
			sql: 'SELECT id FROM learned_locations WHERE id = ? AND user_id = ?',
			args: [id, user.userId] as InValue[]
		});
		
		if (existing.rows.length === 0) {
			throw error(404, 'Location not found');
		}
		
		await db.execute({
			sql: 'DELETE FROM learned_locations WHERE id = ?',
			args: [id] as InValue[]
		});
		
		return successResponse({ message: 'Location deleted' });
	} catch (err) {
		return handleDbError(err);
	}
};

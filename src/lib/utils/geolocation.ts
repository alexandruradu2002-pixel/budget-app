// ============================================
// Geolocation Utilities - Client-side location helpers
// ============================================

import type { LocationSuggestion } from '$lib/types';

export interface GeolocationPosition {
	latitude: number;
	longitude: number;
	accuracy: number; // meters
	timestamp: number;
}

export interface GeolocationError {
	code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
	message: string;
}

/**
 * Check if geolocation is supported in the browser
 */
export function isGeolocationSupported(): boolean {
	return typeof window !== 'undefined' && 'geolocation' in navigator;
}

/**
 * Get current position with a promise-based API
 * @param options - Geolocation options
 * @returns Promise with position or error
 */
export async function getCurrentPosition(
	options: PositionOptions = {}
): Promise<{ success: true; position: GeolocationPosition } | { success: false; error: GeolocationError }> {
	if (!isGeolocationSupported()) {
		return {
			success: false,
			error: {
				code: 'NOT_SUPPORTED',
				message: 'Geolocation is not supported in this browser'
			}
		};
	}

	const defaultOptions: PositionOptions = {
		enableHighAccuracy: true,
		timeout: 10000, // 10 seconds
		maximumAge: 60000, // Cache for 1 minute
		...options
	};

	return new Promise((resolve) => {
		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					success: true,
					position: {
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
						accuracy: position.coords.accuracy,
						timestamp: position.timestamp
					}
				});
			},
			(error) => {
				let errorCode: GeolocationError['code'];
				let message: string;

				switch (error.code) {
					case error.PERMISSION_DENIED:
						errorCode = 'PERMISSION_DENIED';
						message = 'Location permission was denied';
						break;
					case error.POSITION_UNAVAILABLE:
						errorCode = 'POSITION_UNAVAILABLE';
						message = 'Location information is unavailable';
						break;
					case error.TIMEOUT:
						errorCode = 'TIMEOUT';
						message = 'Location request timed out';
						break;
					default:
						errorCode = 'POSITION_UNAVAILABLE';
						message = 'An unknown error occurred';
				}

				resolve({
					success: false,
					error: { code: errorCode, message }
				});
			},
			defaultOptions
		);
	});
}

/**
 * Fetch location suggestions from the API
 * @param latitude - Current latitude
 * @param longitude - Current longitude
 * @returns Array of location suggestions
 */
export async function getLocationSuggestions(
	latitude: number,
	longitude: number
): Promise<LocationSuggestion[]> {
	try {
		const response = await fetch(`/api/locations?lat=${latitude}&lng=${longitude}`);
		
		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		return data.suggestions || [];
	} catch (error) {
		return [];
	}
}

/**
 * Save a learned location to the API
 * @param location - Location data to save
 */
export async function saveLearnedLocation(location: {
	latitude: number;
	longitude: number;
	payee?: string;
	category_id?: number;
	account_id?: number;
}): Promise<{ success: boolean; id?: number; message?: string }> {
	try {
		const response = await fetch('/api/locations', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(location)
		});

		if (!response.ok) {
			const error = await response.json();
			return { success: false, message: error.message || 'Failed to save location' };
		}

		const data = await response.json();
		return { success: true, id: data.id, message: data.message };
	} catch (error) {
		return { success: false, message: 'Network error' };
	}
}

/**
 * Get location and suggestions in one call
 * Useful for auto-completing transaction forms
 */
export async function getLocationBasedSuggestions(): Promise<{
	position: GeolocationPosition | null;
	suggestions: LocationSuggestion[];
	error?: string;
}> {
	const positionResult = await getCurrentPosition();

	if (!positionResult.success) {
		return {
			position: null,
			suggestions: [],
			error: positionResult.error.message
		};
	}

	const { latitude, longitude } = positionResult.position;
	const suggestions = await getLocationSuggestions(latitude, longitude);

	return {
		position: positionResult.position,
		suggestions
	};
}

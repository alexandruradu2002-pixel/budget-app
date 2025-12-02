import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// In-memory cache for exchange rates
let cachedRates: Record<string, number> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fallback rates in case API fails
const FALLBACK_RATES: Record<string, number> = {
	RON: 1,
	EUR: 4.97,
	USD: 4.58,
	GBP: 5.82,
	CHF: 5.18,
	PLN: 1.15,
	HUF: 0.0125,
	CZK: 0.20,
	BGN: 2.54,
	SEK: 0.43,
	NOK: 0.42,
	DKK: 0.67,
	JPY: 0.030,
	CNY: 0.63,
	AUD: 2.98,
	CAD: 3.28
};

async function fetchExchangeRates(): Promise<Record<string, number>> {
	try {
		// Using exchangerate-api.com (free tier - 1500 requests/month)
		// Alternative: frankfurter.app (free, no API key needed)
		const response = await fetch('https://api.frankfurter.app/latest?from=RON');
		
		if (!response.ok) {
			throw new Error(`API responded with status: ${response.status}`);
		}
		
		const data = await response.json();
		
		// frankfurter returns rates FROM RON, we need rates TO RON
		// So we need to invert them
		const ratesToRON: Record<string, number> = { RON: 1 };
		
		for (const [currency, rate] of Object.entries(data.rates)) {
			// rate is how much of 'currency' you get for 1 RON
			// we want how much RON you get for 1 'currency'
			ratesToRON[currency] = 1 / (rate as number);
		}
		
		return ratesToRON;
	} catch (err) {
		console.error('Failed to fetch exchange rates:', err);
		// Return fallback rates if API fails
		return FALLBACK_RATES;
	}
}

function isCacheValid(): boolean {
	if (!cachedRates || !cacheTimestamp) return false;
	return Date.now() - cacheTimestamp < CACHE_DURATION_MS;
}

export const GET: RequestHandler = async () => {
	// Return cached rates if still valid
	if (isCacheValid() && cachedRates) {
		return json({
			rates: cachedRates,
			cached: true,
			lastUpdated: cacheTimestamp,
			nextUpdate: cacheTimestamp! + CACHE_DURATION_MS
		});
	}
	
	// Fetch fresh rates
	const rates = await fetchExchangeRates();
	
	// Update cache
	cachedRates = rates;
	cacheTimestamp = Date.now();
	
	return json({
		rates,
		cached: false,
		lastUpdated: cacheTimestamp,
		nextUpdate: cacheTimestamp + CACHE_DURATION_MS
	});
};

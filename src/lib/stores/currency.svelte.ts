import { 
	SUPPORTED_CURRENCIES, 
	CURRENCY_SYMBOLS, 
	DEFAULT_CURRENCY, 
	EXCHANGE_RATES_TO_RON,
	type CurrencyValue 
} from '$lib/constants';

const RATES_CACHE_KEY = 'exchangeRates';
const RATES_TIMESTAMP_KEY = 'exchangeRatesTimestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedRates {
	rates: Record<string, number>;
	timestamp: number;
}

function createCurrencyStore() {
	let mainCurrency = $state<CurrencyValue>(DEFAULT_CURRENCY);
	let exchangeRates = $state<Record<string, number>>(EXCHANGE_RATES_TO_RON);
	let lastUpdated = $state<number | null>(null);
	let isLoading = $state(false);

	function getCachedRates(): CachedRates | null {
		if (typeof window === 'undefined') return null;
		
		try {
			const ratesStr = localStorage.getItem(RATES_CACHE_KEY);
			const timestampStr = localStorage.getItem(RATES_TIMESTAMP_KEY);
			
			if (!ratesStr || !timestampStr) return null;
			
			return {
				rates: JSON.parse(ratesStr),
				timestamp: parseInt(timestampStr, 10)
			};
		} catch {
			return null;
		}
	}

	function setCachedRates(rates: Record<string, number>, timestamp: number) {
		if (typeof window === 'undefined') return;
		
		try {
			localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(rates));
			localStorage.setItem(RATES_TIMESTAMP_KEY, timestamp.toString());
		} catch {
			// localStorage might be full or disabled
		}
	}

	function isCacheValid(timestamp: number): boolean {
		return Date.now() - timestamp < CACHE_DURATION_MS;
	}

	async function fetchRates(): Promise<void> {
		if (typeof window === 'undefined') return;
		
		isLoading = true;
		
		try {
			const response = await fetch('/api/exchange-rates');
			
			if (!response.ok) {
				throw new Error('Failed to fetch exchange rates');
			}
			
			const data = await response.json();
			
			exchangeRates = data.rates;
			lastUpdated = data.lastUpdated;
			
			// Cache the rates locally
			setCachedRates(data.rates, data.lastUpdated);
		} catch (err) {
			console.error('Failed to fetch exchange rates:', err);
			// Keep using fallback/cached rates
		} finally {
			isLoading = false;
		}
	}

	return {
		get value() {
			return mainCurrency;
		},
		get symbol() {
			return CURRENCY_SYMBOLS[mainCurrency];
		},
		get rates() {
			return exchangeRates;
		},
		get lastUpdated() {
			return lastUpdated;
		},
		get isLoading() {
			return isLoading;
		},
		set(currency: CurrencyValue) {
			mainCurrency = currency;
			// Persist to localStorage
			if (typeof window !== 'undefined') {
				localStorage.setItem('mainCurrency', currency);
			}
		},
		toggle() {
			const currentIndex = SUPPORTED_CURRENCIES.indexOf(mainCurrency);
			const nextIndex = (currentIndex + 1) % SUPPORTED_CURRENCIES.length;
			this.set(SUPPORTED_CURRENCIES[nextIndex]);
		},
		async init() {
			// Load currency preference from localStorage
			if (typeof window !== 'undefined') {
				const saved = localStorage.getItem('mainCurrency') as CurrencyValue | null;
				if (saved && SUPPORTED_CURRENCIES.includes(saved)) {
					mainCurrency = saved;
				}
			}
			
			// Check for cached rates
			const cached = getCachedRates();
			
			if (cached && isCacheValid(cached.timestamp)) {
				// Use cached rates
				exchangeRates = cached.rates;
				lastUpdated = cached.timestamp;
			} else {
				// Fetch fresh rates
				await fetchRates();
			}
		},
		/**
		 * Force refresh exchange rates from API
		 */
		async refreshRates() {
			await fetchRates();
		},
		/**
		 * Convert an amount from one currency to the main currency
		 * @param amount - The amount to convert
		 * @param fromCurrency - The source currency (defaults to RON)
		 * @returns The converted amount in main currency
		 */
		convert(amount: number, fromCurrency: CurrencyValue = 'RON'): number {
			if (fromCurrency === mainCurrency) {
				return amount;
			}
			
			// First convert to RON (base currency)
			const amountInRON = amount * (exchangeRates[fromCurrency] || 1);
			
			// Then convert from RON to main currency
			const amountInMainCurrency = amountInRON / (exchangeRates[mainCurrency] || 1);
			
			return amountInMainCurrency;
		},
		/**
		 * Get exchange rate from one currency to another
		 */
		getRate(from: CurrencyValue, to: CurrencyValue): number {
			if (from === to) return 1;
			return (exchangeRates[from] || 1) / (exchangeRates[to] || 1);
		}
	};
}

export const currencyStore = createCurrencyStore();

import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, DEFAULT_CURRENCY, type CurrencyValue } from '$lib/constants';

// Exchange rates relative to RON (base currency)
// These are approximate rates - in production, you'd fetch from an API
const EXCHANGE_RATES_TO_RON: Record<CurrencyValue, number> = {
	RON: 1,
	EUR: 4.97,  // 1 EUR = 4.97 RON
	USD: 4.58,  // 1 USD = 4.58 RON
	GBP: 5.82   // 1 GBP = 5.82 RON
};

function createCurrencyStore() {
	let mainCurrency = $state<CurrencyValue>(DEFAULT_CURRENCY);

	return {
		get value() {
			return mainCurrency;
		},
		get symbol() {
			return CURRENCY_SYMBOLS[mainCurrency];
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
		init() {
			// Load from localStorage on init
			if (typeof window !== 'undefined') {
				const saved = localStorage.getItem('mainCurrency') as CurrencyValue | null;
				if (saved && SUPPORTED_CURRENCIES.includes(saved)) {
					mainCurrency = saved;
				}
			}
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
			const amountInRON = amount * EXCHANGE_RATES_TO_RON[fromCurrency];
			
			// Then convert from RON to main currency
			const amountInMainCurrency = amountInRON / EXCHANGE_RATES_TO_RON[mainCurrency];
			
			return amountInMainCurrency;
		},
		/**
		 * Get exchange rate from one currency to another
		 */
		getRate(from: CurrencyValue, to: CurrencyValue): number {
			if (from === to) return 1;
			return EXCHANGE_RATES_TO_RON[from] / EXCHANGE_RATES_TO_RON[to];
		}
	};
}

export const currencyStore = createCurrencyStore();

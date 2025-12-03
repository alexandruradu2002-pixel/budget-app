/**
 * Formatting utilities for the budget app
 */

import { CURRENCY_SYMBOLS, ALL_CURRENCY_SYMBOLS, PREFIX_SYMBOL_CURRENCIES, type CurrencyValue } from '$lib/constants';
import { currencyStore } from '$lib/stores';

/**
 * Get the symbol for any currency code
 */
export function getCurrencySymbol(currency: string): string {
	return ALL_CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Check if a currency symbol should be placed before the amount
 */
function isPrefixSymbol(symbol: string): boolean {
	return PREFIX_SYMBOL_CURRENCIES.includes(symbol);
}

/**
 * Format a number with any currency (supports all currencies in ALL_CURRENCY_SYMBOLS)
 * No decimals, uses floor rounding
 */
export function formatWithCurrency(amount: number, currency: string): string {
	const symbol = getCurrencySymbol(currency);
	const floored = Math.floor(amount);
	const formatted = floored.toLocaleString('ro-RO');
	
	if (isPrefixSymbol(symbol)) {
		return `${symbol}${formatted}`;
	}
	return `${formatted} ${symbol}`;
}

/**
 * Format amount with currency, showing sign for negative values
 * No decimals, uses floor rounding
 */
export function formatAmountWithCurrency(amount: number, currency: string): string {
	const symbol = getCurrencySymbol(currency);
	const absAmount = Math.floor(Math.abs(amount));
	const formatted = absAmount.toLocaleString('ro-RO');
	const sign = amount < 0 ? '-' : '';
	
	if (isPrefixSymbol(symbol)) {
		return `${sign}${symbol}${formatted}`;
	}
	return `${sign}${formatted} ${symbol}`;
}

/**
 * Format a number as currency using the main currency from store
 * No decimals, uses floor rounding
 */
export function formatCurrency(amount: number, currency?: CurrencyValue): string {
	const curr = currency || currencyStore.value;
	const symbol = CURRENCY_SYMBOLS[curr];
	const floored = Math.floor(amount);
	
	// For EUR, USD, GBP put symbol before amount
	if (curr !== 'RON') {
		return symbol + floored.toLocaleString('ro-RO');
	}
	
	// For RON (lei), put symbol after amount
	return floored.toLocaleString('ro-RO') + ' ' + symbol;
}

/**
 * Format a number as currency with sign (+ or -)
 * No decimals, uses floor rounding
 */
export function formatCurrencyWithSign(amount: number, currency?: CurrencyValue): string {
	const curr = currency || currencyStore.value;
	const symbol = CURRENCY_SYMBOLS[curr];
	const floored = Math.floor(Math.abs(amount));
	const formatted = floored.toLocaleString('ro-RO');
	const sign = amount >= 0 ? '+' : '-';
	
	// For EUR, USD, GBP put symbol before amount
	if (curr !== 'RON') {
		return `${sign}${symbol}${formatted}`;
	}
	
	// For RON (lei), put symbol after amount
	return `${sign}${formatted} ${symbol}`;
}

/**
 * Format amount for transactions (negative amounts show as positive with minus)
 * No decimals, uses floor rounding
 */
export function formatAmount(amount: number, currency?: CurrencyValue): string {
	const curr = currency || currencyStore.value;
	const symbol = CURRENCY_SYMBOLS[curr];
	const floored = Math.floor(Math.abs(amount));
	const formatted = floored.toLocaleString('ro-RO');
	const sign = amount < 0 ? '-' : '';
	
	// For EUR, USD, GBP put symbol before amount
	if (curr !== 'RON') {
		return `${sign}${symbol}${formatted}`;
	}
	
	// For RON (lei), put symbol after amount
	return `${sign}${formatted} ${symbol}`;
}

/**
 * Convert amount from source currency to main currency and format
 */
export function formatConvertedCurrency(amount: number, fromCurrency: CurrencyValue): string {
	const converted = currencyStore.convert(amount, fromCurrency);
	return formatCurrency(converted);
}

/**
 * Format a date string to a readable format (e.g., "1 December 2025")
 */
export function formatDate(dateStr: string): string {
	const date = new Date(dateStr + 'T00:00:00');
	const months = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];
	return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format a date to show month and year (e.g., "December 2025")
 */
export function formatMonthYear(date: Date): string {
	const months = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];
	return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format a date to show abbreviated month and year (e.g., "Dec 2025")
 */
export function formatMonthYearShort(date: Date): string {
	const months = [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	];
	return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format a date to ISO format (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
	return date.toISOString().split('T')[0];
}

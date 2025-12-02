/**
 * Formatting utilities for the budget app
 */

import { CURRENCY_SYMBOLS, type CurrencyValue } from '$lib/constants';
import { currencyStore } from '$lib/stores';

/**
 * Format a number as currency using the main currency from store
 */
export function formatCurrency(amount: number, currency?: CurrencyValue): string {
	const curr = currency || currencyStore.value;
	const symbol = CURRENCY_SYMBOLS[curr];
	
	// For EUR, USD, GBP put symbol before amount
	if (curr !== 'RON') {
		return symbol + amount.toLocaleString('ro-RO', { 
			minimumFractionDigits: 2, 
			maximumFractionDigits: 2 
		});
	}
	
	// For RON (lei), put symbol after amount
	return amount.toLocaleString('ro-RO', { 
		minimumFractionDigits: 2, 
		maximumFractionDigits: 2 
	}) + ' ' + symbol;
}

/**
 * Format a number as currency with sign (+ or -)
 */
export function formatCurrencyWithSign(amount: number, currency?: CurrencyValue): string {
	const curr = currency || currencyStore.value;
	const symbol = CURRENCY_SYMBOLS[curr];
	const formatted = Math.abs(amount).toLocaleString('ro-RO', { 
		minimumFractionDigits: 2, 
		maximumFractionDigits: 2 
	});
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
 */
export function formatAmount(amount: number, currency?: CurrencyValue): string {
	const curr = currency || currencyStore.value;
	const symbol = CURRENCY_SYMBOLS[curr];
	const formatted = Math.abs(amount).toFixed(2);
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
 * Format a date to ISO format (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
	return date.toISOString().split('T')[0];
}

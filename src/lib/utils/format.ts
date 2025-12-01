/**
 * Formatting utilities for the budget app
 */

/**
 * Format a number as Romanian currency (lei)
 */
export function formatCurrency(amount: number): string {
	return amount.toLocaleString('ro-RO', { 
		minimumFractionDigits: 2, 
		maximumFractionDigits: 2 
	}) + ' lei';
}

/**
 * Format a number as currency with sign (+ or -)
 */
export function formatCurrencyWithSign(amount: number): string {
	const formatted = Math.abs(amount).toLocaleString('ro-RO', { 
		minimumFractionDigits: 2, 
		maximumFractionDigits: 2 
	});
	const sign = amount >= 0 ? '+' : '-';
	return `${sign}${formatted} lei`;
}

/**
 * Format amount for transactions (negative amounts show as positive with minus)
 */
export function formatAmount(amount: number): string {
	const formatted = Math.abs(amount).toFixed(2);
	return `${amount < 0 ? '-' : ''}${formatted} lei`;
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

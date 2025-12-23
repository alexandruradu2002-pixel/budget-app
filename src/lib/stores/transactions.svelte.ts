// ============================================
// Transaction Update Store - Budget App
// Provides reactive signal for cross-page transaction updates
// ============================================

/**
 * A simple store that tracks when transactions have been modified.
 * Pages can react to changes in `updateCounter` to refresh their data.
 * 
 * Usage:
 * - In TransactionModal: call `transactionStore.notifyChange()` after save/delete
 * - In pages: use `$effect(() => { transactionStore.updateCounter; loadData(); })`
 */

// Reactive state using Svelte 5 runes
let updateCounter = $state(0);

function notifyChange() {
	updateCounter++;
}

function getUpdateCounter(): number {
	return updateCounter;
}

// Export the store as an object with methods and reactive getter
export const transactionStore = {
	/**
	 * Call this after any transaction is created, updated, or deleted
	 * to trigger refreshes across all listening pages
	 */
	notifyChange,
	
	/**
	 * Reactive counter that increments on each transaction change.
	 * Use in $effect to trigger data refreshes.
	 */
	get updateCounter() {
		return updateCounter;
	}
};

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

// Use a simple reactive object pattern for better cross-component reactivity
let _counter = $state({ value: 0 });

export const transactionStore = {
	notifyChange() {
		_counter.value++;
		console.log('[TransactionStore] notifyChange called, counter:', _counter.value);
	},
	
	get updateCounter() {
		return _counter.value;
	}
};

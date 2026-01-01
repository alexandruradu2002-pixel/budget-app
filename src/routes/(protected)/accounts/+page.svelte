<script lang="ts">
	import type { Account } from '$lib/types';
	import { browser } from '$app/environment';
	import { LoadingState, PageHeader, HeaderButton, AccountModal } from '$lib/components';
	import { formatWithCurrency, getCurrencySymbol } from '$lib/utils/format';
	import { EXCHANGE_RATES_TO_RON } from '$lib/constants';
	import { currencyStore, offlineStore, toast, transactionStore } from '$lib/stores';

	interface CurrencyTotal {
		currency: string;
		symbol: string;
		amount: number;
	}

	interface AccountGroup {
		name: string;
		icon: string;
		accounts: Account[];
		currencyTotals: CurrencyTotal[];
	}

	let loading = $state(true);
	let accounts = $state<Account[]>([]);
	let closedAccounts = $state<Account[]>([]);
	let showClosedAccounts = $state(false);
	let showAccountModal = $state(false);
	let isReorderMode = $state(false);
	let isEditMode = $state(false);
	let editingAccount = $state<Account | null>(null);
	
	// Notes popup state
	let showNotesPopup = $state(false);
	let notesPopupContent = $state('');
	let notesPopupAccountName = $state('');

	function openNotesPopup(account: Account, event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		notesPopupContent = account.notes || '';
		notesPopupAccountName = account.name;
		showNotesPopup = true;
	}

	// Helper function to calculate currency totals for a list of accounts
	function calculateCurrencyTotals(accountList: Account[]): CurrencyTotal[] {
		const totals: Record<string, number> = {};
		
		accountList.forEach(account => {
			const currency = account.currency || 'RON';
			totals[currency] = (totals[currency] || 0) + account.balance;
		});
		
		return Object.entries(totals)
			.map(([currency, amount]) => ({
				currency,
				symbol: getCurrencySymbol(currency),
				amount
			}))
			.sort((a, b) => {
				// RON first, then alphabetically
				if (a.currency === 'RON') return -1;
				if (b.currency === 'RON') return 1;
				return a.currency.localeCompare(b.currency);
			});
	}

	// Group accounts by type - only Cash, Savings, Investing
	let accountGroups = $derived.by<AccountGroup[]>(() => {
		const activeAccounts = accounts.filter(a => a.is_active);
		
		// Group by the 3 main types and sort by sort_order
		const cashAccounts = activeAccounts
			.filter(a => a.type === 'cash' || a.type === 'checking')
			.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
		const savingsAccounts = activeAccounts
			.filter(a => a.type === 'savings')
			.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
		const investingAccounts = activeAccounts
			.filter(a => a.type === 'investment')
			.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
		
		const groups: AccountGroup[] = [];
		
		// Only add groups that have accounts
		if (cashAccounts.length > 0) {
			groups.push({
				name: 'Cash',
				icon: '💵',
				accounts: cashAccounts,
				currencyTotals: calculateCurrencyTotals(cashAccounts)
			});
		}
		
		if (savingsAccounts.length > 0) {
			groups.push({
				name: 'Savings',
				icon: '💰',
				accounts: savingsAccounts,
				currencyTotals: calculateCurrencyTotals(savingsAccounts)
			});
		}
		
		if (investingAccounts.length > 0) {
			groups.push({
				name: 'Investing',
				icon: '📈',
				accounts: investingAccounts,
				currencyTotals: calculateCurrencyTotals(investingAccounts)
			});
		}
		
		return groups;
	});

	// Calculate totals by currency
	let currencyTotals = $derived.by<CurrencyTotal[]>(() => {
		const activeAccounts = accounts.filter(a => a.is_active);
		const totals: Record<string, number> = {};
		
		activeAccounts.forEach(account => {
			const currency = account.currency || 'RON';
			totals[currency] = (totals[currency] || 0) + account.balance;
		});
		
		return Object.entries(totals)
			.map(([currency, amount]) => ({
				currency,
				symbol: getCurrencySymbol(currency),
				amount
			}))
			.sort((a, b) => {
				// RON first, then by amount (converted to RON)
				if (a.currency === 'RON') return -1;
				if (b.currency === 'RON') return 1;
				return (b.amount * (EXCHANGE_RATES_TO_RON[b.currency] || 1)) - (a.amount * (EXCHANGE_RATES_TO_RON[a.currency] || 1));
			});
	});

	// Calculate total balance in RON (all currencies converted)
	let totalBalanceRON = $derived.by(() => {
		const activeAccounts = accounts.filter(a => a.is_active);
		return activeAccounts.reduce((sum, account) => {
			const currency = account.currency || 'RON';
			const rate = EXCHANGE_RATES_TO_RON[currency] || 1;
			return sum + (account.balance * rate);
		}, 0);
	});

	// Check if we have multiple currencies
	let hasMultipleCurrencies = $derived(currencyTotals.length > 1);

	// Format account balance with its currency (no decimals)
	function formatAccountBalance(account: Account): string {
		const currency = account.currency || 'RON';
		return formatWithCurrency(account.balance, currency);
	}

	async function loadAccounts() {
		try {
			// If offline, load from IndexedDB
			if (!offlineStore.isOnline) {
				const offlineAccounts = await offlineStore.getAccounts();
				if (offlineAccounts.length > 0) {
					accounts = offlineAccounts.filter((a: Account) => a.is_active);
					closedAccounts = offlineAccounts.filter((a: Account) => !a.is_active);
					toast.info('Showing cached accounts.');
				}
				loading = false;
				return;
			}

			// Add cache-busting timestamp to ensure fresh data
			const cacheBust = `_t=${Date.now()}`;
			const response = await fetch(`/api/accounts?includeInactive=true&${cacheBust}`);
			if (response.ok) {
				const data = await response.json();
				const allAccounts = data.accounts || [];
				accounts = allAccounts.filter((a: Account) => a.is_active);
				closedAccounts = allAccounts.filter((a: Account) => !a.is_active);
			}
		} catch (error) {
			console.error('Failed to load accounts:', error);
			// Fallback to offline data
			try {
				const offlineAccounts = await offlineStore.getAccounts();
				if (offlineAccounts.length > 0) {
					accounts = offlineAccounts.filter((a: Account) => a.is_active);
					closedAccounts = offlineAccounts.filter((a: Account) => !a.is_active);
					toast.info('Showing cached accounts.');
				}
			} catch {
				// Ignore offline fallback errors
			}
		} finally {
			loading = false;
		}
	}

	// Track last known update counter to detect changes
	let lastUpdateCounter = $state(-1);

	// Single unified effect for loading data - only runs on client to avoid SSR issues
	$effect(() => {
		// Skip during SSR to prevent hydration mismatches
		if (!browser) return;
		
		const currentCounter = transactionStore.updateCounter;
		
		if (currentCounter !== lastUpdateCounter) {
			console.log('[Accounts] Loading data - counter:', currentCounter);
			lastUpdateCounter = currentCounter;
			loadAccounts();
		}
	});

	// Move an account up or down within its group
	async function moveAccount(groupIndex: number, accountIndex: number, direction: 'up' | 'down') {
		// Get current group accounts directly
		const group = accountGroups[groupIndex];
		if (!group) {
			return;
		}
		
		const groupAccounts = [...group.accounts];
		const newIndex = direction === 'up' ? accountIndex - 1 : accountIndex + 1;
		
		if (newIndex < 0 || newIndex >= groupAccounts.length) {
			return;
		}
		
		// Swap the accounts
		const temp = groupAccounts[accountIndex];
		groupAccounts[accountIndex] = groupAccounts[newIndex];
		groupAccounts[newIndex] = temp;
		
		// Create the new order with sort_order values
		const accountsToUpdate = groupAccounts.map((account, index) => ({
			id: account.id,
			sort_order: index
		}));
		
		// Save to database
		try {
			const response = await fetch('/api/accounts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accounts: accountsToUpdate })
			});
			
			if (response.ok) {
				// Reload accounts to reflect the new order
				await loadAccounts();
			}
		} catch (error) {
			// Silent fail - UI will remain unchanged
		}
	}

	async function reopenAccount(accountId: number) {
		try {
			const response = await fetch(`/api/accounts?id=${accountId}&action=reopen`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' }
			});
			
			if (response.ok) {
				await loadAccounts();
			}
		} catch (error) {
			// Silent fail - UI will remain unchanged
		}
	}
</script>

<div class="accounts-page">
	<PageHeader title="Accounts">
		<HeaderButton label={isEditMode ? "Done" : "Edit"} onclick={() => { isEditMode = !isEditMode; if (isEditMode) isReorderMode = false; }}>
			{#if isEditMode}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			{:else}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
				</svg>
			{/if}
		</HeaderButton>
		<HeaderButton label={isReorderMode ? "Done" : "Reorder"} onclick={() => { isReorderMode = !isReorderMode; if (isReorderMode) isEditMode = false; }}>
			{#if isReorderMode}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			{:else}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3 7h18M3 12h18M3 17h18" />
				</svg>
			{/if}
		</HeaderButton>
	</PageHeader>

	{#if loading}
		<LoadingState message="Loading accounts..." />
	{:else}
		<!-- Total Balance Header -->
		<div class="total-balance-section">
			<span class="total-label">Total Balance</span>
			<span class="total-amount">{formatWithCurrency(totalBalanceRON, 'RON')}</span>
			
			{#if hasMultipleCurrencies}
				<div class="currency-breakdown">
					{#each currencyTotals as ct}
						<span class="currency-item">
							{formatWithCurrency(ct.amount, ct.currency)}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Account Groups -->
		<div class="accounts-content">
			{#each accountGroups as group, groupIndex}
				<!-- Group Header -->
				<div class="group-header">
					<div class="group-name-row">
						<span class="group-icon">{group.icon}</span>
						<span class="group-name">{group.name}</span>
					</div>
					<div class="group-totals">
						{#each group.currencyTotals as ct}
							<span class="group-total-item">{formatWithCurrency(ct.amount, ct.currency)}</span>
						{/each}
					</div>
				</div>
				
				<!-- Accounts in Group -->
				<div class="accounts-group">
					{#each group.accounts as account, index (account.id)}
						{#if isReorderMode}
							<div class="account-row reorder-row" class:has-border={index > 0}>
								<div class="account-info">
									<span class="account-name">{account.name}</span>
									{#if account.currency && account.currency !== currencyStore.value}
										<span class="account-currency">{account.currency}</span>
									{/if}
								</div>
								<div class="reorder-arrows">
									<button 
										class="reorder-arrow" 
										disabled={index === 0}
										onclick={() => moveAccount(groupIndex, index, 'up')}
										aria-label="Move up"
									>
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
										</svg>
									</button>
									<button 
										class="reorder-arrow" 
										disabled={index === group.accounts.length - 1}
										onclick={() => moveAccount(groupIndex, index, 'down')}
										aria-label="Move down"
									>
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
										</svg>
									</button>
								</div>
							</div>
						{:else if isEditMode}
							<div class="account-row edit-row" class:has-border={index > 0}>
								<div class="account-info">
									<span class="account-name">{account.name}</span>
									{#if account.currency && account.currency !== currencyStore.value}
										<span class="account-currency">{account.currency}</span>
									{/if}
								</div>
								<button 
									class="edit-button"
									onclick={() => { editingAccount = account; showAccountModal = true; }}
									aria-label="Edit account"
								>
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
									</svg>
								</button>
							</div>
						{:else}
							<a href="/accounts/{account.id}" class="account-row" class:has-border={index > 0}>
								<div class="account-info">
									<span class="account-name">{account.name}</span>
									{#if account.currency && account.currency !== currencyStore.value}
										<span class="account-currency">{account.currency}</span>
									{/if}
									{#if account.notes}
										<button 
											class="notes-icon-btn"
											onclick={(e) => openNotesPopup(account, e)}
											aria-label="View notes"
										>
											<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
											</svg>
										</button>
									{/if}
								</div>
								<span class="account-balance" class:negative={account.balance < 0}>
									{formatAccountBalance(account)}
								</span>
							</a>
						{/if}
					{/each}
				</div>
			{/each}

			<!-- Empty State -->
			{#if accountGroups.length === 0}
				<div class="empty-state">
					<span class="empty-icon">🏦</span>
					<p class="empty-text">No accounts yet</p>
					<p class="empty-subtext">Add your first account to get started</p>
				</div>
			{/if}

			<!-- Closed Accounts Section -->
			{#if closedAccounts.length > 0}
				<!-- Closed Header -->
				<div class="group-header closed-header">
					<span class="group-name">Closed</span>
				</div>
				
				<div class="accounts-group">
					<button onclick={() => showClosedAccounts = !showClosedAccounts} class="closed-toggle">
						<span>{closedAccounts.length} closed account{closedAccounts.length > 1 ? 's' : ''}</span>
						<svg class="chevron-icon" class:rotated={showClosedAccounts} fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
						</svg>
					</button>
					
					{#if showClosedAccounts}
						{#each closedAccounts as account (account.id)}
							<a href="/accounts/{account.id}" class="account-row closed has-border">
								<div class="account-info">
									<span class="account-name muted">{account.name}</span>
									{#if account.currency && account.currency !== currencyStore.value}
										<span class="account-currency">{account.currency}</span>
									{/if}
								</div>
								<div class="closed-actions">
									<span class="account-balance muted">{formatAccountBalance(account)}</span>
									<button 
										class="reopen-button"
										onclick={(e) => { e.preventDefault(); reopenAccount(account.id); }}
										aria-label="Reopen account"
									>
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
										</svg>
									</button>
								</div>
							</a>
						{/each}
					{/if}
				</div>
			{/if}
		</div>

		<!-- Bottom Actions -->
		<div class="bottom-actions">
			<button class="action-button primary" onclick={() => { editingAccount = null; showAccountModal = true; }}>
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<circle cx="12" cy="12" r="9"/>
					<line x1="12" y1="8" x2="12" y2="16"/>
					<line x1="8" y1="12" x2="16" y2="12"/>
				</svg>
				Add Account
			</button>
		</div>
	{/if}
</div>

<!-- Account Modal -->
<AccountModal 
	bind:show={showAccountModal}
	account={editingAccount}
	allAccounts={accounts}
	onSave={loadAccounts}
	onClose={() => { editingAccount = null; }}
	onCloseAccount={loadAccounts}
/>

<!-- Notes Popup -->
{#if showNotesPopup}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="notes-popup-overlay" onclick={() => showNotesPopup = false} role="presentation" onkeydown={(e) => e.key === 'Escape' && (showNotesPopup = false)}>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div class="notes-popup" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="notes-popup-header">
				<h3 class="notes-popup-title">{notesPopupAccountName}</h3>
				<button class="notes-popup-close" onclick={() => showNotesPopup = false} aria-label="Close">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="notes-popup-content">
				<p>{notesPopupContent}</p>
			</div>
		</div>
	</div>
{/if}

<style>
	.accounts-page {
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - 70px);
		min-height: calc(100dvh - 70px);
	}

	/* Total Balance Section */
	.total-balance-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24px 16px;
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
		margin: 0 16px 16px;
		border-radius: 16px;
	}

	.total-label {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 4px;
	}

	.total-amount {
		font-size: 28px;
		font-weight: 700;
		color: white;
	}

	.currency-breakdown {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px 16px;
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
	}

	.currency-item {
		font-size: 14px;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 600;
	}

	/* Content */
	.accounts-content {
		flex: 1;
		padding: 0 16px;
	}

	/* Group Header */
	.group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 4px 8px;
		margin-top: 8px;
	}

	.group-header:first-child {
		margin-top: 0;
	}

	.group-header.closed-header {
		margin-top: 16px;
	}

	.group-name-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.group-icon {
		font-size: 16px;
	}

	.group-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.group-totals {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
	}

	.group-total-item {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	/* Reorder Arrows */
	.reorder-arrows {
		display: flex;
		gap: 8px;
	}

	.reorder-arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background-color: var(--color-bg-secondary);
		border: none;
		border-radius: 8px;
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.reorder-arrow:active {
		background-color: var(--color-bg-tertiary);
	}

	.reorder-arrow:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.reorder-arrow svg {
		width: 20px;
		height: 20px;
	}

	.reorder-row {
		cursor: default;
	}

	/* Edit Mode */
	.edit-row {
		cursor: default;
	}

	.edit-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background-color: var(--color-bg-tertiary);
		border: none;
		border-radius: 8px;
		color: var(--color-primary);
		cursor: pointer;
	}

	.edit-button:active {
		background-color: var(--color-border);
	}

	.edit-button svg {
		width: 18px;
		height: 18px;
	}

	/* Accounts Group */
	.accounts-group {
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		overflow: hidden;
	}

	/* Account Row */
	.account-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		text-decoration: none;
		min-height: 52px;
	}

	.account-row:active {
		background-color: var(--color-bg-tertiary);
	}

	.account-row.has-border {
		border-top: 1px solid var(--color-border);
	}

	.account-row.closed {
		cursor: default;
	}

	.account-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.account-name {
		font-size: 16px;
		color: var(--color-text-primary);
	}

	.account-name.muted {
		color: var(--color-text-muted);
	}

	.account-currency {
		font-size: 12px;
		color: var(--color-text-muted);
		background-color: var(--color-bg-tertiary);
		padding: 2px 6px;
		border-radius: 4px;
	}

	.account-balance {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-success);
	}

	.account-balance.negative {
		color: var(--color-danger);
	}

	.account-balance.muted {
		color: var(--color-text-muted);
		font-weight: 400;
	}

	/* Closed Actions */
	.closed-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.reopen-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background-color: var(--color-bg-tertiary);
		border: none;
		border-radius: 8px;
		color: var(--color-primary);
		cursor: pointer;
	}

	.reopen-button:active {
		background-color: var(--color-border);
	}

	.reopen-button svg {
		width: 16px;
		height: 16px;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
		text-align: center;
	}

	.empty-icon {
		font-size: 48px;
		margin-bottom: 16px;
	}

	.empty-text {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 8px;
	}

	.empty-subtext {
		font-size: 14px;
		color: var(--color-text-muted);
		margin: 0;
	}

	/* Closed Toggle */
	.closed-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 14px 16px;
		background: none;
		border: none;
		text-align: left;
		color: var(--color-text-muted);
		font-size: 15px;
	}

	.closed-toggle:active {
		background-color: var(--color-bg-tertiary);
	}

	.chevron-icon {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
		transition: transform 0.2s;
	}

	.chevron-icon.rotated {
		transform: rotate(90deg);
	}

	/* Bottom Actions */
	.bottom-actions {
		padding: 24px 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 14px;
		background-color: var(--color-bg-secondary);
		border: none;
		border-radius: 12px;
		color: var(--color-primary);
		font-size: 16px;
		font-weight: 500;
		min-height: 52px;
	}

	.action-button:active {
		background-color: var(--color-bg-tertiary);
	}

	.action-button svg {
		width: 20px;
		height: 20px;
	}

	/* Notes Icon Button */
	.notes-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: none;
		border: none;
		padding: 0;
		color: var(--color-text-muted);
		cursor: pointer;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.notes-icon-btn:hover,
	.notes-icon-btn:active {
		color: var(--color-primary);
		background-color: var(--color-bg-tertiary);
	}

	.notes-icon-btn svg {
		width: 16px;
		height: 16px;
	}

	/* Notes Popup */
	.notes-popup-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 16px;
	}

	.notes-popup {
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		width: 100%;
		max-width: 320px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
		overflow: hidden;
	}

	.notes-popup-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.notes-popup-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.notes-popup-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		border-radius: 8px;
	}

	.notes-popup-close:active {
		background-color: var(--color-bg-tertiary);
	}

	.notes-popup-close svg {
		width: 20px;
		height: 20px;
	}

	.notes-popup-content {
		padding: 16px;
	}

	.notes-popup-content p {
		margin: 0;
		font-size: 15px;
		color: var(--color-text-secondary);
		line-height: 1.5;
		white-space: pre-wrap;
	}
</style>

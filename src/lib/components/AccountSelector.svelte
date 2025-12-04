<script lang="ts">
	import type { Account } from '$lib/types';
	import { cacheStore } from '$lib/stores';

	// Currency symbols map
	const currencySymbols: Record<string, string> = {
		RON: 'lei',
		EUR: '€',
		USD: '$',
		GBP: '£',
		CHF: 'Fr',
		PLN: 'zł',
		HUF: 'Ft',
		CZK: 'Kč',
		BGN: 'лв',
		SEK: 'kr',
		NOK: 'kr',
		DKK: 'kr',
		JPY: '¥',
		CNY: '¥',
		AUD: 'A$',
		CAD: 'C$'
	};

	// Format amount with account's currency
	function formatWithCurrency(amount: number, currency: string = 'RON'): string {
		const symbol = currencySymbols[currency] || currency;
		const formatted = amount.toLocaleString('ro-RO', { 
			minimumFractionDigits: 2, 
			maximumFractionDigits: 2 
		});
		
		if (['€', '$', '£', '¥'].includes(symbol)) {
			return `${symbol}${formatted}`;
		}
		return `${formatted} ${symbol}`;
	}

	// Props
	let {
		show = $bindable(false),
		selectedAccountId = $bindable(0),
		onSelect = (account: Account) => {},
		onClose = () => {}
	} = $props();

	// State - use cache store's reactive accounts
	let accounts = $derived(cacheStore.activeAccounts);
	let loading = $derived(cacheStore.accountsLoading);
	let error = $state('');

	// Group accounts by type
	let groupedAccounts = $derived(() => {
		const groups: Record<string, Account[]> = {};
		
		for (const account of accounts) {
			const groupName = getAccountTypeLabel(account.type);
			if (!groups[groupName]) {
				groups[groupName] = [];
			}
			groups[groupName].push(account);
		}

		return groups;
	});

	// Check URL hash on mount to restore state after reload
	$effect(() => {
		if (typeof window !== 'undefined' && window.location.hash === '#account-selector') {
			show = true;
		}
	});

	// Load accounts when modal opens
	$effect(() => {
		if (show) {
			loadAccounts();
			// Update URL hash so reload keeps the modal open
			if (typeof window !== 'undefined' && window.location.hash !== '#account-selector') {
				history.pushState({ accountSelector: true }, '', '#account-selector');
			}
		}
	});

	// Handle browser back button
	function handlePopState(event: PopStateEvent) {
		if (show && window.location.hash !== '#account-selector') {
			show = false;
			onClose();
		}
	}

	async function loadAccounts() {
		error = '';
		try {
			// Uses cache - instant load from localStorage, then background refresh
			await cacheStore.loadAccounts();
		} catch (e) {
			error = 'Could not load accounts';
			console.error(e);
		}
	}

	function selectAccount(account: Account) {
		selectedAccountId = account.id;
		onSelect(account);
		closeModal();
	}

	function closeModal() {
		// Remove hash and go back in history
		if (typeof window !== 'undefined' && window.location.hash === '#account-selector') {
			history.back();
		}
		show = false;
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}

	function getAccountTypeLabel(type: string): string {
		switch (type) {
			case 'checking': return 'Checking';
			case 'savings': return 'Savings';
			case 'credit_card': return 'Credit Card';
			case 'cash': return 'Cash';
			case 'investment': return 'Investment';
			case 'tracking': return 'Tracking';
			default: return 'Other';
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} onpopstate={handlePopState} />

{#if show}
	<div class="modal-overlay">
		<!-- Header -->
		<header class="modal-header">
			<button aria-label="Înapoi" onclick={closeModal} class="back-btn">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<h2 class="modal-title">Account</h2>
			<div class="header-spacer"></div>
		</header>

		<!-- Content -->
		<div class="modal-content">
			{#if loading}
				<div class="loading-state">
					<div class="spinner"></div>
					<span>Loading accounts...</span>
				</div>
			{:else if error}
				<div class="error-state">
					<p>{error}</p>
					<button onclick={() => loadAccounts()} class="retry-btn">Try Again</button>
				</div>
			{:else if accounts.length === 0}
				<div class="empty-state">
					<svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
					</svg>
					<p class="empty-title">No accounts found</p>
					<p class="empty-text">Add some accounts to get started</p>
				</div>
			{:else}
				<!-- Accounts List grouped by type -->
				<div class="accounts-list">
					{#each Object.entries(groupedAccounts()) as [groupName, groupAccounts] (groupName)}
						<div class="account-group">
							<div class="group-header">
								<span class="group-name">{groupName}</span>
							</div>
							<div class="group-items">
								{#each groupAccounts as account (account.id)}
									<button 
										class="account-item"
										class:selected={selectedAccountId === account.id}
										onclick={() => selectAccount(account)}
									>
										<div class="radio-circle" class:checked={selectedAccountId === account.id}>
											{#if selectedAccountId === account.id}
												<div class="radio-dot"></div>
											{/if}
										</div>
										<div class="account-info">
											<span class="account-name">{account.name}</span>
											{#if account.currency && account.currency !== 'RON'}
												<span class="currency-tag">{account.currency}</span>
											{/if}
										</div>
										<span class="account-balance">{formatWithCurrency(account.balance, account.currency)}</span>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 210;
		background-color: var(--color-bg-primary);
		display: flex;
		flex-direction: column;
	}

	/* Header */
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		margin-left: -8px;
		background: none;
		border: none;
		color: var(--color-text-primary);
		border-radius: 12px;
	}

	.back-btn:active {
		background-color: var(--color-bg-tertiary);
	}

	.back-btn svg {
		width: 24px;
		height: 24px;
	}

	.modal-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.header-spacer {
		width: 44px;
	}

	/* Content */
	.modal-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
	}

	/* Accounts List */
	.accounts-list {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.account-group {
		display: flex;
		flex-direction: column;
	}

	.group-header {
		padding: 0 4px 8px;
	}

	.group-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.group-items {
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		overflow: hidden;
	}

	.account-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		text-align: left;
		width: 100%;
		cursor: pointer;
	}

	.account-item:last-child {
		border-bottom: none;
	}

	.account-item:active {
		background-color: var(--color-bg-tertiary);
	}

	/* Radio Circle */
	.radio-circle {
		width: 22px;
		height: 22px;
		border: 2px solid var(--color-text-muted);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: border-color 0.15s;
	}

	.radio-circle.checked {
		border-color: var(--color-primary);
	}

	.radio-dot {
		width: 12px;
		height: 12px;
		background-color: var(--color-primary);
		border-radius: 50%;
	}

	.account-info {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.account-name {
		font-size: 16px;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.currency-tag {
		padding: 2px 8px;
		background-color: var(--color-bg-tertiary);
		border-radius: 12px;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.3px;
		flex-shrink: 0;
	}

	.account-balance {
		font-size: 15px;
		font-weight: 500;
		color: var(--color-success);
		flex-shrink: 0;
	}

	/* States */
	.loading-state,
	.empty-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
		gap: 16px;
		color: var(--color-text-muted);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.empty-icon {
		width: 48px;
		height: 48px;
		color: var(--color-text-muted);
	}

	.empty-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.empty-text {
		font-size: 14px;
		margin: 0;
		text-align: center;
	}

	.retry-btn {
		padding: 10px 20px;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}

	.retry-btn:active {
		opacity: 0.9;
	}
</style>

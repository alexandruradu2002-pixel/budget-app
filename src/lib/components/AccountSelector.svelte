<script lang="ts">
	import type { Account } from '$lib/types';
	import { formatCurrency } from '$lib/utils/format';

	// Props
	let {
		show = $bindable(false),
		selectedAccountId = $bindable(0),
		onSelect = (account: Account) => {},
		onClose = () => {}
	} = $props();

	// State
	let searchQuery = $state('');
	let accounts = $state<Account[]>([]);
	let loading = $state(false);
	let error = $state('');

	// Filter accounts by search
	let filteredAccounts = $derived(() => {
		if (!searchQuery) return accounts;
		return accounts.filter(a => 
			a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			a.type.toLowerCase().includes(searchQuery.toLowerCase())
		);
	});

	// Load accounts when modal opens
	$effect(() => {
		if (show) {
			loadAccounts();
		}
	});

	async function loadAccounts() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/accounts');
			if (!res.ok) throw new Error('Failed to load accounts');
			const data = await res.json();
			accounts = data.accounts || [];
		} catch (e) {
			error = 'Could not load accounts';
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function selectAccount(account: Account) {
		selectedAccountId = account.id;
		onSelect(account);
		closeModal();
	}

	function closeModal() {
		show = false;
		searchQuery = '';
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}

	function getAccountTypeIcon(type: string): string {
		switch (type) {
			case 'checking': return 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z';
			case 'savings': return 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z';
			case 'credit_card': return 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z';
			case 'cash': return 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z';
			case 'investment': return 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6';
			default: return 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z';
		}
	}

	function getAccountTypeLabel(type: string): string {
		switch (type) {
			case 'checking': return 'Checking';
			case 'savings': return 'Savings';
			case 'credit_card': return 'Credit Card';
			case 'cash': return 'Cash';
			case 'investment': return 'Investment';
			default: return 'Other';
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<div class="modal-overlay">
		<!-- Header -->
		<header class="modal-header">
			<button aria-label="Înapoi" onclick={closeModal} class="back-btn">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<h2 class="modal-title">Select Account</h2>
			<div class="header-spacer"></div>
		</header>

		<!-- Search Input -->
		<div class="search-container">
			<div class="search-input-wrapper">
				<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search accounts..."
					class="search-input"
				/>
				{#if searchQuery}
					<button aria-label="Clear search" onclick={() => searchQuery = ''} class="clear-btn">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
		</div>

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
			{:else if filteredAccounts().length === 0}
				<div class="empty-state">
					<svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
					</svg>
					<p class="empty-title">No accounts found</p>
					<p class="empty-text">
						{searchQuery ? 'Try a different search term' : 'Add some accounts to get started'}
					</p>
				</div>
			{:else}
				<!-- Accounts List -->
				<div class="accounts-list">
					{#each filteredAccounts() as account (account.id)}
						<button 
							class="account-item"
							class:selected={selectedAccountId === account.id}
							onclick={() => selectAccount(account)}
						>
							<div class="account-icon" style="background-color: {account.color || 'var(--color-primary)'}">
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d={getAccountTypeIcon(account.type)} />
								</svg>
							</div>
							<div class="account-info">
								<span class="account-name">{account.name}</span>
								<span class="account-details">
									{getAccountTypeLabel(account.type)} • {formatCurrency(account.balance)}
								</span>
							</div>
							{#if selectedAccountId === account.id}
								<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
								</svg>
							{/if}
						</button>
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

	/* Search */
	.search-container {
		padding: 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.search-input-wrapper {
		display: flex;
		align-items: center;
		gap: 12px;
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		padding: 0 16px;
	}

	.search-icon {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		padding: 14px 0;
		font-size: 16px;
		color: var(--color-text-primary);
		outline: none;
	}

	.search-input::placeholder {
		color: var(--color-text-muted);
	}

	.clear-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background-color: var(--color-bg-tertiary);
		border: none;
		border-radius: 50%;
		color: var(--color-text-muted);
	}

	.clear-btn svg {
		width: 16px;
		height: 16px;
	}

	/* Content */
	.modal-content {
		flex: 1;
		overflow-y: auto;
	}

	/* Accounts List */
	.accounts-list {
		display: flex;
		flex-direction: column;
	}

	.account-item {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		text-align: left;
		width: 100%;
		cursor: pointer;
	}

	.account-item:active {
		background-color: var(--color-bg-secondary);
	}

	.account-item.selected {
		background-color: var(--color-bg-secondary);
	}

	.account-icon {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 12px;
		color: white;
		flex-shrink: 0;
	}

	.account-icon svg {
		width: 22px;
		height: 22px;
	}

	.account-info {
		flex: 1;
		min-width: 0;
	}

	.account-name {
		display: block;
		font-size: 16px;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.account-details {
		display: block;
		font-size: 13px;
		color: var(--color-text-muted);
		margin-top: 2px;
	}

	.check-icon {
		width: 24px;
		height: 24px;
		color: var(--color-primary);
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

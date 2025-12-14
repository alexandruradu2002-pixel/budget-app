<script lang="ts">
	import { page } from '$app/stores';
	import type { Transaction, Account, Category } from '$lib/types';
	import { TransactionModal, LoadingState, EmptyState, FloatingActionButton } from '$lib/components';
	import { formatDateWithDay, formatWithCurrency as formatWithCurrencyUtil, formatCurrency } from '$lib/utils/format';
	import { offlineStore, toast } from '$lib/stores';

	let accountId = $derived(Number($page.params.id));
	
	let loading = $state(true);
	let account = $state<Account | null>(null);
	let transactions = $state<Transaction[]>([]);
	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);
	let showAddModal = $state(false);
	let editingTransaction = $state<Transaction | null>(null);
	let searchQuery = $state('');
	let showSearch = $state(false);

	// Format amount with account's currency (uses sign for negative amounts)
	function formatAccountAmount(amount: number): string {
		const currency = account?.currency || 'RON';
		return formatWithCurrencyUtil(amount, currency);
	}

	let groupedTransactions = $derived.by(() => {
		const filtered = transactions.filter(
			(t) =>
				t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
		);
		const groups: Record<string, Transaction[]> = {};
		for (const tx of filtered) {
			if (!groups[tx.date]) groups[tx.date] = [];
			groups[tx.date].push(tx);
		}
		return Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
	});

	async function loadData() {
		loading = true;
		try {
			// If offline, load from IndexedDB
			if (!offlineStore.isOnline) {
				const [offlineAccounts, offlineTx, offlineCats] = await Promise.all([
					offlineStore.getAccounts(),
					offlineStore.getTransactions(accountId),
					offlineStore.getCategories()
				]);
				
				accounts = offlineAccounts;
				account = accounts.find((a: Account) => a.id === accountId) || null;
				transactions = offlineTx;
				categories = offlineCats;
				
				if (accounts.length > 0) {
					toast.info('Showing cached data.');
				}
				loading = false;
				return;
			}

			const [accRes, txRes, catRes] = await Promise.all([
				fetch('/api/accounts?includeInactive=true'),
				fetch(`/api/transactions?accountId=${accountId}`),
				fetch('/api/categories')
			]);
			
			if (accRes.ok) {
				const data = await accRes.json();
				accounts = data.accounts || [];
				account = accounts.find((a: Account) => a.id === accountId) || null;
			}
			if (txRes.ok) transactions = (await txRes.json()).transactions;
			if (catRes.ok) categories = (await catRes.json()).categories;
		} catch (error) {
			console.error('Failed to load data:', error);
			// Fallback to offline data
			try {
				const [offlineAccounts, offlineTx, offlineCats] = await Promise.all([
					offlineStore.getAccounts(),
					offlineStore.getTransactions(accountId),
					offlineStore.getCategories()
				]);
				
				accounts = offlineAccounts;
				account = accounts.find((a: Account) => a.id === accountId) || null;
				transactions = offlineTx;
				categories = offlineCats;
				
				if (accounts.length > 0) {
					toast.info('Showing cached data.');
				}
			} catch {
				// Ignore offline fallback errors
			}
		} finally {
			loading = false;
		}
	}

	async function handleSaveTransaction(payload: any) {
		try {
			// Default to current account if not specified
			if (!payload.account_id) {
				payload.account_id = accountId;
			}
			const res = await fetch('/api/transactions', {
				method: payload.id ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (res.ok) {
				await loadData();
			} else if (!offlineStore.isOnline) {
				// Offline - use offline store
				const result = payload.id 
					? await offlineStore.updateTransaction(payload.id, payload)
					: await offlineStore.createTransaction(payload);
				
				if (result.success) {
					toast.success('Saved offline. Will sync when online.');
					await loadData();
				}
			}
		} catch (error) {
			console.error('Failed to save transaction:', error);
			if (!offlineStore.isOnline) {
				const result = payload.id 
					? await offlineStore.updateTransaction(payload.id, payload)
					: await offlineStore.createTransaction(payload);
				
				if (result.success) {
					toast.success('Saved offline. Will sync when online.');
					await loadData();
				}
			}
		}
	}

	async function handleDeleteTransaction(id: number) {
		try {
			const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
			if (res.ok) {
				await loadData();
			} else if (!offlineStore.isOnline) {
				const result = await offlineStore.deleteTransaction(id);
				if (result.success) {
					toast.success('Deleted offline. Will sync when online.');
					await loadData();
				}
			}
		} catch (error) {
			console.error('Failed to delete transaction:', error);
			if (!offlineStore.isOnline) {
				const result = await offlineStore.deleteTransaction(id);
				if (result.success) {
					toast.success('Deleted offline. Will sync when online.');
					await loadData();
				}
			}
		}
	}

	function openEditModal(tx: Transaction) {
		editingTransaction = tx;
		showAddModal = true;
	}

	function openAddModal() {
		editingTransaction = null;
		showAddModal = true;
	}

	function handleCloseModal() {
		editingTransaction = null;
	}

	function needsAssignment(tx: Transaction): boolean {
		return !tx.category_id || tx.category_name === 'Ready to Assign';
	}

	function getAccountTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			checking: 'Cash',
			cash: 'Cash',
			savings: 'Savings',
			investment: 'Investing',
			credit_card: 'Credit Card',
			other: 'Other'
		};
		return labels[type] || type;
	}

	$effect(() => { 
		if (accountId) loadData(); 
	});
</script>

<div class="account-page">
	<!-- Custom Header with Back Button -->
	<header class="page-header">
		<div class="header-left">
			<a href="/accounts" class="back-button" aria-label="Back to accounts">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<h1 class="page-title">{account?.name || 'Account'}</h1>
		</div>
		<div class="header-actions">
			<button class="header-button" aria-label="Search transactions" onclick={() => { showSearch = !showSearch; if (!showSearch) searchQuery = ''; }}>
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</button>
		</div>
	</header>

	{#if loading}
		<LoadingState message="Loading account..." />
	{:else if !account}
		<EmptyState 
			icon="❌" 
			title="Account not found" 
			subtitle="This account doesn't exist or was deleted" 
		/>
	{:else}
		<!-- Account Info Header -->
		<div class="account-header">
			<div class="account-type-badge">{getAccountTypeLabel(account.type)}</div>
			<span class="account-balance" class:negative={account.balance < 0}>
				{formatAccountAmount(account.balance)}
			</span>
			{#if account.currency && account.currency !== 'RON'}
				<span class="account-currency-note">≈ {formatCurrency(account.balance)}</span>
			{/if}
		</div>

		<!-- Search Bar -->
		{#if showSearch}
			<div class="search-container">
				<input 
					type="text" 
					placeholder="Search transactions..." 
					bind:value={searchQuery} 
					class="search-input"
				/>
			</div>
		{/if}

		<!-- Transactions List -->
		<div class="transactions-list">
			{#if transactions.length === 0}
				<EmptyState 
					icon="💰" 
					title="No transactions yet" 
					subtitle="Tap + to add a transaction to this account" 
				/>
			{:else}
				{#each groupedTransactions as [date, txs]}
					<div class="date-header">{formatDateWithDay(date)}</div>
					{#each txs as tx}
						<button class="transaction-row" onclick={() => openEditModal(tx)}>
							<div class="transaction-info">
								<span class="transaction-description">{tx.description}</span>
								<div class="transaction-meta">
									{#if needsAssignment(tx)}
										<span class="category-badge warning">Ready to Assign</span>
									{:else}
										<span class="category-badge">{tx.category_name}</span>
									{/if}
								</div>
								{#if tx.notes}
									<span class="transaction-notes">{tx.notes}</span>
								{/if}
							</div>
							<div class="transaction-amount-section">
							<div class="amount-with-status">
								<span class="transaction-amount" class:positive={tx.amount >= 0} class:negative={tx.amount < 0}>
									{formatAccountAmount(tx.amount)}
								</span>
									<span class="status-dot">
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									</span>
								</div>
							</div>
						</button>
					{/each}
				{/each}
			{/if}
		</div>
	{/if}
</div>

<!-- Floating Action Button -->
{#if account}
	<FloatingActionButton onclick={openAddModal} label="Transaction" />
{/if}

<TransactionModal 
	bind:show={showAddModal} 
	{editingTransaction} 
	{accounts} 
	{categories} 
	defaultAccountId={accountId}
	onSave={handleSaveTransaction} 
	onDelete={handleDeleteTransaction} 
	onClose={handleCloseModal} 
/>

<style>
	.account-page {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 70px);
		height: calc(100dvh - 70px);
	}

	/* Page Header */
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		background-color: var(--color-bg-primary);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.back-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		color: var(--color-text-primary);
		text-decoration: none;
		flex-shrink: 0;
	}

	.back-button:active {
		background-color: var(--color-bg-secondary);
	}

	.back-button svg {
		width: 24px;
		height: 24px;
	}

	.page-title {
		font-size: 20px;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.header-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.header-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 8px;
		background: none;
		border: none;
		color: var(--color-text-primary);
		padding: 0;
	}

	.header-button:active {
		background-color: var(--color-bg-secondary);
	}

	.header-button svg {
		width: 22px;
		height: 22px;
	}

	/* Account Header */
	.account-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20px 16px 24px;
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
		margin: 0 16px 16px;
		border-radius: 16px;
	}

	.account-type-badge {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 8px;
	}

	.account-balance {
		font-size: 32px;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.account-balance.negative {
		color: var(--color-danger);
	}

	.account-currency-note {
		font-size: 14px;
		color: var(--color-text-muted);
		margin-top: 4px;
	}

	/* Search */
	.search-container {
		padding: 0 16px 12px;
	}

	.search-input {
		width: 100%;
		padding: 12px 16px;
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		color: var(--color-text-primary);
		font-size: 15px;
	}

	.search-input::placeholder {
		color: var(--color-text-muted);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	/* Transactions List */
	.transactions-list {
		flex: 1;
		overflow-y: auto;
		padding-bottom: 100px;
	}

	/* Date Header */
	.date-header {
		padding: 10px 16px;
		background-color: var(--color-bg-secondary);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-muted);
	}

	/* Transaction Row */
	.transaction-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		width: 100%;
		padding: 14px 16px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		text-align: left;
		gap: 12px;
	}

	.transaction-row:active {
		background-color: var(--color-bg-secondary);
	}

	.transaction-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.transaction-description {
		font-size: 15px;
		font-weight: 500;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.transaction-meta {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.category-badge {
		display: inline-block;
		padding: 3px 8px;
		font-size: 12px;
		font-weight: 500;
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		border-radius: 6px;
	}

	.category-badge.warning {
		background-color: rgba(245, 158, 11, 0.15);
		color: var(--color-warning);
	}

	.transaction-notes {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.transaction-amount-section {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
		flex-shrink: 0;
	}

	.amount-with-status {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.transaction-amount {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.transaction-amount.positive {
		color: var(--color-success);
	}

	.transaction-amount.negative {
		color: var(--color-danger);
	}

	.status-dot {
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--color-success);
		border-radius: 50%;
	}

	.status-dot svg {
		width: 10px;
		height: 10px;
		color: white;
	}
</style>

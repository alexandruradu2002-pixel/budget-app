<script lang="ts">
	import type { Transaction, Account, Category } from '$lib/types';
	import { TransactionModal, LoadingState, EmptyState, PageHeader, HeaderButton, FloatingActionButton } from '$lib/components';
	import { formatDate, formatAmountWithCurrency as formatAmountUtil } from '$lib/utils/format';

	// Transaction payload type for save operations
	interface TransactionPayload {
		id?: number;
		account_id: number;
		category_id?: number;
		amount: number;
		description: string;
		date: string;
		notes?: string;
		payee?: string;
		memo?: string;
		flag?: string;
		cleared?: string;
	}

	let loading = $state(true);
	let transactions = $state<Transaction[]>([]);
	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);
	let showAddModal = $state(false);
	let editingTransaction = $state<Transaction | null>(null);
	let searchQuery = $state('');
	let showSearch = $state(false);

	// Format amount with account's currency
	function formatAmountWithCurrency(amount: number, accountId: number): string {
		const account = accounts.find(a => a.id === accountId);
		const currency = account?.currency || 'RON';
		return formatAmountUtil(amount, currency);
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
		try {
			const [txRes, accRes, catRes] = await Promise.all([
				fetch('/api/transactions'),
				fetch('/api/accounts'),
				fetch('/api/categories')
			]);
			if (txRes.ok) transactions = (await txRes.json()).transactions;
			if (accRes.ok) accounts = (await accRes.json()).accounts;
			if (catRes.ok) categories = (await catRes.json()).categories;
		} catch (error) {
			console.error('Failed to load data:', error);
		} finally {
			loading = false;
		}
	}

	async function handleSaveTransaction(payload: TransactionPayload) {
		try {
			const res = await fetch('/api/transactions', {
				method: payload.id ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (res.ok) await loadData();
		} catch (error) {
			console.error('Failed to save transaction:', error);
		}
	}

	async function handleDeleteTransaction(id: number) {
		try {
			const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
			if (res.ok) await loadData();
		} catch (error) {
			console.error('Failed to delete transaction:', error);
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

	$effect(() => { loadData(); });
</script>

<div class="spending-page">
	<PageHeader title="Spending">
		<HeaderButton label="Search" onclick={() => { showSearch = !showSearch; if (!showSearch) searchQuery = ''; }}>
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
		</HeaderButton>
	</PageHeader>

	<!-- Search Bar -->
	{#if showSearch}
		<div class="search-container">
			<div class="search-wrapper">
				<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input 
					id="search-input" 
					type="text" 
					placeholder="Search transactions..." 
					bind:value={searchQuery} 
					class="search-input"
				/>
				{#if searchQuery}
					<button class="search-clear" onclick={() => searchQuery = ''} aria-label="Clear search">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Transactions List -->
	<div class="transactions-list">
		{#if loading}
			<LoadingState message="Loading transactions..." />
		{:else if transactions.length === 0}
			<EmptyState 
				icon="💰" 
				title="No transactions yet" 
				subtitle="Tap + to add your first transaction" 
			/>
		{:else if groupedTransactions.length === 0}
			<EmptyState 
				icon="🔍" 
				title="No results" 
				subtitle="Try a different search term" 
			/>
		{:else}
			{#each groupedTransactions as [date, txs]}
				<div class="date-group">
					<div class="date-header">
						<span class="date-text">{formatDate(date)}</span>
						<span class="date-count">{txs.length} transaction{txs.length !== 1 ? 's' : ''}</span>
					</div>
					<div class="transactions-card">
						{#each txs as tx, i}
							<button class="transaction-row" onclick={() => openEditModal(tx)}>
								<div class="transaction-content">
									<div class="transaction-main">
										<span class="transaction-description">{tx.description}</span>
										<span class="transaction-amount" class:positive={tx.amount >= 0} class:negative={tx.amount < 0}>
											{tx.amount >= 0 ? '+' : ''}{formatAmountWithCurrency(tx.amount, tx.account_id)}
										</span>
									</div>
									<div class="transaction-details">
										<div class="transaction-meta">
											{#if needsAssignment(tx)}
												<span class="category-badge warning">
													<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
													</svg>
													Assign
												</span>
											{:else}
												<span class="category-badge">{tx.category_name}</span>
											{/if}
											<span class="account-badge">{tx.account_name || 'Unknown'}</span>
										</div>
									</div>
									{#if tx.notes}
										<span class="transaction-notes">{tx.notes}</span>
									{/if}
								</div>
							</button>
							{#if i < txs.length - 1}
								<div class="transaction-divider"></div>
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Floating Action Button -->
<FloatingActionButton onclick={openAddModal} label="Transaction" />

<TransactionModal bind:show={showAddModal} {editingTransaction} {accounts} {categories} onSave={handleSaveTransaction} onDelete={handleDeleteTransaction} onClose={handleCloseModal} />

<style>
	.spending-page {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 70px);
		height: calc(100dvh - 70px);
		background: var(--color-bg-primary);
	}

	/* Search */
	.search-container {
		padding: 0 16px 16px;
	}

	.search-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 14px;
		width: 18px;
		height: 18px;
		color: var(--color-text-muted);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 14px 44px;
		background-color: var(--color-bg-secondary);
		border: 1px solid transparent;
		border-radius: 14px;
		color: var(--color-text-primary);
		font-size: 15px;
		transition: all 0.2s ease;
	}

	.search-input::placeholder {
		color: var(--color-text-muted);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-primary);
		background-color: var(--color-bg-tertiary);
	}

	.search-clear {
		position: absolute;
		right: 10px;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-tertiary);
		border: none;
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.search-clear svg {
		width: 14px;
		height: 14px;
		color: var(--color-text-secondary);
	}

	.search-clear:hover {
		background: var(--color-border);
	}

	/* Transactions List */
	.transactions-list {
		flex: 1;
		overflow-y: auto;
		padding: 0 16px 100px;
	}

	/* Date Group */
	.date-group {
		margin-bottom: 20px;
	}

	.date-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 4px 12px;
		position: sticky;
		top: 0;
		background: var(--color-bg-primary);
		z-index: 10;
	}

	.date-text {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary);
		letter-spacing: -0.01em;
	}

	.date-count {
		font-size: 12px;
		color: var(--color-text-muted);
		font-weight: 500;
	}

	/* Transactions Card */
	.transactions-card {
		background: var(--color-bg-secondary);
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	/* Transaction Row */
	.transaction-row {
		display: flex;
		align-items: flex-start;
		width: 100%;
		padding: 16px;
		background: transparent;
		border: none;
		text-align: left;
		gap: 14px;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.transaction-row:hover {
		background-color: var(--color-bg-tertiary);
	}

	.transaction-row:active {
		background-color: var(--color-bg-tertiary);
	}

	.transaction-divider {
		height: 1px;
		background: var(--color-border);
		margin: 0 16px;
		opacity: 0.5;
	}

	/* Transaction Content */
	.transaction-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.transaction-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.transaction-description {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		letter-spacing: -0.01em;
	}

	.transaction-amount {
		font-size: 15px;
		font-weight: 700;
		color: var(--color-text-primary);
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
	}

	.transaction-amount.positive {
		color: var(--color-success);
	}

	.transaction-amount.negative {
		color: var(--color-danger);
	}

	/* Transaction Details */
	.transaction-details {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.transaction-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.category-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		font-size: 12px;
		font-weight: 500;
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		border-radius: 8px;
	}

	.category-badge.warning {
		background-color: rgba(245, 158, 11, 0.15);
		color: var(--color-warning);
	}

	.category-badge.warning svg {
		width: 12px;
		height: 12px;
	}

	.account-badge {
		display: inline-flex;
		align-items: center;
		padding: 4px 8px;
		font-size: 11px;
		font-weight: 500;
		color: var(--color-text-muted);
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.transaction-notes {
		font-size: 13px;
		color: var(--color-text-muted);
		font-style: italic;
		padding-top: 2px;
	}

	/* Responsive */
	@media (min-width: 768px) {
		.transactions-list {
			padding: 0 24px 100px;
			max-width: 800px;
			margin: 0 auto;
			width: 100%;
		}

		.search-container {
			max-width: 800px;
			margin: 0 auto;
			padding: 0 24px 20px;
			width: 100%;
		}
	}
</style>

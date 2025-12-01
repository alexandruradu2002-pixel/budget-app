<script lang="ts">
	import type { Transaction, Account, Category } from '$lib/types';
	import { TransactionModal, LoadingState, EmptyState, PageHeader, HeaderButton, FloatingActionButton } from '$lib/components';
	import { formatDate, formatAmount } from '$lib/utils/format';

	let loading = $state(true);
	let transactions = $state<Transaction[]>([]);
	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);
	let showAddModal = $state(false);
	let editingTransaction = $state<Transaction | null>(null);
	let searchQuery = $state('');
	let showSearch = $state(false);
	let showMenu = $state(false);

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

	async function handleSaveTransaction(payload: any) {
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
		<HeaderButton label="More options" onclick={() => showMenu = !showMenu}>
			<svg fill="currentColor" viewBox="0 0 24 24">
				<circle cx="12" cy="5" r="1.5"/>
				<circle cx="12" cy="12" r="1.5"/>
				<circle cx="12" cy="19" r="1.5"/>
			</svg>
		</HeaderButton>
	</PageHeader>

	<!-- Search Bar -->
	{#if showSearch}
		<div class="search-container">
			<input 
				id="search-input" 
				type="text" 
				placeholder="Search transactions..." 
				bind:value={searchQuery} 
				class="search-input"
			/>
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
		{:else}
			{#each groupedTransactions as [date, txs]}
				<div class="date-header">{formatDate(date)}</div>
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
								<span class="transaction-amount" class:positive={tx.amount >= 0}>
									{formatAmount(tx.amount)}
								</span>
								<span class="status-dot">
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								</span>
							</div>
							<span class="transaction-account">{tx.account_name || 'Unknown'}</span>
						</div>
					</button>
				{/each}
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

	.transaction-account {
		font-size: 12px;
		color: var(--color-text-muted);
		text-transform: uppercase;
	}
</style>

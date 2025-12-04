<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import { TransactionModal } from '$lib/components';
	import type { ClearedStatus, Account, Category } from '$lib/types';

	// Get params from URL
	let categoryId = $derived(Number($page.params.id));
	let categoryName = $derived($page.url.searchParams.get('name') || 'Category');
	let startDate = $derived($page.url.searchParams.get('startDate') || '');
	let endDate = $derived($page.url.searchParams.get('endDate') || '');

	// State
	let loading = $state(true);
	let transactions: Array<{
		id: number;
		date: string;
		payee: string;
		amount: number;
		memo: string;
		account_name: string;
		category_id: number;
		account_id: number;
		cleared: ClearedStatus;
	}> = $state([]);
	let totalAmount = $state(0);
	
	// Accounts and categories for the modal
	let accounts: Account[] = $state([]);
	let categories: Category[] = $state([]);

	// Transaction modal state
	let showTransactionModal = $state(false);
	let editingTransaction: {
		id: number;
		date: string;
		payee: string;
		amount: number;
		memo: string;
		category_id: number;
		account_id: number;
		cleared: ClearedStatus;
	} | null = $state(null);

	// Prepared transaction object for modal (to avoid reactive access issues)
	let modalTransaction = $state<import('$lib/types').Transaction | null>(null);

	// Load accounts and categories
	async function loadAccountsAndCategories() {
		try {
			const [accountsRes, categoriesRes] = await Promise.all([
				fetch('/api/accounts'),
				fetch('/api/categories')
			]);
			
			if (accountsRes.ok) {
				const data = await accountsRes.json();
				accounts = data.accounts || [];
			}
			
			if (categoriesRes.ok) {
				const data = await categoriesRes.json();
				categories = data.categories || [];
			}
		} catch (err) {
			console.error('Error loading accounts/categories:', err);
		}
	}

	// Load transactions for this category
	async function loadTransactions() {
		loading = true;
		try {
			const url = `/api/transactions?categoryId=${categoryId}&startDate=${startDate}&endDate=${endDate}&limit=1000`;
			const response = await fetch(url);
			if (!response.ok) throw new Error('Failed to load transactions');
			
			const data = await response.json();
			const allTransactions = data.transactions || [];
			
			// Include all transactions (both inflows and outflows), keep original amount
			transactions = allTransactions
				.map((tx: { id: number; date: string; payee: string; amount: number; memo: string; account_name: string; category_id: number; account_id: number; cleared: string }) => ({
					...tx
				}))
				.sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime());
			
			// Total: negative amounts add to spending, positive amounts (refunds) subtract
			// Since outflows are negative, we negate to get positive total
			totalAmount = -transactions.reduce((sum, tx) => sum + tx.amount, 0);
		} catch (err) {
			console.error('Error loading transactions:', err);
		} finally {
			loading = false;
		}
	}

	// Open transaction for editing
	function openTransaction(transaction: typeof transactions[0]) {
		editingTransaction = {
			id: transaction.id,
			date: transaction.date,
			payee: transaction.payee,
			amount: transaction.amount,
			memo: transaction.memo,
			category_id: transaction.category_id,
			account_id: transaction.account_id,
			cleared: transaction.cleared
		};
		// Create the modal transaction object
		modalTransaction = {
			id: transaction.id,
			user_id: 1,
			account_id: transaction.account_id,
			category_id: transaction.category_id,
			amount: transaction.amount,
			description: transaction.payee || '',
			date: transaction.date,
			payee: transaction.payee,
			memo: transaction.memo,
			cleared: transaction.cleared,
			created_at: '',
			updated_at: ''
		};
		showTransactionModal = true;
	}

	// Handle transaction saved
	async function handleTransactionSaved(payload: Record<string, unknown>) {
		try {
			// Make API call to update transaction
			const response = await fetch('/api/transactions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			
			if (!response.ok) {
				const error = await response.json();
				console.error('Failed to save transaction:', error);
				return;
			}
			
			showTransactionModal = false;
			modalTransaction = null;
			editingTransaction = null;
			await loadTransactions();
		} catch (err) {
			console.error('Error saving transaction:', err);
		}
	}

	// Handle modal close
	function handleModalClose() {
		showTransactionModal = false;
		modalTransaction = null;
		editingTransaction = null;
	}

	// Load on mount
	$effect(() => {
		loadAccountsAndCategories();
	});
	
	$effect(() => {
		if (categoryId && startDate && endDate) {
			loadTransactions();
		}
	});

	function goBack() {
		goto('/reports/spending');
	}

	// Format display month from dates
	let displayMonth = $derived(() => {
		if (!startDate) return '';
		const date = new Date(startDate);
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	});
</script>

<div class="category-transactions-page">
	<!-- Header -->
	<header class="page-header">
		<button class="back-btn" onclick={goBack} aria-label="Go back">
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<div class="header-info">
			<h1 class="page-title">{categoryName}</h1>
			<span class="page-subtitle">{displayMonth()}</span>
		</div>
	</header>

	<!-- Summary Card -->
	<div class="summary-card">
		<span class="summary-label">Total Spent</span>
		<span class="summary-amount">{formatCurrency(totalAmount)}</span>
		<span class="summary-count">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</span>
	</div>

	<!-- Transactions List -->
	<div class="transactions-section">
		<h2 class="section-title">Transactions</h2>
		
		{#if loading}
			<div class="loading-state">Loading transactions...</div>
		{:else if transactions.length > 0}
			<div class="transactions-list">
				{#each transactions as transaction}
					<button class="transaction-row" onclick={() => openTransaction(transaction)}>
						<div class="transaction-info">
							<span class="transaction-payee">{transaction.payee || 'No payee'}</span>
							<span class="transaction-details">
								{formatDate(transaction.date)}
								{#if transaction.account_name}
									<span class="separator">•</span>
									{transaction.account_name}
								{/if}
							</span>
							{#if transaction.memo}
								<span class="transaction-memo">{transaction.memo}</span>
							{/if}
						</div>
						<div class="transaction-right">
							<span class="transaction-amount" class:positive={transaction.amount > 0}>
								{transaction.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
							</span>
							<svg class="transaction-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
							</svg>
						</div>
					</button>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<p>No transactions found</p>
			</div>
		{/if}
	</div>
</div>

<!-- Transaction Modal -->
{#if showTransactionModal && modalTransaction}
	<TransactionModal 
		bind:show={showTransactionModal}
		editingTransaction={modalTransaction}
		{accounts}
		{categories}
		onSave={handleTransactionSaved}
		onClose={handleModalClose}
	/>
{/if}

<style>
	.category-transactions-page {
		min-height: 100vh;
		background-color: var(--color-bg-primary);
		padding-bottom: 70px;
	}

	/* Header */
	.page-header {
		display: flex;
		align-items: center;
		padding: 16px;
		background-color: var(--color-bg-primary);
		position: sticky;
		top: 0;
		z-index: 10;
		gap: 12px;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		cursor: pointer;
		border-radius: 8px;
		transition: background-color 0.2s;
	}

	.back-btn:hover {
		background-color: var(--color-bg-secondary);
	}

	.back-btn svg {
		width: 24px;
		height: 24px;
	}

	.header-info {
		flex: 1;
	}

	.page-title {
		font-size: 20px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.page-subtitle {
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	/* Summary Card */
	.summary-card {
		margin: 0 16px 16px;
		padding: 24px;
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		text-align: center;
	}

	.summary-label {
		display: block;
		font-size: 14px;
		color: var(--color-text-secondary);
		margin-bottom: 4px;
	}

	.summary-amount {
		display: block;
		font-size: 32px;
		font-weight: 700;
		color: var(--color-text-primary);
		margin-bottom: 4px;
	}

	.summary-count {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	/* Transactions Section */
	.transactions-section {
		padding: 0 16px;
	}

	.section-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 12px;
	}

	.transactions-list {
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		overflow: hidden;
	}

	.transaction-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border: none;
		border-bottom: 1px solid var(--color-border);
		background: transparent;
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.transaction-row:hover {
		background-color: var(--color-bg-tertiary);
	}

	.transaction-row:last-child {
		border-bottom: none;
	}

	.transaction-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.transaction-payee {
		font-size: 15px;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.transaction-details {
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	.separator {
		margin: 0 6px;
	}

	.transaction-memo {
		font-size: 12px;
		color: var(--color-text-muted);
		font-style: italic;
		margin-top: 2px;
	}

	.transaction-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.transaction-amount {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-danger);
		white-space: nowrap;
	}

	.transaction-amount.positive {
		color: var(--color-success);
	}

	.transaction-chevron {
		width: 16px;
		height: 16px;
		color: var(--color-text-muted);
	}

	/* States */
	.loading-state,
	.empty-state {
		padding: 32px 16px;
		text-align: center;
		color: var(--color-text-secondary);
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
	}
</style>

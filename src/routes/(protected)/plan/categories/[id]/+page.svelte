<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Transaction, Category } from '$lib/types';
	import { LoadingState, EmptyState, TransactionModal, FloatingActionButton } from '$lib/components';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import { toast } from '$lib/stores';
	import { currencyStore } from '$lib/stores/currency.svelte';
	import { SUPPORTED_CURRENCIES, type CurrencyValue } from '$lib/constants';

	interface MonthlyStats {
		month: string;
		spending: number;
		income: number;
		transactionCount: number;
	}

	interface Target {
		id: number;
		amount: number;
		currency: string;
		period: string;
		start_date: string;
		end_date?: string;
	}

	interface TargetHistoryItem {
		id: number;
		amount: number;
		currency: string;
		period: string;
		start_date: string;
		end_date?: string;
		is_active: boolean;
		month: string;
		spending: number;
		achieved: boolean;
	}

	let categoryId = $derived(Number($page.params.id));

	// State
	let loading = $state(true);
	let category = $state<Category | null>(null);
	let monthlyStats = $state<MonthlyStats[]>([]);
	let transactions = $state<Transaction[]>([]);
	let categories = $state<Category[]>([]);
	let accounts = $state<any[]>([]);
	let target = $state<Target | null>(null);
	let targetHistory = $state<TargetHistoryItem[]>([]);
	
	// Month selector state - use local date to avoid UTC timezone issues
	const now = new Date();
	const initialMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	let selectedMonth = $state(initialMonth);
	
	// Target form state
	let showTargetModal = $state(false);
	let showHistoryModal = $state(false);
	let targetAmount = $state('');
	let targetCurrency = $state<CurrencyValue>('RON');
	let savingTarget = $state(false);

	// Chart time range state
	let chartMonths = $state<12 | 6 | 3>(12);

	// Transaction modal state
	let showAddModal = $state(false);
	let editingTransaction = $state<Transaction | null>(null);

	// Search state
	let showSearch = $state(false);
	let searchQuery = $state('');

	// Available months for selector (last 12 months)
	let availableMonths = $derived.by(() => {
		const months: { value: string; label: string }[] = [];
		const now = new Date();
		for (let i = 0; i < 12; i++) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			// Use local date components instead of toISOString() which converts to UTC
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const value = `${year}-${month}`;
			const label = date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
			months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
		}
		return months;
	});

	// Filter transactions for selected month and search
	let filteredTransactions = $derived.by(() => {
		return transactions
			.filter(t => t.date.startsWith(selectedMonth))
			.filter(t => 
				!searchQuery || 
				t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.payee?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.account_name?.toLowerCase().includes(searchQuery.toLowerCase())
			);
	});

	// Group transactions by date
	let groupedTransactions = $derived.by(() => {
		const groups: Record<string, Transaction[]> = {};
		for (const tx of filteredTransactions) {
			if (!groups[tx.date]) groups[tx.date] = [];
			groups[tx.date].push(tx);
		}
		return Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
	});

	// Current month's spending (inverted: negative becomes positive for display)
	let currentMonthSpending = $derived.by(() => {
		const stats = monthlyStats.find(s => s.month === selectedMonth);
		return stats?.spending || 0;
	});

	// Calculate chart data (filled with zeros for missing months)
	let chartData = $derived.by(() => {
		const months: { month: string; spending: number; label: string }[] = [];
		const now = new Date();
		
		for (let i = chartMonths - 1; i >= 0; i--) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			// Use local date to avoid UTC timezone issues
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const monthKey = `${year}-${month}`;
			const stats = monthlyStats.find(s => s.month === monthKey);
			const label = date.toLocaleDateString('ro-RO', { month: 'short' });
			
			months.push({
				month: monthKey,
				spending: stats?.spending || 0,
				label: label.charAt(0).toUpperCase() + label.slice(1)
			});
		}
		return months;
	});

	// Max value for chart scaling
	let chartMax = $derived(Math.max(...chartData.map(d => d.spending), 1));

	// Convert target to main currency
	let convertedTarget = $derived.by(() => {
		if (!target) return null;
		return currencyStore.convert(target.amount, target.currency as CurrencyValue);
	});

	async function loadData() {
		loading = true;
		try {
			const [detailsRes, txRes, catRes, accRes] = await Promise.all([
				fetch(`/api/categories/${categoryId}`),
				fetch(`/api/transactions?categoryId=${categoryId}&limit=500`),
				fetch('/api/categories'),
				fetch('/api/accounts')
			]);

			if (!detailsRes.ok) {
				toast.error('Failed to load category');
				goto('/plan');
				return;
			}

			const details = await detailsRes.json();
			category = details.category;
			monthlyStats = details.monthlyStats || [];
			target = details.target;
			targetHistory = details.targetHistory || [];

			if (target) {
				targetAmount = target.amount.toString();
				targetCurrency = (target.currency as CurrencyValue) || 'RON';
			}

			if (txRes.ok) {
				transactions = (await txRes.json()).transactions || [];
			}
			if (catRes.ok) {
				categories = (await catRes.json()).categories || [];
			}
			if (accRes.ok) {
				accounts = (await accRes.json()).accounts || [];
			}
		} catch (error) {
			console.error('Failed to load data:', error);
			toast.error('Failed to load category data');
		} finally {
			loading = false;
		}
	}

	async function saveTarget() {
		savingTarget = true;
		try {
			const amount = parseFloat(targetAmount) || 0;
			const res = await fetch(`/api/categories/${categoryId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount, currency: targetCurrency, period: 'monthly' })
			});

			if (res.ok) {
				toast.success('Target saved!');
				showTargetModal = false;
				if (amount > 0) {
					target = { id: 0, amount, currency: targetCurrency, period: 'monthly', start_date: new Date().toISOString().split('T')[0] };
				} else {
					target = null;
				}
			} else {
				toast.error('Failed to save target');
			}
		} catch (error) {
			console.error('Failed to save target:', error);
			toast.error('Failed to save target');
		} finally {
			savingTarget = false;
		}
	}

	async function removeTarget() {
		try {
			const res = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
			if (res.ok) {
				toast.success('Target removed!');
				target = null;
				targetAmount = '';
				showTargetModal = false;
			}
		} catch (error) {
			console.error('Failed to remove target:', error);
		}
	}

	async function handleSaveTransaction(payload: any) {
		try {
			if (!payload.category_id) {
				payload.category_id = categoryId;
			}
			const res = await fetch('/api/transactions', {
				method: payload.id ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (res.ok) {
				await loadData();
				toast.success(payload.id ? 'Transaction updated!' : 'Transaction added!');
			}
		} catch (error) {
			console.error('Failed to save transaction:', error);
			toast.error('Failed to save transaction');
		}
	}

	async function handleDeleteTransaction(id: number) {
		try {
			const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
			if (res.ok) {
				await loadData();
				toast.success('Transaction deleted!');
			}
		} catch (error) {
			console.error('Failed to delete transaction:', error);
		}
	}

	function openEditModal(tx: Transaction) {
		editingTransaction = tx;
		showAddModal = true;
	}

	function handleCloseModal() {
		editingTransaction = null;
	}

	// Calculate progress percentage (using converted target)
	let targetProgress = $derived.by(() => {
		if (!convertedTarget || convertedTarget === 0) return 0;
		return Math.min((currentMonthSpending / convertedTarget) * 100, 100);
	});

	let isOverBudget = $derived(convertedTarget && currentMonthSpending > convertedTarget);

	$effect(() => {
		if (categoryId) loadData();
	});
</script>

<svelte:head>
	<title>{category?.name || 'Category'} - Budget App</title>
</svelte:head>

<div class="category-page">
	<!-- Header -->
	<header class="page-header">
		<div class="header-left">
			<a href="/plan" class="back-button" aria-label="Back to plan">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<div class="header-title-group">
				<h1 class="page-title">{category?.name || 'Category'}</h1>
				{#if category?.group_name}
					<span class="page-subtitle">{category.group_name}</span>
				{/if}
			</div>
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
		<LoadingState message="Loading category..." />
	{:else if !category}
		<EmptyState 
			icon="📁" 
			title="Category not found" 
			subtitle="This category doesn't exist or you don't have access to it." 
		/>
	{:else}
		<!-- Category Summary Card -->
		<div class="category-header">
			<div class="category-type-badge">
				{#if convertedTarget}
					Target: {formatCurrency(convertedTarget)}/mo
				{:else}
					No target set
				{/if}
			</div>
			<span class="category-amount" class:over-budget={isOverBudget}>
				{formatCurrency(currentMonthSpending)}
			</span>
			<span class="category-label">spent this month</span>
			
			{#if convertedTarget}
				<div class="target-progress">
					<div class="progress-bar">
						<div 
							class="progress-fill" 
							class:over-budget={isOverBudget}
							style="width: {targetProgress}%"
						></div>
					</div>
					<span class="progress-text" class:over-budget={isOverBudget}>
						{#if isOverBudget}
							{formatCurrency(currentMonthSpending - convertedTarget)} over budget
						{:else}
							{formatCurrency(convertedTarget - currentMonthSpending)} remaining
						{/if}
					</span>
				</div>
			{/if}
			
			<button class="target-edit-btn" onclick={() => showTargetModal = true}>
				{target ? 'Edit Target' : '+ Set Target'}
			</button>
			{#if target && targetHistory.length > 0}
				<button class="target-history-btn" onclick={() => showHistoryModal = true}>
					📊 History
				</button>
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

		<!-- Chart Section -->
		<div class="chart-section">
			<div class="chart-header">
				<h2 class="section-title">Last {chartMonths} Months</h2>
				<div class="chart-range-selector">
					{#each [12, 6, 3] as months}
						<button 
							class="range-btn" 
							class:active={chartMonths === months}
							onclick={() => chartMonths = months as 12 | 6 | 3}
						>
							{months}
						</button>
					{/each}
				</div>
			</div>
			<div class="chart-container">
				<!-- Grid lines -->
				<div class="chart-grid">
					{#each [0, 1, 2, 3] as _}
						<div class="grid-line"></div>
					{/each}
				</div>
				
				<!-- SVG Chart -->
				<svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
					<!-- Area fill -->
					<path
						fill="var(--color-primary)"
						fill-opacity="0.1"
						d={`M 0 100 ${chartData.map((d, i) => {
							const x = (i / (chartData.length - 1)) * 100;
							const y = 100 - (d.spending / chartMax) * 85;
							return `L ${x} ${y}`;
						}).join(' ')} L 100 100 Z`}
					/>
					<!-- Line -->
					<polyline
						fill="none"
						stroke="var(--color-primary)"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						vector-effect="non-scaling-stroke"
						points={chartData.map((d, i) => {
							const x = (i / (chartData.length - 1)) * 100;
							const y = 100 - (d.spending / chartMax) * 85;
							return `${x},${y}`;
						}).join(' ')}
					/>
				</svg>
			</div>
			<!-- X-axis labels -->
			<div class="chart-labels">
				{#each chartData as d, i}
					{@const showLabel = chartMonths <= 6 || i % 2 === 0 || i === chartData.length - 1}
					{#if showLabel}
						<span class="chart-label">{d.label}</span>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Month Selector -->
		<div class="month-selector">
			<h2 class="section-title">Transactions</h2>
			<select bind:value={selectedMonth} class="month-select">
				{#each availableMonths as month}
					<option value={month.value}>{month.label}</option>
				{/each}
			</select>
		</div>

		<!-- Transactions List -->
		<div class="transactions-list">
			{#if groupedTransactions.length === 0}
				<EmptyState 
					icon="💰" 
					title="No transactions" 
					subtitle="No transactions in {availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth}" 
				/>
			{:else}
				{#each groupedTransactions as [date, txs]}
					<div class="date-header">{formatDate(date)}</div>
					{#each txs as tx}
						<button class="transaction-row" onclick={() => openEditModal(tx)}>
							<div class="transaction-info">
								<span class="transaction-description">{tx.description || tx.payee || 'No description'}</span>
								{#if tx.account_name}
									<span class="transaction-account">{tx.account_name}</span>
								{/if}
							</div>
							<span class="transaction-amount" class:positive={tx.amount >= 0}>
								{tx.amount < 0 ? '' : '+'}{formatCurrency(Math.abs(tx.amount))}
							</span>
						</button>
					{/each}
				{/each}
			{/if}
		</div>
	{/if}
</div>

<!-- Target Modal -->
{#if showTargetModal}
	<div class="modal-overlay" role="presentation">
		<button class="modal-backdrop" onclick={() => showTargetModal = false} aria-label="Close modal"></button>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="target-modal-title">
			<h3 id="target-modal-title" class="modal-title">Set Spending Target</h3>
			
			<div class="form-group">
				<label for="target-amount" class="form-label">Monthly Target Amount</label>
				<div class="input-with-currency">
					<input
						type="number"
						id="target-amount"
						bind:value={targetAmount}
						placeholder="0.00"
						step="0.01"
						min="0"
						class="form-input amount-input"
					/>
					<select id="target-currency" class="form-input currency-select" bind:value={targetCurrency}>
						{#each SUPPORTED_CURRENCIES as curr}
							<option value={curr}>{curr}</option>
						{/each}
					</select>
				</div>
				<p class="form-hint">Target will be converted to {currencyStore.value} for display.</p>
			</div>

			<div class="modal-actions">
				{#if target}
					<button onclick={removeTarget} class="btn-danger">Remove</button>
				{/if}
				<button onclick={() => showTargetModal = false} class="btn-secondary">Cancel</button>
				<button onclick={saveTarget} disabled={savingTarget} class="btn-primary">
					{savingTarget ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Target History Modal -->
{#if showHistoryModal}
	<div class="modal-overlay" role="presentation">
		<button class="modal-backdrop" onclick={() => showHistoryModal = false} aria-label="Close modal"></button>
		<div class="modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
			<h3 id="history-modal-title" class="modal-title">Target History</h3>
			
			<div class="history-list">
				{#each targetHistory as item}
					{@const monthDate = new Date(item.month + '-01')}
					{@const monthLabel = monthDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
					<div class="history-item" class:achieved={item.achieved} class:over={!item.achieved}>
						<div class="history-item-header">
							<span class="history-month">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</span>
							<span class="history-status" class:achieved={item.achieved}>
								{item.achieved ? '✓ Achieved' : '✗ Over budget'}
							</span>
						</div>
						<div class="history-item-details">
							<div class="history-target">
								<span class="history-label">Target:</span>
								<span class="history-value">{formatCurrency(item.amount, item.currency as CurrencyValue)}</span>
							</div>
							<div class="history-spent">
								<span class="history-label">Spent:</span>
								<span class="history-value" class:over={!item.achieved}>{formatCurrency(item.spending)}</span>
							</div>
						</div>
						{#if item.is_active}
							<span class="history-active-badge">Current</span>
						{/if}
					</div>
				{:else}
					<p class="history-empty">No target history available.</p>
				{/each}
			</div>
			
			<div class="modal-actions">
				<button onclick={() => showHistoryModal = false} class="btn-primary" style="flex: 1;">Close</button>
			</div>
		</div>
	</div>
{/if}

<!-- FAB for adding transactions -->
{#if category}
	<FloatingActionButton
		label="Transaction"
		onclick={() => { editingTransaction = null; showAddModal = true; }}
	/>
{/if}

<!-- Transaction Modal -->
<TransactionModal
	bind:show={showAddModal}
	editingTransaction={editingTransaction}
	{accounts}
	{categories}
	defaultCategoryId={categoryId}
	onSave={handleSaveTransaction}
	onDelete={handleDeleteTransaction}
	onClose={handleCloseModal}
/>

<style>
	.category-page {
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

	.header-title-group {
		display: flex;
		flex-direction: column;
		min-width: 0;
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

	.page-subtitle {
		font-size: 13px;
		color: var(--color-text-muted);
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

	/* Category Header Card */
	.category-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20px 16px 24px;
		background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
		margin: 0 16px 16px;
		border-radius: 16px;
	}

	.category-type-badge {
		font-size: 12px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 8px;
	}

	.category-amount {
		font-size: 32px;
		font-weight: 700;
		color: white;
	}

	.category-amount.over-budget {
		color: #fca5a5;
	}

	.category-label {
		font-size: 14px;
		color: rgba(255, 255, 255, 0.7);
		margin-top: 2px;
	}

	.target-progress {
		width: 100%;
		margin-top: 16px;
	}

	.progress-bar {
		height: 6px;
		background-color: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background-color: white;
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.progress-fill.over-budget {
		background-color: #fca5a5;
	}

	.progress-text {
		display: block;
		text-align: center;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.8);
		margin-top: 8px;
	}

	.progress-text.over-budget {
		color: #fca5a5;
	}

	.target-edit-btn {
		margin-top: 12px;
		padding: 8px 16px;
		background-color: rgba(255, 255, 255, 0.2);
		border: none;
		border-radius: 8px;
		color: white;
		font-size: 13px;
		font-weight: 500;
	}

	.target-edit-btn:active {
		background-color: rgba(255, 255, 255, 0.3);
	}

	.target-history-btn {
		margin-top: 8px;
		padding: 8px 16px;
		background-color: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		color: white;
		font-size: 13px;
		font-weight: 500;
	}

	.target-history-btn:active {
		background-color: rgba(255, 255, 255, 0.2);
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

	/* Chart Section */
	.chart-section {
		margin: 0 16px 16px;
		padding: 16px;
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
	}

	.section-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.chart-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.chart-range-selector {
		display: flex;
		gap: 4px;
		background-color: var(--color-bg-tertiary);
		border-radius: 8px;
		padding: 2px;
	}

	.range-btn {
		padding: 6px 10px;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-secondary);
		background: none;
		border: none;
		border-radius: 6px;
		min-width: 32px;
	}

	.range-btn.active {
		background-color: var(--color-primary);
		color: white;
	}

	.range-btn:active:not(.active) {
		background-color: var(--color-border);
	}

	.chart-container {
		position: relative;
		height: 120px;
	}

	.chart-grid {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.grid-line {
		border-top: 1px solid var(--color-border);
	}

	.chart-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.chart-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 8px;
	}

	.chart-label {
		font-size: 11px;
		color: var(--color-text-muted);
	}

	/* Month Selector */
	.month-selector {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background-color: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
	}

	.month-select {
		padding: 8px 12px;
		background-color: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 14px;
	}

	.month-select:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	/* Transactions List */
	.transactions-list {
		flex: 1;
		overflow-y: auto;
		padding-bottom: 100px;
	}

	.date-header {
		padding: 10px 16px;
		background-color: var(--color-bg-secondary);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-muted);
	}

	.transaction-row {
		display: flex;
		align-items: center;
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
		gap: 4px;
	}

	.transaction-description {
		font-size: 15px;
		font-weight: 500;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.transaction-account {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.transaction-amount {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text-primary);
		flex-shrink: 0;
	}

	.transaction-amount.positive {
		color: var(--color-success);
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.modal-backdrop {
		position: absolute;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		border: none;
	}

	.modal {
		position: relative;
		width: 100%;
		max-width: 360px;
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		padding: 24px;
	}

	.modal-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 20px 0;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-label {
		display: block;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin-bottom: 8px;
	}

	.form-input {
		width: 100%;
		padding: 12px 16px;
		background-color: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		color: var(--color-text-primary);
		font-size: 16px;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.form-hint {
		font-size: 12px;
		color: var(--color-text-muted);
		margin: 8px 0 0 0;
	}

	.modal-actions {
		display: flex;
		gap: 12px;
	}

	.btn-primary,
	.btn-secondary,
	.btn-danger {
		flex: 1;
		padding: 12px 16px;
		border: none;
		border-radius: 10px;
		font-size: 15px;
		font-weight: 500;
		min-height: 44px;
	}

	.btn-primary {
		background-color: var(--color-primary);
		color: white;
	}

	.btn-primary:hover {
		background-color: var(--color-primary-hover);
	}

	.btn-primary:disabled {
		opacity: 0.5;
	}

	.btn-secondary {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}

	.btn-secondary:hover {
		background-color: var(--color-border);
	}

	.btn-danger {
		background-color: transparent;
		color: var(--color-danger);
	}

	.btn-danger:hover {
		background-color: rgba(239, 68, 68, 0.1);
	}

	/* Input with currency */
	.input-with-currency {
		display: flex;
		gap: 8px;
	}

	.amount-input {
		flex: 1;
	}

	.currency-select {
		width: 80px;
		flex-shrink: 0;
	}

	/* History Modal */
	.history-modal {
		max-height: 80vh;
		display: flex;
		flex-direction: column;
	}

	.history-list {
		flex: 1;
		overflow-y: auto;
		max-height: 400px;
		margin-bottom: 16px;
	}

	.history-item {
		padding: 12px;
		background-color: var(--color-bg-tertiary);
		border-radius: 10px;
		margin-bottom: 8px;
		border-left: 3px solid var(--color-border);
	}

	.history-item.achieved {
		border-left-color: var(--color-success);
	}

	.history-item.over {
		border-left-color: var(--color-danger);
	}

	.history-item-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
		gap: 8px;
	}

	.history-month {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary);
		flex: 1;
		min-width: 0;
	}

	.history-status {
		font-size: 11px;
		font-weight: 600;
		color: white;
		background-color: var(--color-danger);
		padding: 4px 8px;
		border-radius: 4px;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.history-status.achieved {
		color: white;
		background-color: var(--color-success);
	}

	.history-item-details {
		display: flex;
		gap: 16px;
	}

	.history-target,
	.history-spent {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.history-label {
		font-size: 11px;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.history-value {
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.history-value.over {
		color: var(--color-danger);
	}

	.history-active-badge {
		display: inline-block;
		margin-top: 8px;
		font-size: 10px;
		font-weight: 600;
		color: var(--color-primary);
		background-color: rgba(59, 130, 246, 0.1);
		padding: 2px 6px;
		border-radius: 4px;
		text-transform: uppercase;
	}

	.history-empty {
		text-align: center;
		color: var(--color-text-muted);
		padding: 24px;
		font-size: 14px;
	}
</style>

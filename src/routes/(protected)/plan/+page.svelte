<script lang="ts">
	import type { CategoryGroup, Account, Category, CategoryBudget, Transaction } from '$lib/types';
	import TransactionModal from '$lib/components/TransactionModal.svelte';
	import { LoadingState } from '$lib/components';

	// Current month state
	let currentDate = $state(new Date());
	let showMonthPicker = $state(false);

	// Transaction modal state
	let showTransactionModal = $state(false);
	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);

	// Loading state
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Category groups from API
	let categoryGroups = $state<CategoryGroup[]>([]);

	// Transactions for the current month
	let transactions = $state<Transaction[]>([]);

	// Calculate spent per category (sum of negative transactions, shown as positive)
	let spentByCategory = $derived(() => {
		const spent = new Map<number, number>();
		for (const t of transactions) {
			if (t.amount < 0 && t.category_id) {
				const current = spent.get(t.category_id) || 0;
				spent.set(t.category_id, current + Math.abs(t.amount));
			}
		}
		return spent;
	});

	// Load categories and build groups
	async function loadCategories() {
		loading = true;
		error = null;
		try {
			// Get current month's start and end dates
			const year = currentDate.getFullYear();
			const month = currentDate.getMonth();
			const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
			const lastDay = new Date(year, month + 1, 0).getDate();
			const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

			// Fetch categories and transactions in parallel
			const [catRes, transRes] = await Promise.all([
				fetch('/api/categories'),
				fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=1000`)
			]);

			if (!catRes.ok) throw new Error('Failed to load categories');
			
			const catData = await catRes.json();
			categories = catData.categories || [];
			
			if (transRes.ok) {
				const transData = await transRes.json();
				transactions = transData.transactions || [];
			}
			
			// Group categories by group_name
			const groupMap = new Map<string, Category[]>();
			
			for (const cat of categories) {
				const groupName = cat.group_name || 'Uncategorized';
				if (!groupMap.has(groupName)) {
					groupMap.set(groupName, []);
				}
				groupMap.get(groupName)!.push(cat);
			}
			
			// Convert to CategoryGroup array
			let groupId = 1;
			categoryGroups = Array.from(groupMap.entries()).map(([name, cats]) => {
				const categoryBudgets: CategoryBudget[] = cats.map(cat => ({
					id: cat.id,
					category_id: cat.id,
					name: cat.name,
					assigned: 0,
					activity: 0,
					available: 0,
					color: cat.color,
					icon: cat.icon
				}));
				
				// Calculate total spent for this group
				const groupSpent = cats.reduce((total, cat) => {
					return total + (spentByCategory().get(cat.id) || 0);
				}, 0);
				
				return {
					id: groupId++,
					name,
					assigned: groupSpent,  // Using assigned to store spent for the group
					available: 0,
					categories: categoryBudgets,
					isExpanded: true
				};
			});
		} catch (e) {
			console.error('Failed to load categories:', e);
			error = e instanceof Error ? e.message : 'Failed to load categories';
		} finally {
			loading = false;
		}
	}

	// Load data on mount
	$effect(() => {
		loadCategories();
	});

	// Load accounts and categories for the modal
	async function loadModalData() {
		try {
			const accountsRes = await fetch('/api/accounts');
			if (accountsRes.ok) {
				const data = await accountsRes.json();
				accounts = data.accounts || [];
			}
		} catch (e) {
			console.error('Failed to load modal data:', e);
		}
	}

	async function openTransactionModal() {
		await loadModalData();
		showTransactionModal = true;
	}

	async function handleSaveTransaction(payload: any) {
		try {
			console.log('Sending payload to API:', payload);
			const res = await fetch('/api/transactions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				console.error('API Error:', res.status, errorData);
				throw new Error(errorData.message || 'Failed to save');
			}
			// Reload categories to update spent amounts
			await loadCategories();
		} catch (e) {
			console.error('Failed to save transaction:', e);
		}
	}

	// Format month for display  
	const monthNames = [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	];

	let displayMonth = $derived(
		`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
	);

	// Ready to assign amount
	let readyToAssign = $state(0);

	function toggleGroup(groupId: number) {
		categoryGroups = categoryGroups.map(group => 
			group.id === groupId 
				? { ...group, isExpanded: !group.isExpanded }
				: group
		);
	}

	function formatCurrency(amount: number): string {
		return amount.toFixed(2) + 'lei';
	}
</script>

<div class="plan-page">
	<!-- Header with month and actions -->
	<header class="plan-header">
		<button onclick={() => showMonthPicker = !showMonthPicker} class="month-selector">
			{displayMonth}
			<svg class="chevron" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
			</svg>
		</button>
		
		<div class="header-actions">
			<button aria-label="Filter categories" class="header-btn">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="9" stroke-width="2"/>
					<line x1="8" y1="12" x2="16" y2="12" stroke-width="2"/>
				</svg>
			</button>
			<button aria-label="Edit categories" class="header-btn">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
				</svg>
			</button>
			<button aria-label="More options" class="header-btn">
				<svg fill="currentColor" viewBox="0 0 24 24">
					<circle cx="12" cy="5" r="1.5"/>
					<circle cx="12" cy="12" r="1.5"/>
					<circle cx="12" cy="19" r="1.5"/>
				</svg>
			</button>
		</div>
	</header>

	<!-- Ready to Assign Banner -->
	<div class="banner-container">
		<a href="/plan/assign" class="ready-banner" class:positive={readyToAssign > 0} class:negative={readyToAssign < 0}>
			<span class="banner-amount">{formatCurrency(readyToAssign)}</span>
			<div class="banner-right">
				<span class="banner-text">Ready to Assign</span>
				<svg class="banner-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</div>
		</a>
	</div>

	<!-- Category Groups List -->
	<div class="categories-list">
		{#if loading}
			<LoadingState message="Loading categories..." />
		{:else if error}
			<div class="error-state">
				<p>{error}</p>
				<button onclick={loadCategories} class="retry-btn">Retry</button>
			</div>
		{:else if categoryGroups.length === 0}
			<div class="empty-state">
				<p>No categories yet</p>
				<p class="empty-hint">Import from YNAB or create categories in Settings</p>
			</div>
		{:else}
			{#each categoryGroups as group (group.id)}
				<!-- Group Header -->
				<button onclick={() => toggleGroup(group.id)} class="group-header">
					<div class="group-left">
						<svg class="group-chevron" class:collapsed={!group.isExpanded} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
						<span class="group-name">{group.name}</span>
					</div>
				</button>

				<!-- Category Items -->
				{#if group.isExpanded}
					{#each group.categories as category (category.id)}
						<button class="category-row">
							<span class="category-name">{category.name}</span>
							<div class="category-values">
								<span class="category-spent">
									{formatCurrency(spentByCategory().get(category.category_id) || 0)}
								</span>
							</div>
						</button>
					{/each}
				{/if}
			{/each}
		{/if}
	</div>
</div>

<!-- Floating Action Button -->
<button onclick={openTransactionModal} class="fab">
	<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
	</svg>
	<span>Transaction</span>
</button>

<!-- Transaction Modal -->
<TransactionModal
	bind:show={showTransactionModal}
	{accounts}
	{categories}
	onSave={handleSaveTransaction}
/>

<style>
	.plan-page {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 70px);
		height: calc(100dvh - 70px);
	}

	/* Header */
	.plan-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
	}

	.month-selector {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 20px;
		font-weight: 600;
		color: var(--color-text-primary);
		background: none;
		border: none;
		padding: 8px 0;
		min-height: 44px;
	}

	.chevron {
		width: 20px;
		height: 20px;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.header-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: none;
		border: none;
		color: var(--color-text-secondary);
	}

	.header-btn svg {
		width: 24px;
		height: 24px;
	}

	/* Banner */
	.banner-container {
		padding: 0 16px 12px;
	}

	.ready-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-radius: 12px;
		background-color: var(--color-bg-tertiary);
		text-decoration: none;
	}

	.ready-banner.positive {
		background-color: var(--color-success);
	}

	.ready-banner.negative {
		background-color: var(--color-danger);
	}

	.banner-amount {
		font-size: 18px;
		font-weight: 700;
		color: white;
	}

	.banner-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.banner-text {
		font-size: 14px;
		font-weight: 500;
		color: white;
	}

	.banner-chevron {
		width: 20px;
		height: 20px;
		color: white;
	}

	/* Categories List */
	.categories-list {
		flex: 1;
		overflow-y: auto;
	}

	/* Group Header */
	.group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 12px 16px;
		background-color: var(--color-bg-secondary);
		border: none;
		min-height: 56px;
	}

	.group-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.group-chevron {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
		transition: transform 0.2s;
	}

	.group-chevron.collapsed {
		transform: rotate(-90deg);
	}

	.group-name {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.group-right {
		display: flex;
		gap: 24px;
	}

	.group-column {
		text-align: right;
	}

	.column-label {
		display: block;
		font-size: 11px;
		color: var(--color-text-muted);
	}

	.column-value {
		font-size: 14px;
		color: var(--color-text-primary);
	}

	/* Category Row */
	.category-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 14px 16px;
		background: none;
		border: none;
		min-height: 52px;
	}

	.category-row:active {
		background-color: var(--color-bg-secondary);
	}

	.category-name {
		font-size: 15px;
		color: var(--color-text-primary);
		text-align: left;
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding-right: 16px;
	}

	.category-values {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.category-spent {
		padding: 4px 10px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 500;
		min-width: 65px;
		text-align: center;
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	/* FAB */
	.fab {
		position: fixed;
		bottom: 84px;
		right: 16px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 20px;
		background-color: var(--color-primary);
		color: white;
		border-radius: 24px;
		text-decoration: none;
		font-weight: 500;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 50;
		min-height: 48px;
	}

	.fab svg {
		width: 20px;
		height: 20px;
	}

	/* Error and Empty States */
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
		text-align: center;
		color: var(--color-text-secondary);
	}

	.error-state p,
	.empty-state p {
		margin: 0;
		font-size: 16px;
	}

	.empty-hint {
		margin-top: 8px !important;
		font-size: 14px !important;
		color: var(--color-text-muted);
	}

	.retry-btn {
		margin-top: 16px;
		padding: 10px 20px;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		min-height: 44px;
	}

	.retry-btn:hover {
		background-color: var(--color-primary-hover);
	}
</style>

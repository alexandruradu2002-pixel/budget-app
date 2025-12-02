<script lang="ts">
	import type { CategoryGroup, Account, Category, CategoryBudget, Transaction } from '$lib/types';
	import TransactionModal from '$lib/components/TransactionModal.svelte';
	import { LoadingState, PageHeader, HeaderButton, FloatingActionButton } from '$lib/components';
	import { formatCurrency, formatMonthYear } from '$lib/utils/format';

	// Current month state
	let currentDate = $state(new Date());
	let showMonthPicker = $state(false);

	// Generate available months (last 12 months + next 12 months)
	let availableMonths = $derived.by(() => {
		const months: Date[] = [];
		const now = new Date();
		
		// Start from 12 months ago
		for (let i = -12; i <= 12; i++) {
			const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
			months.push(date);
		}
		return months;
	});

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
	let spentByCategory = $derived.by(() => {
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
					return total + (spentByCategory.get(cat.id) || 0);
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

	let displayMonth = $derived(formatMonthYear(currentDate));

	function toggleGroup(groupId: number) {
		categoryGroups = categoryGroups.map(group => 
			group.id === groupId 
				? { ...group, isExpanded: !group.isExpanded }
				: group
		);
	}

	// Month navigation functions
	function toggleMonthPicker() {
		showMonthPicker = !showMonthPicker;
	}

	function selectMonth(date: Date) {
		currentDate = date;
		showMonthPicker = false;
	}

	function isCurrentMonth(date: Date): boolean {
		return date.getFullYear() === currentDate.getFullYear() && 
			   date.getMonth() === currentDate.getMonth();
	}

	// Reload data when month changes
	$effect(() => {
		// Track currentDate to trigger reload
		const _ = currentDate.getTime();
		loadCategories();
	});
</script>

<div class="plan-page">
	<!-- Header with month and actions -->
	<PageHeader title={displayMonth} onTitleClick={toggleMonthPicker}>
		<HeaderButton label="Edit categories" href="/plan/categories">
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
			</svg>
		</HeaderButton>
	</PageHeader>

	<!-- Month Picker Dropdown -->
	{#if showMonthPicker}
		<button class="month-picker-overlay" onclick={toggleMonthPicker} aria-label="Close month picker"></button>
		<div class="month-picker">
			<div class="month-picker-header">
				<span>Select Month</span>
				<button class="close-picker" onclick={toggleMonthPicker} aria-label="Close">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="month-list">
				{#each availableMonths as month (month.getTime())}
					<button 
						class="month-option" 
						class:selected={isCurrentMonth(month)}
						onclick={() => selectMonth(month)}
					>
						{formatMonthYear(month)}
					</button>
				{/each}
			</div>
		</div>
	{/if}

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
									{formatCurrency(spentByCategory.get(category.category_id) || 0)}
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
<FloatingActionButton onclick={openTransactionModal} label="Transaction" />

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

	/* Month Picker */
	.month-picker-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 100;
		border: none;
		cursor: default;
	}

	.month-picker {
		position: fixed;
		top: 60px;
		left: 16px;
		right: 16px;
		max-width: 400px;
		max-height: 60vh;
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		z-index: 101;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.month-picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid var(--color-border);
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.close-picker {
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-picker:hover {
		color: var(--color-text-primary);
	}

	.month-list {
		overflow-y: auto;
		padding: 8px;
	}

	.month-option {
		display: block;
		width: 100%;
		padding: 12px 16px;
		background: none;
		border: none;
		border-radius: 8px;
		text-align: left;
		font-size: 15px;
		color: var(--color-text-primary);
		cursor: pointer;
		min-height: 44px;
	}

	.month-option:hover {
		background-color: var(--color-bg-tertiary);
	}

	.month-option.selected {
		background-color: var(--color-primary);
		color: white;
		font-weight: 600;
	}
</style>

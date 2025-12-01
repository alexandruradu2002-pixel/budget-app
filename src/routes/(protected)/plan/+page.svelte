<script lang="ts">
	import type { CategoryGroup, Account, Category } from '$lib/types';
	import TransactionModal from '$lib/components/TransactionModal.svelte';

	// Current month state
	let currentDate = $state(new Date());
	let showMonthPicker = $state(false);

	// Transaction modal state
	let showTransactionModal = $state(false);
	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);

	// Load accounts and categories for the modal
	async function loadModalData() {
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
		} catch (e) {
			console.error('Failed to load modal data:', e);
		}
	}

	function openTransactionModal() {
		loadModalData();
		showTransactionModal = true;
	}

	async function handleSaveTransaction(payload: any) {
		try {
			const res = await fetch('/api/transactions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error('Failed to save');
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
	let readyToAssign = $state(3413.94);

	// Category groups with mock data (will be replaced with API data)
	let categoryGroups = $state<CategoryGroup[]>([
		{
			id: 1,
			name: 'MANCARE',
			assigned: 349.00,
			available: 0.00,
			isExpanded: true,
			categories: [
				{ id: 1, category_id: 1, name: 'SuperMarchet', assigned: 49.00, activity: -49.00, available: 0.00 },
				{ id: 2, category_id: 2, name: 'Foodpanda/Glovo/Tazz', assigned: 0.00, activity: 0.00, available: 0.00 },
				{ id: 3, category_id: 3, name: 'Restaurant/Cantina', assigned: 300.00, activity: -300.00, available: 0.00 }
			]
		},
		{
			id: 2,
			name: 'EU',
			assigned: 0.00,
			available: 545.00,
			isExpanded: true,
			categories: [
				{ id: 4, category_id: 4, name: 'Pets', assigned: 0.00, activity: 0.00, available: 0.00 },
				{ id: 5, category_id: 5, name: 'Apartament', assigned: 0.00, activity: 0.00, available: 0.00 },
				{ id: 6, category_id: 6, name: 'Shopping - Online/ Fizic', assigned: 0.00, activity: 0.00, available: 545.00 },
				{ id: 7, category_id: 7, name: 'Sport', assigned: 0.00, activity: 0.00, available: 0.00 },
				{ id: 8, category_id: 8, name: 'Vacanță', assigned: 0.00, activity: 0.00, available: 0.00 },
				{ id: 9, category_id: 9, name: 'Masina', assigned: 0.00, activity: 0.00, available: 0.00 },
				{ id: 10, category_id: 10, name: 'Ieșiri', assigned: 0.00, activity: 0.00, available: 0.00 },
				{ id: 11, category_id: 11, name: 'Investing', assigned: 0.00, activity: 0.00, available: 0.00 },
				{ id: 12, category_id: 12, name: 'Games', assigned: 0.00, activity: 0.00, available: 0.00 },
				{ id: 13, category_id: 13, name: 'Cadouri', assigned: 0.00, activity: 0.00, available: 0.00 }
			]
		},
		{
			id: 3,
			name: 'Subscriptions',
			assigned: 0.00,
			available: 0.00,
			isExpanded: true,
			categories: [
				{ id: 14, category_id: 14, name: '100GB GOOGLE', assigned: 0.00, activity: 0.00, available: 0.00 },
				{ id: 15, category_id: 15, name: 'YNAB', assigned: 0.00, activity: 0.00, available: 0.00 }
			]
		}
	]);

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

	function getAvailableClass(available: number): string {
		if (available > 0) return 'available-positive';
		if (available < 0) return 'available-negative';
		return 'available-zero';
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
		{#each categoryGroups as group (group.id)}
			<!-- Group Header -->
			<button onclick={() => toggleGroup(group.id)} class="group-header">
				<div class="group-left">
					<svg class="group-chevron" class:collapsed={!group.isExpanded} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
					<span class="group-name">{group.name}</span>
				</div>
				<div class="group-right">
					<div class="group-column">
						<span class="column-label">Assigned</span>
						<span class="column-value">{formatCurrency(group.assigned)}</span>
					</div>
					<div class="group-column">
						<span class="column-label">Available</span>
						<span class="column-value">{formatCurrency(group.available)}</span>
					</div>
				</div>
			</button>

			<!-- Category Items -->
			{#if group.isExpanded}
				{#each group.categories as category (category.id)}
					<button class="category-row">
						<span class="category-name">{category.name}</span>
						<div class="category-values">
							<span class="category-assigned">{formatCurrency(category.assigned)}</span>
							<span class="category-available {getAvailableClass(category.available)}">
								{formatCurrency(category.available)}
							</span>
						</div>
					</button>
				{/each}
			{/if}
		{/each}
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
		gap: 12px;
		flex-shrink: 0;
	}

	.category-assigned {
		font-size: 14px;
		color: var(--color-text-secondary);
		min-width: 60px;
		text-align: right;
	}

	.category-available {
		padding: 4px 10px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 500;
		min-width: 65px;
		text-align: center;
	}

	.available-positive {
		background-color: var(--color-primary);
		color: white;
	}

	.available-negative {
		background-color: var(--color-danger);
		color: white;
	}

	.available-zero {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-muted);
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
</style>

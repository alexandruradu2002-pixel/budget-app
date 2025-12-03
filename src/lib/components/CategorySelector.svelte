<script lang="ts">
	import type { Category, Transaction, Account } from '$lib/types';
	import type { CurrencyValue } from '$lib/constants';
	import { formatCurrency } from '$lib/utils/format';
	import { currencyStore } from '$lib/stores';

	// Extended category type with spent amount
	interface CategoryWithSpent extends Category {
		spent?: number;
	}

	// Props
	let {
		show = $bindable(false),
		selectedCategoryId = $bindable(0),
		onSelect = (category: Category) => {},
		onClose = () => {}
	} = $props();

	// State
	let searchQuery = $state('');
	let categories = $state<CategoryWithSpent[]>([]);
	let transactions = $state<Transaction[]>([]);
	let accountCurrencies = $state<Map<number, CurrencyValue>>(new Map());
	let loading = $state(false);
	let error = $state('');

	// Calculate spent amount per category from transactions
	let spentByCategory = $derived.by(() => {
		const spent = new Map<number, number>();
		for (const t of transactions) {
			if (t.category_id) {
				// Get the currency of the transaction's account
				const accountCurrency = accountCurrencies.get(t.account_id) || 'RON';
				// Convert to main currency
				const convertedAmount = currencyStore.convert(t.amount, accountCurrency);
				
				const current = spent.get(t.category_id) || 0;
				spent.set(t.category_id, current + convertedAmount);
			}
		}
		return spent;
	});

	// Get the selected category
	let selectedCategory = $derived(() => {
		return categories.find(c => c.id === selectedCategoryId);
	});

	// Group categories by group_name (excluding selected)
	let groupedCategories = $derived(() => {
		const filtered = searchQuery
			? categories.filter(c => 
				c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(c.group_name?.toLowerCase().includes(searchQuery.toLowerCase()))
			)
			: categories;

		const groups: Record<string, CategoryWithSpent[]> = {};
		
		for (const cat of filtered) {
			// Skip selected category in the main list
			if (cat.id === selectedCategoryId) continue;
			
			const groupName = cat.group_name || 'Uncategorized';
			if (!groups[groupName]) {
				groups[groupName] = [];
			}
			// Add spent amount to the category
			groups[groupName].push({
				...cat,
				spent: spentByCategory.get(cat.id) || 0
			});
		}

		return groups;
	});

	// Load categories when modal opens
	$effect(() => {
		if (show) {
			loadCategories();
			// Add history state so back button closes modal instead of navigating away
			history.pushState({ categorySelector: true }, '');
		}
	});

	// Handle browser back button
	function handlePopState(event: PopStateEvent) {
		if (show) {
			closeModal();
		}
	}

	async function loadCategories() {
		loading = true;
		error = '';
		try {
			// Get current month's start and end dates
			const now = new Date();
			const year = now.getFullYear();
			const month = now.getMonth();
			const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
			const lastDay = new Date(year, month + 1, 0).getDate();
			const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

			// Fetch categories, transactions, and accounts in parallel
			const [catRes, transRes, accountsRes] = await Promise.all([
				fetch('/api/categories'),
				fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=1000`),
				fetch('/api/accounts')
			]);

			if (!catRes.ok) throw new Error('Failed to load categories');
			
			const catData = await catRes.json();
			categories = catData.categories || [];
			
			if (transRes.ok) {
				const transData = await transRes.json();
				transactions = transData.transactions || [];
			}
			
			// Build account currency map
			if (accountsRes.ok) {
				const accountsData = await accountsRes.json();
				const currencyMap = new Map<number, CurrencyValue>();
				for (const acc of accountsData.accounts || []) {
					currencyMap.set(acc.id, (acc.currency as CurrencyValue) || 'RON');
				}
				accountCurrencies = currencyMap;
			}
		} catch (e) {
			error = 'Could not load categories';
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function selectCategory(category: Category) {
		selectedCategoryId = category.id;
		onSelect(category);
		closeModal();
	}

	function selectNoCategory() {
		// Use -1 or 0 to indicate no category (account transfer only)
		selectedCategoryId = -1;
		onSelect({ id: -1, name: 'Account Transfer' } as Category);
		closeModal();
	}

	function closeModal() {
		// Go back in history if we added a state
		if (history.state?.categorySelector) {
			history.back();
		}
		show = false;
		searchQuery = '';
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
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
			<h2 class="modal-title">Category</h2>
			<div class="header-spacer"></div>
		</header>

		<!-- Search Input -->
		<div class="search-container">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search Categories"
				class="search-input"
			/>
		</div>

		<!-- Content -->
		<div class="modal-content">
			{#if loading}
				<div class="loading-state">
					<div class="spinner"></div>
					<span>Loading categories...</span>
				</div>
			{:else if error}
				<div class="error-state">
					<p>{error}</p>
					<button onclick={() => loadCategories()} class="retry-btn">Try Again</button>
				</div>
			{:else if Object.keys(groupedCategories()).length === 0 && !selectedCategory()}
				<div class="empty-state">
					<svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
					</svg>
					<p class="empty-title">No categories found</p>
					<p class="empty-text">
						{searchQuery ? 'Try a different search term' : 'Add some categories to get started'}
					</p>
				</div>
			{:else}
				<div class="categories-list">
					<!-- Account Transfer Option (no category) -->
					<div class="category-section">
						<div class="section-header">
							<span class="section-name">Account</span>
						</div>
						<div class="section-items">
							<button 
								class="category-item"
								class:selected={selectedCategoryId === 0 || selectedCategoryId === -1}
								onclick={() => selectNoCategory()}
							>
								<div class="radio-circle" class:checked={selectedCategoryId === 0 || selectedCategoryId === -1}>
									{#if selectedCategoryId === 0 || selectedCategoryId === -1}
										<div class="radio-dot"></div>
									{/if}
								</div>
								<div class="category-info">
									<span class="category-name">Account Transfer</span>
									<span class="category-group-label">No category - direct account balance change</span>
								</div>
							</button>
						</div>
					</div>

					<!-- Categories by Group -->
					{#each Object.entries(groupedCategories()) as [groupName, groupCategories] (groupName)}
						<div class="category-section">
							<div class="section-header">
								<span class="section-name">{groupName}</span>
							</div>
							<div class="section-items">
								{#each groupCategories as category (category.id)}
									<button 
										class="category-item"
										class:selected={selectedCategoryId === category.id}
										onclick={() => selectCategory(category)}
									>
										<div class="radio-circle" class:checked={selectedCategoryId === category.id}>
											{#if selectedCategoryId === category.id}
												<div class="radio-dot"></div>
											{/if}
										</div>
										<span class="category-name">{category.name}</span>
										<span class="category-spent" class:positive={(category.spent || 0) > 0} class:negative={(category.spent || 0) < 0}>{formatCurrency(category.spent || 0)}</span>
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

	/* Search */
	.search-container {
		padding: 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.search-input {
		width: 100%;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--color-border);
		padding: 8px 0;
		font-size: 16px;
		color: var(--color-text-primary);
		outline: none;
	}

	.search-input::placeholder {
		color: var(--color-text-muted);
	}

	.search-input:focus {
		border-bottom-color: var(--color-primary);
	}

	/* Content */
	.modal-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
	}

	/* Categories List */
	.categories-list {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* Category Section */
	.category-section {
		display: flex;
		flex-direction: column;
	}

	.section-header {
		padding: 0 4px 8px;
	}

	.section-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	.section-items {
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		overflow: hidden;
	}

	.category-item {
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

	.category-item:last-child {
		border-bottom: none;
	}

	.category-item:active {
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

	.category-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.category-name {
		flex: 1;
		font-size: 16px;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.category-group-label {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.category-spent {
		font-size: 15px;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.category-spent.positive {
		color: var(--color-success);
	}

	.category-spent.negative {
		color: var(--color-danger);
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

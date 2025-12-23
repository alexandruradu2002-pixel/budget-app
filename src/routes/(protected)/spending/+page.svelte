<script lang="ts">
	import type { Transaction, Account, Category, ClearedStatus } from '$lib/types';
	import { TransactionModal, LoadingState, EmptyState, PageHeader, HeaderButton, FloatingActionButton, CategorySelector, PayeeSelector } from '$lib/components';
	import { formatDateWithDay, formatAmountWithCurrency as formatAmountUtil } from '$lib/utils/format';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { offlineStore, toast, transactionStore } from '$lib/stores';

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
		cleared?: ClearedStatus;
	}

	const PAGE_SIZE = 20;

	let loading = $state(true);
	let loadingMore = $state(false);
	let transactions = $state<Transaction[]>([]);
	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);
	let showAddModal = $state(false);
	let editingTransaction = $state<Transaction | null>(null);
	let searchQuery = $state('');
	let showSearch = $state(false);
	
	// Bulk move mode
	let bulkMoveMode = $state(false);
	let selectedTransactionIds = $state<Set<number>>(new Set());
	let showCategorySelector = $state(false);
	let showPayeeSelector = $state(false);
	let payeeSelectorRef = $state<{ openWithFocus: () => void } | null>(null);
	let bulkMoving = $state(false);
	
	// Pagination state
	let totalTransactions = $state(0);
	let currentOffset = $state(0);
	let hasMore = $derived(currentOffset + transactions.length < totalTransactions);
	
	// Infinite scroll
	let listContainer: HTMLDivElement;
	
	// Search state
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let isSearching = $state(false);
	
	// Filter state
	let showFilterDropdown = $state(false);
	let selectedCategoryFilter = $state<number | null>(null);
	let selectedCategoryFilterName = $state<string>('');

	// Helper to check if transaction is an adjustment (should be hidden)
	function isAdjustmentTransaction(tx: Transaction): boolean {
		const desc = tx.description?.toLowerCase() || '';
		return desc.includes('reconciliation adjustment') || 
			   desc.includes('closing balance') ||
			   desc.includes('starting balance');
	}

	// Format amount with account's currency
	function formatAmountWithCurrency(amount: number, accountId: number): string {
		const account = accounts.find(a => a.id === accountId);
		const currency = account?.currency || 'RON';
		return formatAmountUtil(amount, currency);
	}

	// Filter out adjustment transactions, then group by date
	let filteredTransactions = $derived(transactions.filter(tx => !isAdjustmentTransaction(tx)));
	
	// Group transactions by date (no local filtering - search is done server-side)
	let groupedTransactions = $derived.by(() => {
		const groups: Record<string, Transaction[]> = {};
		for (const tx of filteredTransactions) {
			if (!groups[tx.date]) groups[tx.date] = [];
			groups[tx.date].push(tx);
		}
		return Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
	});

	// Count of selected transactions
	let selectedCount = $derived(selectedTransactionIds.size);

	// Toggle bulk move mode
	function toggleBulkMoveMode() {
		bulkMoveMode = !bulkMoveMode;
		if (!bulkMoveMode) {
			selectedTransactionIds = new Set();
		}
	}

	// Toggle transaction selection
	function toggleTransactionSelection(txId: number, event?: Event) {
		event?.stopPropagation();
		const newSet = new Set(selectedTransactionIds);
		if (newSet.has(txId)) {
			newSet.delete(txId);
		} else {
			newSet.add(txId);
		}
		selectedTransactionIds = newSet;
	}

	// Select all visible transactions
	function selectAllTransactions() {
		const allIds = filteredTransactions.map(tx => tx.id);
		selectedTransactionIds = new Set(allIds);
	}

	// Deselect all
	function deselectAllTransactions() {
		selectedTransactionIds = new Set();
	}

	// Open category selector for bulk move
	function openBulkCategorySelector() {
		if (selectedCount === 0) return;
		showCategorySelector = true;
	}

	// Handle bulk category change
	async function handleBulkCategoryChange(category: Category) {
		showCategorySelector = false;
		if (!category?.id || selectedCount === 0) return;
		
		bulkMoving = true;
		try {
			// Update each selected transaction
			const promises = Array.from(selectedTransactionIds).map(txId => {
				const tx = transactions.find(t => t.id === txId);
				if (!tx) return Promise.resolve();
				
				// Send all required fields for the transaction update
				return fetch('/api/transactions', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: txId,
						account_id: tx.account_id,
						amount: tx.amount,
						description: tx.description,
						date: tx.date,
						category_id: category.id,
						payee: tx.payee || tx.description,
						memo: tx.memo || tx.notes || '',
						cleared: tx.cleared || 'uncleared',
						notes: tx.notes || ''
					})
				});
			});
			
			await Promise.all(promises);
			
			// Reset and reload
			selectedTransactionIds = new Set();
			bulkMoveMode = false;
			await reloadWithCurrentSearch();
		} catch (error) {
			console.error('Failed to bulk move transactions:', error);
		} finally {
			bulkMoving = false;
		}
	}

	// Open payee selector for bulk change
	function openBulkPayeeSelector() {
		if (selectedCount === 0) return;
		payeeSelectorRef?.openWithFocus();
	}

	// Handle bulk payee change
	async function handleBulkPayeeChange(payee: string) {
		showPayeeSelector = false;
		if (!payee || selectedCount === 0) return;
		
		bulkMoving = true;
		try {
			// Update each selected transaction
			const promises = Array.from(selectedTransactionIds).map(txId => {
				const tx = transactions.find(t => t.id === txId);
				if (!tx) return Promise.resolve();
				
				// Send all required fields for the transaction update
				return fetch('/api/transactions', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: txId,
						account_id: tx.account_id,
						amount: tx.amount,
						description: payee, // Also update description to match payee
						date: tx.date,
						category_id: tx.category_id,
						payee: payee,
						memo: tx.memo || tx.notes || '',
						cleared: tx.cleared || 'uncleared',
						notes: tx.notes || ''
					})
				});
			});
			
			await Promise.all(promises);
			
			// Reset and reload
			selectedTransactionIds = new Set();
			bulkMoveMode = false;
			await reloadWithCurrentSearch();
		} catch (error) {
			console.error('Failed to bulk change payees:', error);
		} finally {
			bulkMoving = false;
		}
	}

	// Debounced search function
	function handleSearchInput(value: string) {
		searchQuery = value;
		
		// Clear previous timeout
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
		
		// Debounce: wait 300ms after user stops typing
		searchTimeout = setTimeout(() => {
			updateUrlAndSearch(value, selectedCategoryFilter);
		}, 300);
	}

	// Update URL with current filters
	function updateUrlAndSearch(query: string, categoryId: number | null) {
		const params = new URLSearchParams();
		if (query.trim()) {
			params.set('search', query.trim());
		}
		if (categoryId !== null) {
			params.set('category', categoryId.toString());
		}
		const newUrl = params.toString() ? `?${params.toString()}` : '/spending';
		goto(newUrl, { replaceState: true, keepFocus: true });
		searchTransactions(query);
	}

	async function searchTransactions(query: string) {
		isSearching = true;
		currentOffset = 0;
		
		try {
			const searchParam = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : '';
			const categoryParam = selectedCategoryFilter ? `&categoryId=${selectedCategoryFilter}` : '';
			const res = await fetch(`/api/transactions?limit=${PAGE_SIZE}&offset=0${searchParam}${categoryParam}`);
			if (res.ok) {
				const data = await res.json();
				transactions = data.transactions;
				totalTransactions = data.total;
			}
		} catch (error) {
			console.error('Failed to search transactions:', error);
		} finally {
			isSearching = false;
		}
	}

	async function loadData(initialSearch?: string, initialCategoryId?: number | null) {
		try {
			// Reset pagination when loading fresh data
			currentOffset = 0;
			
			// If offline, try to load from IndexedDB
			if (!offlineStore.isOnline) {
				const [offlineTransactions, offlineAccounts, offlineCategories] = await Promise.all([
					offlineStore.getTransactions(),
					offlineStore.getAccounts(),
					offlineStore.getCategories()
				]);
				
				transactions = offlineTransactions;
				totalTransactions = offlineTransactions.length;
				accounts = offlineAccounts;
				categories = offlineCategories;
				
				// Apply local filtering for search
				if (initialSearch) {
					const query = initialSearch.toLowerCase();
					transactions = transactions.filter(tx => 
						tx.description?.toLowerCase().includes(query) ||
						tx.payee?.toLowerCase().includes(query)
					);
					totalTransactions = transactions.length;
				}
				
				if (initialCategoryId) {
					transactions = transactions.filter(tx => tx.category_id === initialCategoryId);
					totalTransactions = transactions.length;
					const cat = categories.find(c => c.id === initialCategoryId);
					if (cat) selectedCategoryFilterName = cat.name;
				}
				
				loading = false;
				return;
			}
			
			// Build query params for transactions
			const searchParam = initialSearch ? `&search=${encodeURIComponent(initialSearch)}` : '';
			const categoryParam = initialCategoryId ? `&categoryId=${initialCategoryId}` : '';
			
			const [txRes, accRes, catRes] = await Promise.all([
				fetch(`/api/transactions?limit=${PAGE_SIZE}&offset=0${searchParam}${categoryParam}`),
				fetch('/api/accounts'),
				fetch('/api/categories')
			]);
			if (txRes.ok) {
				const data = await txRes.json();
				transactions = data.transactions;
				totalTransactions = data.total;
			}
			if (accRes.ok) accounts = (await accRes.json()).accounts;
			if (catRes.ok) {
				categories = (await catRes.json()).categories;
				// Set category filter name if we have initial category
				if (initialCategoryId) {
					const cat = categories.find(c => c.id === initialCategoryId);
					if (cat) {
						selectedCategoryFilterName = cat.name;
					}
				}
			}
		} catch (error) {
			console.error('Failed to load data:', error);
			
			// Fallback to offline data on error
			try {
				const [offlineTransactions, offlineAccounts, offlineCategories] = await Promise.all([
					offlineStore.getTransactions(),
					offlineStore.getAccounts(),
					offlineStore.getCategories()
				]);
				
				if (offlineTransactions.length > 0 || offlineAccounts.length > 0) {
					transactions = offlineTransactions;
					totalTransactions = offlineTransactions.length;
					accounts = offlineAccounts;
					categories = offlineCategories;
					toast.info('Loaded cached data. Some data may be outdated.');
				}
			} catch {
				// Ignore offline fallback errors
			}
		} finally {
			loading = false;
		}
	}

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		
		loadingMore = true;
		try {
			const newOffset = currentOffset + PAGE_SIZE;
			const searchParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : '';
			const categoryParam = selectedCategoryFilter ? `&categoryId=${selectedCategoryFilter}` : '';
			const res = await fetch(`/api/transactions?limit=${PAGE_SIZE}&offset=${newOffset}${searchParam}${categoryParam}`);
			if (res.ok) {
				const data = await res.json();
				transactions = [...transactions, ...data.transactions];
				currentOffset = newOffset;
			}
		} catch (error) {
			console.error('Failed to load more transactions:', error);
		} finally {
			loadingMore = false;
		}
	}

	async function handleSaveTransaction(payload: TransactionPayload) {
		try {
			// Try online first
			const res = await fetch('/api/transactions', {
				method: payload.id ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (res.ok) {
				await reloadWithCurrentSearch();
			} else if (!offlineStore.isOnline) {
				// Offline - use offline store
				const result = payload.id 
					? await offlineStore.updateTransaction(payload.id, payload)
					: await offlineStore.createTransaction(payload as Partial<Transaction>);
				
				if (result.success) {
					toast.success(result.offline ? 'Transaction saved offline. Will sync when online.' : 'Transaction saved!');
					await reloadWithCurrentSearch();
				}
			}
		} catch (error) {
			console.error('Failed to save transaction:', error);
			// Try offline fallback
			if (!offlineStore.isOnline) {
				const result = payload.id 
					? await offlineStore.updateTransaction(payload.id, payload)
					: await offlineStore.createTransaction(payload as Partial<Transaction>);
				
				if (result.success) {
					toast.success('Saved offline. Will sync when online.');
					await reloadWithCurrentSearch();
				}
			}
		}
	}

	async function handleDeleteTransaction(id: number) {
		try {
			const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
			if (res.ok) {
				await reloadWithCurrentSearch();
			} else if (!offlineStore.isOnline) {
				const result = await offlineStore.deleteTransaction(id);
				if (result.success) {
					toast.success('Deleted offline. Will sync when online.');
					await reloadWithCurrentSearch();
				}
			}
		} catch (error) {
			console.error('Failed to delete transaction:', error);
			if (!offlineStore.isOnline) {
				const result = await offlineStore.deleteTransaction(id);
				if (result.success) {
					toast.success('Deleted offline. Will sync when online.');
					await reloadWithCurrentSearch();
				}
			}
		}
	}

	// Reload transactions while preserving search state
	async function reloadWithCurrentSearch() {
		currentOffset = 0;
		try {
			const searchParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : '';
			const categoryParam = selectedCategoryFilter ? `&categoryId=${selectedCategoryFilter}` : '';
			const res = await fetch(`/api/transactions?limit=${PAGE_SIZE}&offset=0${searchParam}${categoryParam}`);
			if (res.ok) {
				const data = await res.json();
				transactions = data.transactions;
				totalTransactions = data.total;
			}
		} catch (error) {
			console.error('Failed to reload transactions:', error);
		}
	}

	// Apply category filter
	function applyCategoryFilter(categoryId: number | null, categoryName: string) {
		selectedCategoryFilter = categoryId;
		selectedCategoryFilterName = categoryName;
		showFilterDropdown = false;
		updateUrlAndSearch(searchQuery, categoryId);
	}

	// Clear category filter
	function clearCategoryFilter() {
		selectedCategoryFilter = null;
		selectedCategoryFilterName = '';
		updateUrlAndSearch(searchQuery, null);
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

	function handleScroll(event: Event) {
		const target = event.target as HTMLDivElement;
		const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
		
		// Load more when user scrolls within 200px of the bottom
		if (scrollBottom < 200 && hasMore && !loadingMore && !loading) {
			loadMore();
		}
	}

	// Track last known update counter to detect external changes
	let lastUpdateCounter = $state(0);

	// Initialize from URL params on mount
	$effect(() => {
		const urlParams = $page.url.searchParams;
		const initialSearch = urlParams.get('search') || '';
		const initialCategoryId = urlParams.get('category') ? parseInt(urlParams.get('category')!) : null;
		
		// Set initial state
		searchQuery = initialSearch;
		selectedCategoryFilter = initialCategoryId;
		
		// Show search bar if there are filters
		if (initialSearch || initialCategoryId !== null) {
			showSearch = true;
		}
		
		loadData(initialSearch, initialCategoryId);
	});

	// React to transaction changes from other pages (e.g., TransactionModal)
	$effect(() => {
		const currentCounter = transactionStore.updateCounter;
		if (currentCounter > lastUpdateCounter) {
			lastUpdateCounter = currentCounter;
			// Reload data when transactions change
			loadData(searchQuery, selectedCategoryFilter);
		}
	});
</script>

<div class="spending-page">
	<PageHeader title="Spending">
		<HeaderButton label="Bulk Move" onclick={toggleBulkMoveMode}>
			{#if bulkMoveMode}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			{:else}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
				</svg>
			{/if}
		</HeaderButton>
		<HeaderButton label="Search" onclick={() => { 
			showSearch = !showSearch; 
			if (!showSearch && searchQuery) {
				searchQuery = '';
				updateUrlAndSearch('', selectedCategoryFilter);
			}
		}}>
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
		</HeaderButton>
	</PageHeader>

	<!-- Bulk Move Selection Bar -->
	{#if bulkMoveMode}
		<div class="bulk-selection-bar">
			<div class="bulk-selection-info">
				<span class="selection-count">{selectedCount} selected</span>
				<div class="selection-actions">
					<button class="select-action-btn" onclick={selectAllTransactions}>Select All</button>
					<button class="select-action-btn" onclick={deselectAllTransactions}>Clear</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Search Bar -->
	{#if showSearch}
		<div class="search-container">
			<div class="search-row">
				<div class="search-wrapper">
					<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input 
						id="search-input" 
						type="text" 
						placeholder="Search all transactions..." 
						value={searchQuery}
						oninput={(e) => handleSearchInput(e.currentTarget.value)}
						class="search-input"
					/>
					{#if isSearching}
						<div class="search-spinner"></div>
					{:else if searchQuery}
						<button class="search-clear" onclick={() => { searchQuery = ''; updateUrlAndSearch('', selectedCategoryFilter); }} aria-label="Clear search">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>
				<!-- Filter Button -->
				<div class="filter-container">
					<button 
						class="filter-btn" 
						class:active={selectedCategoryFilter !== null}
						onclick={() => showFilterDropdown = !showFilterDropdown}
						aria-label="Filter by category"
					>
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
						</svg>
						{#if selectedCategoryFilter !== null}
							<span class="filter-badge"></span>
						{/if}
					</button>
					
					<!-- Filter Dropdown -->
					{#if showFilterDropdown}
						<div class="filter-backdrop" onclick={() => showFilterDropdown = false} role="presentation"></div>
						<div class="filter-dropdown">
							<div class="filter-header">
								<span class="filter-title">Filter by Category</span>
								{#if selectedCategoryFilter !== null}
									<button class="filter-clear-btn" onclick={clearCategoryFilter}>Clear</button>
								{/if}
							</div>
							<div class="filter-options">
								{#each categories as category (category.id)}
									<button 
										class="filter-option"
										class:selected={selectedCategoryFilter === category.id}
										onclick={() => applyCategoryFilter(category.id, category.name)}
									>
										<span class="filter-option-name">{category.name}</span>
										{#if selectedCategoryFilter === category.id}
											<svg class="filter-check" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
												<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
			
			<!-- Active Filter Chip -->
			{#if selectedCategoryFilter !== null}
				<div class="active-filter">
					<span class="active-filter-label">Category:</span>
					<span class="active-filter-value">{selectedCategoryFilterName}</span>
					<button class="active-filter-remove" onclick={clearCategoryFilter} aria-label="Remove filter">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}
			
			{#if (searchQuery || selectedCategoryFilter !== null) && !isSearching}
				<div class="search-results-count">
					{totalTransactions} result{totalTransactions !== 1 ? 's' : ''} found
				</div>
			{/if}
		</div>
	{/if}

	<!-- Transactions List -->
	<div class="transactions-list" bind:this={listContainer} onscroll={handleScroll}>
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
						<span class="date-text">{formatDateWithDay(date)}</span>
						<span class="date-count">{txs.length} transaction{txs.length !== 1 ? 's' : ''}</span>
					</div>
					<div class="transactions-card">
						{#each txs as tx, i}
							<button class="transaction-row" class:selected={bulkMoveMode && selectedTransactionIds.has(tx.id)} onclick={(e) => bulkMoveMode ? toggleTransactionSelection(tx.id, e) : openEditModal(tx)}>
								{#if bulkMoveMode}
									<span class="checkbox-wrapper">
										<span class="checkbox" class:checked={selectedTransactionIds.has(tx.id)}>
											{#if selectedTransactionIds.has(tx.id)}
												<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
													<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
												</svg>
											{/if}
										</span>
									</span>
								{/if}
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
			
			<!-- Loading indicator for infinite scroll -->
			{#if hasMore || loadingMore}
				<div class="load-more-container">
					{#if loadingMore}
						<div class="loading-indicator">
							<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
								<circle cx="12" cy="12" r="10" stroke-width="2" stroke-opacity="0.3" />
								<path stroke-linecap="round" stroke-width="2" d="M12 2a10 10 0 0 1 10 10" />
							</svg>
							<span>Se încarcă...</span>
						</div>
					{:else}
						<button class="load-more-btn" onclick={loadMore}>
							Încarcă mai multe ({totalTransactions - transactions.length} rămase)
						</button>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>

<!-- Floating Action Button (hidden in bulk mode) -->
{#if !bulkMoveMode}
	<FloatingActionButton onclick={openAddModal} label="Transaction" />
{/if}

<!-- Bulk Move Bottom Bar -->
{#if bulkMoveMode && selectedCount > 0}
	<div class="bulk-move-bar">
		<button class="bulk-move-btn" onclick={openBulkCategorySelector} disabled={bulkMoving}>
			{#if bulkMoving}
				<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<circle cx="12" cy="12" r="10" stroke-width="2" stroke-opacity="0.3" />
					<path stroke-linecap="round" stroke-width="2" d="M12 2a10 10 0 0 1 10 10" />
				</svg>
				Moving...
			{:else}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
				</svg>
				Move {selectedCount} to Category
			{/if}
		</button>
		<button class="bulk-move-btn secondary" onclick={openBulkPayeeSelector} disabled={bulkMoving}>
			{#if bulkMoving}
				<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<circle cx="12" cy="12" r="10" stroke-width="2" stroke-opacity="0.3" />
					<path stroke-linecap="round" stroke-width="2" d="M12 2a10 10 0 0 1 10 10" />
				</svg>
			{:else}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
				Change Payee
			{/if}
		</button>
	</div>
{/if}

<!-- Category Selector for Bulk Move -->
{#if showCategorySelector}
	<CategorySelector
		bind:show={showCategorySelector}
		selectedCategoryId={0}
		onSelect={handleBulkCategoryChange}
	/>
{/if}

<!-- Payee Selector for Bulk Change -->
<PayeeSelector
	bind:this={payeeSelectorRef}
	bind:show={showPayeeSelector}
	selectedPayee=""
	{accounts}
	onSelect={handleBulkPayeeChange}
/>

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

	.search-row {
		display: flex;
		gap: 10px;
		align-items: center;
	}

	.search-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1;
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

	.search-spinner {
		width: 18px;
		height: 18px;
		border: 2px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.search-results-count {
		font-size: 12px;
		color: var(--color-text-muted);
		padding: 4px 0 0 14px;
	}

	/* Filter Button */
	.filter-container {
		position: relative;
	}

	.filter-btn {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background-color: var(--color-bg-secondary);
		border: 1px solid transparent;
		border-radius: 14px;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.filter-btn svg {
		width: 20px;
		height: 20px;
	}

	.filter-btn:hover, .filter-btn:active {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.filter-btn.active {
		background-color: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.filter-badge {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 8px;
		height: 8px;
		background-color: var(--color-primary);
		border-radius: 50%;
	}

	.filter-btn.active .filter-badge {
		display: none;
	}

	/* Filter Dropdown */
	.filter-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
	}

	.filter-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 280px;
		max-height: 400px;
		background-color: var(--color-bg-primary);
		border: 1px solid var(--color-border);
		border-radius: 16px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
		z-index: 101;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.filter-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.filter-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.filter-clear-btn {
		padding: 6px 12px;
		background-color: var(--color-bg-secondary);
		border: none;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-primary);
		cursor: pointer;
	}

	.filter-clear-btn:hover {
		background-color: var(--color-bg-tertiary);
	}

	.filter-options {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.filter-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 12px 14px;
		background: none;
		border: none;
		border-radius: 10px;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.filter-option:hover {
		background-color: var(--color-bg-secondary);
	}

	.filter-option.selected {
		background-color: var(--color-bg-secondary);
	}

	.filter-option-name {
		font-size: 15px;
		color: var(--color-text-primary);
	}

	.filter-check {
		width: 20px;
		height: 20px;
		color: var(--color-primary);
	}

	/* Active Filter Chip */
	.active-filter {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
		padding: 8px 12px;
		background-color: var(--color-bg-secondary);
		border-radius: 20px;
		font-size: 13px;
	}

	.active-filter-label {
		color: var(--color-text-muted);
	}

	.active-filter-value {
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.active-filter-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		padding: 0;
		background-color: var(--color-bg-tertiary);
		border: none;
		border-radius: 50%;
		cursor: pointer;
	}

	.active-filter-remove svg {
		width: 12px;
		height: 12px;
		color: var(--color-text-muted);
	}

	.active-filter-remove:hover {
		background-color: var(--color-border);
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

	/* Load More Button */
	.load-more-container {
		display: flex;
		justify-content: center;
		padding: 16px 0 32px;
	}

	.load-more-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 14px 28px;
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 200px;
	}

	.load-more-btn:hover:not(:disabled) {
		background: var(--color-bg-tertiary);
		border-color: var(--color-primary);
	}

	.load-more-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.loading-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 16px;
		color: var(--color-text-muted);
		font-size: 14px;
	}

	.loading-indicator .spinner {
		width: 18px;
		height: 18px;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
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

	/* Bulk Selection Bar */
	.bulk-selection-bar {
		padding: 12px 16px;
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
	}

	.bulk-selection-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.selection-count {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-primary);
	}

	.selection-actions {
		display: flex;
		gap: 12px;
	}

	.select-action-btn {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 6px;
		transition: all 0.15s ease;
	}

	.select-action-btn:hover {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	/* Checkbox */
	.checkbox-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		padding-right: 12px;
		flex-shrink: 0;
	}

	.checkbox {
		width: 22px;
		height: 22px;
		border: 2px solid var(--color-border);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
		background: var(--color-bg-primary);
	}

	.checkbox.checked {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.checkbox svg {
		width: 14px;
		height: 14px;
		color: white;
	}

	.transaction-row.selected {
		background: rgba(99, 102, 241, 0.1);
	}

	/* Bulk Move Bottom Bar */
	.bulk-move-bar {
		position: fixed;
		bottom: 70px;
		left: 0;
		right: 0;
		padding: 12px 16px;
		background: var(--color-bg-secondary);
		border-top: 1px solid var(--color-border);
		display: flex;
		justify-content: center;
		gap: 12px;
		z-index: 50;
	}

	.bulk-move-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 14px 20px;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 12px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 160px;
	}

	.bulk-move-btn.secondary {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
	}

	.bulk-move-btn.secondary:hover:not(:disabled) {
		background: var(--color-bg-secondary);
		border-color: var(--color-primary);
	}

	.bulk-move-btn:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	.bulk-move-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.bulk-move-btn svg {
		width: 20px;
		height: 20px;
	}

	.bulk-move-btn .spinner {
		width: 18px;
		height: 18px;
		animation: spin 1s linear infinite;
	}
</style>

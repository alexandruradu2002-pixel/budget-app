<script lang="ts">
	import { formatCurrency, formatMonthYear } from '$lib/utils/format';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	
	// Tab state
	let activeTab: 'month' | 'presets' = $state('month');
	
	// Current month state
	let currentDate = $state(new Date());
	let showMonthPicker = $state(false);
	
	// Preset state
	type PresetType = 'last3months' | 'last6months' | 'last12months' | 'yearToDate' | 'lastYear' | 'allDates';
	let selectedPreset: PresetType = $state('last3months');
	let showPresetPicker = $state(false);
	let earliestTransactionDate: string | null = $state(null);
	
	// Preset labels
	const presetLabels: Record<PresetType, string> = {
		'last3months': 'Last 3 Months',
		'last6months': 'Last 6 Months',
		'last12months': 'Last 12 Months',
		'yearToDate': 'Year to Date',
		'lastYear': 'Last Year',
		'allDates': 'All Dates'
	};
	
	// Calendar state
	let calendarYear = $state(new Date().getFullYear());
	
	let displayMonth = $derived(formatMonthYear(currentDate));
	
	// Loading state
	let loading = $state(true);
	
	// Category filter (from localStorage)
	let filteredCategoryIds: Set<number> | null = $state(null); // null means show all
	
	// Month names for calendar
	const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	
	// Chart colors for categories
	const chartColors = [
		'--color-chart-1',
		'--color-chart-2', 
		'--color-chart-3',
		'--color-chart-4',
		'--color-chart-5'
	];

	// Spending data
	let spendingTotal = $state(0);
	let categorySpending: { id: number; name: string; amount: number; color: string; colorVar: string; percent: number }[] = $state([]);

	// Derived: calculate start and end of selected month
	let monthRange = $derived(() => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
		const lastDay = new Date(year, month + 1, 0).getDate();
		const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
		return { startDate, endDate };
	});

	// Derived: calculate date range for presets
	let presetRange = $derived(() => {
		const now = new Date();
		const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		
		switch (selectedPreset) {
			case 'last3months': {
				const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
				const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
				return { startDate, endDate: today };
			}
			case 'last6months': {
				const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
				const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
				return { startDate, endDate: today };
			}
			case 'last12months': {
				const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
				const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
				return { startDate, endDate: today };
			}
			case 'yearToDate': {
				const startDate = `${now.getFullYear()}-01-01`;
				return { startDate, endDate: today };
			}
			case 'lastYear': {
				const lastYear = now.getFullYear() - 1;
				const startDate = `${lastYear}-01-01`;
				const endDate = `${lastYear}-12-31`;
				return { startDate, endDate };
			}
			case 'allDates': {
				// Use earliest transaction date or fallback to 10 years ago
				const startDate = earliestTransactionDate || `${now.getFullYear() - 10}-01-01`;
				return { startDate, endDate: today };
			}
			default:
				return { startDate: today, endDate: today };
		}
	});

	// Get current date range based on active tab
	let currentRange = $derived(() => {
		if (activeTab === 'month') {
			return monthRange();
		} else {
			return presetRange();
		}
	});

	// Load filter from localStorage
	function loadFilter() {
		if (browser) {
			const saved = localStorage.getItem('spendingCategoryFilter');
			if (saved) {
				const savedIds = JSON.parse(saved) as number[];
				filteredCategoryIds = new Set(savedIds);
			} else {
				filteredCategoryIds = null; // null means show all
			}
		}
	}

	// Load earliest transaction date for "All Dates" preset
	async function loadEarliestTransactionDate() {
		try {
			// Fetch a large batch and find the earliest date client-side
			// since the API doesn't support sorting by date ascending
			const response = await fetch('/api/transactions?limit=10000');
			if (response.ok) {
				const data = await response.json();
				if (data.transactions && data.transactions.length > 0) {
					// Find the earliest date
					let earliest = data.transactions[0].date;
					for (const tx of data.transactions) {
						if (tx.date < earliest) {
							earliest = tx.date;
						}
					}
					earliestTransactionDate = earliest;
				}
			}
		} catch (err) {
			console.error('Error loading earliest transaction date:', err);
		}
	}

	// Load spending data
	async function loadSpendingData() {
		loading = true;
		try {
			// Load filter first
			loadFilter();
			
			const { startDate, endDate } = currentRange();
			
			// Get all expense categories
			const categoriesResponse = await fetch('/api/categories?type=expense');
			if (!categoriesResponse.ok) throw new Error('Failed to load categories');
			const categoriesData = await categoriesResponse.json();
			
			const expenseCategories = categoriesData.categories || [];
			const expenseCategoryIds = new Set(expenseCategories.map((cat: { id: number }) => cat.id));
			
			// Load transactions for the date range
			const response = await fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=10000`);
			if (!response.ok) throw new Error('Failed to load transactions');
			
			const data = await response.json();
			const transactions = data.transactions || [];

			// Group by category and sum amounts (keeping sign for net calculation)
			const categoryMap = new Map<number, { name: string; amount: number; color: string }>();
			
			for (const tx of transactions) {
				// Include all transactions with a category (both inflows and outflows)
				if (!tx.category_id || !expenseCategoryIds.has(tx.category_id)) continue;
				
				// Apply filter - skip if category is not in the filter
				if (filteredCategoryIds !== null && !filteredCategoryIds.has(tx.category_id)) continue;
				
				const categoryId = tx.category_id;
				const categoryName = tx.category_name || 'Uncategorized';
				const categoryColor = tx.category_color || '#6B7280';
				// Keep the original amount (negative for outflows, positive for inflows/refunds)
				const amount = tx.amount;
				
				if (categoryMap.has(categoryId)) {
					categoryMap.get(categoryId)!.amount += amount;
				} else {
					categoryMap.set(categoryId, { name: categoryName, amount, color: categoryColor });
				}
			}

			// Convert to array - amount is net (negative means spent, positive means refunded more than spent)
			// We negate to show positive values for spending
			const categoriesArray = Array.from(categoryMap.entries())
				.map(([id, data], index) => ({
					id: id,
					name: data.name,
					amount: -data.amount, // Negate so spending shows as positive
					color: data.color,
					colorVar: chartColors[index % chartColors.length],
					percent: 0
				}))
				.filter(cat => cat.amount > 0) // Only show categories with net spending
				.sort((a, b) => b.amount - a.amount);

			// Calculate total and percentages
			const total = categoriesArray.reduce((sum, cat) => sum + cat.amount, 0);
			spendingTotal = total;
			
			categorySpending = categoriesArray.map(cat => ({
				...cat,
				percent: total > 0 ? (cat.amount / total) * 100 : 0
			}));

		} catch (err) {
			console.error('Error loading spending data:', err);
		} finally {
			loading = false;
		}
	}

	// Navigate months
	function previousMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
	}

	function nextMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
	}

	// Toggle month picker
	function toggleMonthPicker() {
		if (!showMonthPicker) {
			// Reset calendar year to current selection when opening
			calendarYear = currentDate.getFullYear();
		}
		showMonthPicker = !showMonthPicker;
	}
	
	// Close month picker
	function closeMonthPicker() {
		showMonthPicker = false;
	}

	// Select month from picker
	function selectMonth(year: number, month: number) {
		currentDate = new Date(year, month, 1);
		showMonthPicker = false;
	}
	
	// Navigate calendar years
	function previousCalendarYear() {
		calendarYear--;
	}
	
	function nextCalendarYear() {
		calendarYear++;
	}
	
	// Check if month is in the future
	function isFutureMonth(year: number, month: number): boolean {
		const now = new Date();
		return year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());
	}
	
	// Check if month is selected
	function isSelectedMonth(year: number, month: number): boolean {
		return year === currentDate.getFullYear() && month === currentDate.getMonth();
	}

	// Navigate to category transactions
	function openCategoryTransactions(categoryId: number, categoryName: string) {
		const { startDate, endDate } = currentRange();
		goto(`/reports/spending/category/${categoryId}?startDate=${startDate}&endDate=${endDate}&name=${encodeURIComponent(categoryName)}`);
	}

	// Toggle preset picker
	function togglePresetPicker() {
		showPresetPicker = !showPresetPicker;
	}
	
	// Close preset picker
	function closePresetPicker() {
		showPresetPicker = false;
	}
	
	// Select preset
	function selectPreset(preset: PresetType) {
		selectedPreset = preset;
		showPresetPicker = false;
	}

	// Load earliest date on mount
	$effect(() => {
		loadEarliestTransactionDate();
	});

	// Load data on mount and when date range changes
	$effect(() => {
		const _ = currentRange();
		loadSpendingData();
	});

	function goBack() {
		goto('/reports');
	}
</script>

<div class="spending-breakdown-page">
	<!-- Header -->
	<header class="page-header">
		<button class="back-btn" onclick={goBack} aria-label="Go back">
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<h1 class="page-title">Spending Breakdown</h1>
		<div class="header-actions">
			<a href="/reports/spending/filter" class="header-btn" aria-label="Filter categories">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
				</svg>
			</a>
		</div>
	</header>

	<!-- Tabs -->
	<div class="tabs">
		<button 
			class="tab" 
			class:active={activeTab === 'month'}
			onclick={() => activeTab = 'month'}
		>
			{#if activeTab === 'month'}
				<svg class="tab-check" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			{/if}
			Month
		</button>
		<button 
			class="tab" 
			class:active={activeTab === 'presets'}
			onclick={() => activeTab = 'presets'}
		>
			{#if activeTab === 'presets'}
				<svg class="tab-check" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			{/if}
			Presets
		</button>
	</div>

	<!-- Content -->
	<div class="spending-content">
		<!-- Month/Preset Selector Card -->
		<div class="spending-card">
			{#if activeTab === 'month'}
				<button class="month-selector" onclick={toggleMonthPicker}>
					<span>{displayMonth}</span>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
			{:else}
				<button class="month-selector" onclick={togglePresetPicker}>
					<span>{presetLabels[selectedPreset]}</span>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
			{/if}

			<div class="total-spending">
				<span class="total-label">Total Spending</span>
				<span class="total-amount">{formatCurrency(spendingTotal)}</span>
			</div>

			<!-- Progress bar segmented by category -->
			{#if categorySpending.length > 0}
				<div class="progress-bar">
					{#each categorySpending as category}
						<div 
							class="progress-segment" 
							style="width: {category.percent}%; background-color: var({category.colorVar})"
							title="{category.name}: {formatCurrency(category.amount)}"
						></div>
					{/each}
				</div>
			{:else}
				<div class="progress-bar">
					<div class="progress-segment empty" style="width: 100%"></div>
				</div>
			{/if}
		</div>

		<!-- Categories List -->
		<div class="categories-card">
			<h3 class="categories-title">Categories</h3>
			
			{#if loading}
				<div class="loading-state">Loading...</div>
			{:else if categorySpending.length > 0}
				<div class="categories-list">
					{#each categorySpending as category}
						<button class="category-row" onclick={() => openCategoryTransactions(category.id, category.name)}>
							<div class="category-info">
								<span class="category-name">{category.name}</span>
								<div class="category-progress">
									<div 
										class="category-bar" 
										style="width: {category.percent}%; background-color: var({category.colorVar})"
									></div>
									<span class="category-percent">{category.percent.toFixed(0)}%</span>
								</div>
							</div>
							<div class="category-right">
								<span class="category-amount">{formatCurrency(category.amount)}</span>
								<svg class="category-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
								</svg>
							</div>
						</button>
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<p>No spending this month</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Month Picker Modal -->
	{#if showMonthPicker}
		<button class="modal-backdrop" onclick={closeMonthPicker} aria-label="Close month picker"></button>
		<div class="month-picker-modal">
			<div class="month-picker-header">
				<button class="year-nav-btn" onclick={previousCalendarYear} aria-label="Previous year">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<span class="year-title">{calendarYear}</span>
				<button class="year-nav-btn" onclick={nextCalendarYear} aria-label="Next year">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>
			<div class="months-grid">
				{#each monthNames as monthName, index}
					<button 
						class="month-btn"
						class:selected={isSelectedMonth(calendarYear, index)}
						class:disabled={isFutureMonth(calendarYear, index)}
						disabled={isFutureMonth(calendarYear, index)}
						onclick={() => selectMonth(calendarYear, index)}
					>
						{monthName}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Preset Picker Modal -->
	{#if showPresetPicker}
		<button class="modal-backdrop" onclick={closePresetPicker} aria-label="Close preset picker"></button>
		<div class="preset-picker-modal">
			<div class="preset-list">
				{#each Object.entries(presetLabels) as [key, label]}
					<button 
						class="preset-btn"
						class:selected={selectedPreset === key}
						onclick={() => selectPreset(key as PresetType)}
					>
						{#if selectedPreset === key}
							<svg class="preset-check" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
						<span>{label}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.spending-breakdown-page {
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

	.page-title {
		flex: 1;
		font-size: 20px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
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
		width: 40px;
		height: 40px;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		border-radius: 8px;
		transition: all 0.2s;
	}

	.header-btn:hover {
		background-color: var(--color-bg-secondary);
		color: var(--color-text-primary);
	}

	.header-btn svg {
		width: 20px;
		height: 20px;
	}

	/* Tabs */
	.tabs {
		display: flex;
		margin: 16px;
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		padding: 4px;
	}

	.tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 16px;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 14px;
		font-weight: 500;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.tab.active {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.tab-check {
		width: 16px;
		height: 16px;
	}

	/* Content */
	.spending-content {
		padding: 0 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* Cards */
	.spending-card,
	.categories-card {
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		padding: 20px;
	}

	/* Month Selector */
	.month-selector {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 8px 16px;
		margin: 0 auto 20px;
		background-color: var(--color-bg-tertiary);
		border: none;
		border-radius: 20px;
		color: var(--color-primary);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.month-selector:hover {
		background-color: var(--color-bg-primary);
	}

	.month-selector svg {
		width: 16px;
		height: 16px;
	}

	/* Total Spending */
	.total-spending {
		text-align: center;
		margin-bottom: 20px;
	}

	.total-label {
		display: block;
		color: var(--color-text-secondary);
		font-size: 14px;
		margin-bottom: 4px;
	}

	.total-amount {
		font-size: 36px;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	/* Progress Bar */
	.progress-bar {
		display: flex;
		height: 24px;
		border-radius: 12px;
		overflow: hidden;
		background-color: var(--color-bg-tertiary);
	}

	.progress-segment {
		height: 100%;
		min-width: 4px;
		transition: width 0.3s ease;
	}

	.progress-segment.empty {
		background-color: var(--color-bg-tertiary);
	}

	/* Categories */
	.categories-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 16px;
	}

	.categories-list {
		display: flex;
		flex-direction: column;
	}

	.category-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 0;
		border-bottom: 1px solid var(--color-border);
		background: none;
		border-left: none;
		border-right: none;
		border-top: none;
		width: 100%;
		cursor: pointer;
		transition: background-color 0.2s;
		text-align: left;
	}

	.category-row:hover {
		background-color: var(--color-bg-tertiary);
		margin: 0 -20px;
		padding: 16px 20px;
		width: calc(100% + 40px);
	}

	.category-row:last-child {
		border-bottom: none;
	}

	.category-info {
		flex: 1;
		min-width: 0;
	}

	.category-name {
		display: block;
		font-size: 15px;
		font-weight: 500;
		color: var(--color-text-primary);
		margin-bottom: 8px;
	}

	.category-progress {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.category-bar {
		height: 8px;
		border-radius: 4px;
		min-width: 4px;
		transition: width 0.3s ease;
	}

	.category-percent {
		font-size: 13px;
		color: var(--color-text-secondary);
		min-width: 35px;
	}

	.category-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.category-amount {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text-primary);
		text-align: right;
	}

	.category-chevron {
		width: 16px;
		height: 16px;
		color: var(--color-text-muted);
	}

	/* Month Picker Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 100;
	}

	.month-picker-modal {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		padding: 20px;
		z-index: 101;
		width: calc(100% - 48px);
		max-width: 320px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
	}

	.month-picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
	}

	.year-nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		background-color: var(--color-bg-tertiary);
		border-radius: 50%;
		color: var(--color-text-primary);
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.year-nav-btn:hover {
		background-color: var(--color-primary);
	}

	.year-nav-btn svg {
		width: 20px;
		height: 20px;
	}

	.year-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.months-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.month-btn {
		padding: 14px 8px;
		border: none;
		background-color: var(--color-bg-tertiary);
		border-radius: 10px;
		color: var(--color-text-primary);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.month-btn:hover:not(:disabled) {
		background-color: var(--color-primary);
		color: white;
	}

	.month-btn.selected {
		background-color: var(--color-primary);
		color: white;
	}

	.month-btn.disabled,
	.month-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Preset Picker Modal */
	.preset-picker-modal {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		padding: 12px;
		z-index: 101;
		width: calc(100% - 48px);
		max-width: 320px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
	}

	.preset-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.preset-btn {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 14px 16px;
		border: none;
		background-color: transparent;
		border-radius: 10px;
		color: var(--color-text-primary);
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.preset-btn:hover {
		background-color: var(--color-bg-tertiary);
	}

	.preset-btn.selected {
		background-color: var(--color-bg-tertiary);
		color: var(--color-primary);
	}

	.preset-check {
		width: 20px;
		height: 20px;
		color: var(--color-primary);
	}

	/* States */
	.loading-state,
	.empty-state {
		padding: 32px 16px;
		text-align: center;
		color: var(--color-text-secondary);
	}
</style>

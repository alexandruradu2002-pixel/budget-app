<script lang="ts">
	import { PageHeader, HeaderButton, LoadingState } from '$lib/components';
	import { formatCurrency, formatMonthYear } from '$lib/utils/format';
	
	// Reports/Reflect page
	let loading = $state(true);

	// Current month state
	let currentDate = $state(new Date());

	let displayMonth = $derived(formatMonthYear(currentDate));

	// Chart colors for categories
	const chartColors = [
		'--color-chart-1',
		'--color-chart-2', 
		'--color-chart-3',
		'--color-chart-4',
		'--color-chart-5'
	];

	// Spending data from API
	let spendingTotal = $state(0);
	let categorySpending: { id: number; name: string; amount: number; color: string; colorVar: string; percent: number }[] = $state([]);

	// Derived: calculate start and end of selected month (using local timezone)
	let monthRange = $derived(() => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		// Format dates manually to avoid UTC timezone issues
		const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
		const lastDay = new Date(year, month + 1, 0).getDate();
		const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
		return { startDate, endDate };
	});

	// Load spending data - from expense categories (those shown in Plan)
	async function loadSpendingData() {
		loading = true;
		try {
			const { startDate, endDate } = monthRange();
			
			// Get all expense categories (these are the ones shown in Plan)
			const categoriesResponse = await fetch('/api/categories?type=expense');
			if (!categoriesResponse.ok) throw new Error('Failed to load categories');
			const categoriesData = await categoriesResponse.json();
			
			// All expense categories (these appear in Plan)
			const expenseCategories = categoriesData.categories || [];
			const expenseCategoryIds = new Set(expenseCategories.map((cat: { id: number }) => cat.id));
			
			// Load transactions for the month
			const response = await fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=1000`);
			if (!response.ok) throw new Error('Failed to load transactions');
			
			const data = await response.json();
			const transactions = data.transactions || [];

			// Group by category and sum amounts (only expenses from expense categories)
			const categoryMap = new Map<number, { name: string; amount: number; color: string }>();
			
			for (const tx of transactions) {
				// Only count expenses (negative amounts) from expense categories
				if (tx.amount >= 0) continue;
				if (!tx.category_id || !expenseCategoryIds.has(tx.category_id)) continue;
				
				const categoryId = tx.category_id;
				const categoryName = tx.category_name || 'Uncategorized';
				const categoryColor = tx.category_color || '#6B7280';
				const amount = Math.abs(tx.amount);
				
				if (categoryMap.has(categoryId)) {
					categoryMap.get(categoryId)!.amount += amount;
				} else {
					categoryMap.set(categoryId, { name: categoryName, amount, color: categoryColor });
				}
			}

			// Convert to array and sort by amount descending
			const categoriesArray = Array.from(categoryMap.entries())
				.map(([id, data], index) => ({
					id: id,
					name: data.name,
					amount: data.amount,
					color: data.color,
					colorVar: chartColors[index % chartColors.length],
					percent: 0
				}))
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

	// Load data on mount and when month changes
	$effect(() => {
		const _ = monthRange(); // depend on monthRange
		loadSpendingData();
	});

	const netWorth = 15341.44;
	const assets = 15341.44;
	const debts = 0;
	
	// Net worth history for chart (last 6 months)
	const netWorthHistory = [
		{ month: 'Jul', value: 12000 },
		{ month: 'Aug', value: 14000 },
		{ month: 'Sep', value: 13500 },
		{ month: 'Oct', value: 12800 },
		{ month: 'Nov', value: 13200 },
		{ month: 'Dec', value: 15341 }
	];

	const ageOfMoney = 21;
	
	// Age of money history
	const ageHistory = [
		{ month: 'Jul', value: 18 },
		{ month: 'Aug', value: 20 },
		{ month: 'Sep', value: 22 },
		{ month: 'Oct', value: 19 },
		{ month: 'Nov', value: 20 },
		{ month: 'Dec', value: 21 }
	];
</script>

<div class="reports-page">
	<!-- Header -->
	<PageHeader title="Reflect">
		<HeaderButton label="More options">
			<svg fill="currentColor" viewBox="0 0 24 24">
				<circle cx="12" cy="5" r="1.5"/>
				<circle cx="12" cy="12" r="1.5"/>
				<circle cx="12" cy="19" r="1.5"/>
			</svg>
		</HeaderButton>
	</PageHeader>

	{#if loading}
		<LoadingState message="Loading spending data..." />
	{:else}
		<div class="reports-content">
			<!-- Spending Breakdown Card -->
			<div class="report-card">
				<div class="card-header">
					<div class="card-icon purple">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<span class="card-title">Spending Breakdown</span>
					
					<!-- Month Navigation -->
					<div class="month-nav">
						<button class="month-nav-btn" onclick={previousMonth} aria-label="Previous month">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						<button class="month-nav-btn" onclick={nextMonth} aria-label="Next month">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>
				</div>
				
				<div class="card-body">
					<span class="card-subtitle">{displayMonth}</span>
					<span class="card-amount">{formatCurrency(spendingTotal)}</span>
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

				<div class="categories-section">
					<div class="categories-header">
						<span>Categories</span>
						<span>Spent</span>
					</div>
					{#if categorySpending.length > 0}
						{#each categorySpending as category}
							<div class="category-item">
								<div class="category-info">
									<div class="category-dot" style="background-color: var({category.colorVar})"></div>
									<span class="category-name">{category.name}</span>
								</div>
								<span class="category-amount">{formatCurrency(category.amount)}</span>
							</div>
						{/each}
					{:else}
						<div class="empty-categories">
							<span>No spending this month</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Net Worth Card -->
			<a href="/reports/net-worth" class="report-card">
			<div class="card-header">
				<div class="card-icon blue">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
					</svg>
				</div>
				<span class="card-title">Net Worth</span>
				<svg class="card-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			</div>

			<div class="card-body">
				<span class="card-amount">{formatCurrency(netWorth)}</span>
			</div>

			<div class="net-worth-details">
				<div class="detail-row">
					<span class="detail-label success">Assets</span>
					<span class="detail-value">{formatCurrency(assets)}</span>
				</div>
				<div class="detail-row">
					<span class="detail-label danger">Debts</span>
					<span class="detail-value">{formatCurrency(debts)}</span>
				</div>
			</div>

			<div class="chart-container">
				<div class="chart-y-labels">
					<span>24Klei</span>
					<span>0Klei</span>
				</div>
				<div class="bar-chart">
					{#each netWorthHistory as item, i}
						<div class="bar-wrapper">
							<div 
								class="bar"
								class:current={i === netWorthHistory.length - 1}
								style="height: {(item.value / 24000) * 100}%"
							>
								<div class="bar-dot"></div>
							</div>
							<span class="bar-label" class:highlight={i === netWorthHistory.length - 1}>{item.month}</span>
						</div>
					{/each}
				</div>
			</div>
		</a>

		<!-- Age of Money Card -->
		<a href="/reports/age-of-money" class="report-card">
			<div class="card-header">
				<div class="card-icon green">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<circle cx="12" cy="12" r="10"/>
						<path d="M12 6v6l4 2"/>
					</svg>
				</div>
				<span class="card-title">Age Of Money</span>
				<svg class="card-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			</div>

			<div class="card-body">
				<span class="card-amount">{ageOfMoney} Days</span>
			</div>

			<div class="chart-container area-chart">
				<div class="chart-y-labels">
					<span>100</span>
					<span>0</span>
				</div>
				<div class="area-chart-inner">
					<svg class="area-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
						<defs>
							<linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
								<stop offset="0%" class="gradient-start" />
								<stop offset="100%" class="gradient-end" />
							</linearGradient>
						</defs>
						<path
							d="M0,{100 - ageHistory[0].value} {ageHistory.map((item, i) => {
								const x = (i / (ageHistory.length - 1)) * 100;
								const y = 100 - item.value;
								return `L${x},${y}`;
							}).join(' ')} L100,100 L0,100 Z"
							fill="url(#areaGradient)"
						/>
						<polyline
							class="area-line"
							fill="none"
							stroke-width="2"
							vector-effect="non-scaling-stroke"
							points="{ageHistory.map((item, i) => {
								const x = (i / (ageHistory.length - 1)) * 100;
								const y = 100 - item.value;
								return `${x},${y}`;
							}).join(' ')}"
						/>
					</svg>
					<div class="area-dots">
						{#each ageHistory as item, i}
							<div class="dot-wrapper" style="left: {(i / (ageHistory.length - 1)) * 100}%; bottom: {item.value}%">
								<div class="area-dot" class:current={i === ageHistory.length - 1}></div>
								{#if i === ageHistory.length - 1}
									<div class="dot-line"></div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
				<div class="area-labels">
					{#each ageHistory as item, i}
						<span class:highlight={i === ageHistory.length - 1}>{item.month}</span>
					{/each}
				</div>
			</div>
		</a>
	</div>
	{/if}
</div>

<style>
	.reports-page {
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - 70px);
		min-height: calc(100dvh - 70px);
		padding-bottom: 24px;
	}

	/* Content */
	.reports-content {
		padding: 0 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* Report Card */
	.report-card {
		display: block;
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		padding: 16px;
		text-decoration: none;
	}

	.report-card:active {
		background-color: var(--color-bg-tertiary);
	}

	/* Card Header */
	.card-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
	}

	.card-icon {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-icon.purple {
		background-color: var(--color-chart-1);
	}

	.card-icon.blue {
		background-color: var(--color-primary);
	}

	.card-icon.green {
		background-color: var(--color-success);
	}

	.card-icon svg {
		width: 16px;
		height: 16px;
		color: var(--color-text-primary);
	}

	.card-title {
		flex: 1;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-primary);
	}

	.card-chevron {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
	}

	/* Card Body */
	.card-body {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 12px;
	}

	.card-subtitle {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.card-amount {
		font-size: 28px;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	/* Progress Bar */
	.progress-bar {
		display: flex;
		height: 12px;
		border-radius: 6px;
		overflow: hidden;
		margin-bottom: 16px;
	}

	/* Progress Bar - Segmented by category */
	.progress-bar {
		display: flex;
		height: 12px;
		border-radius: 6px;
		overflow: hidden;
		margin-bottom: 16px;
		background-color: var(--color-bg-tertiary);
	}

	.progress-segment {
		height: 100%;
		min-width: 2px;
		transition: width 0.3s ease;
	}

	.progress-segment.empty {
		background-color: var(--color-bg-tertiary);
	}

	/* Month Navigation */
	.month-nav {
		display: flex;
		gap: 4px;
	}

	.month-nav-btn {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background-color: var(--color-bg-tertiary);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: var(--color-text-secondary);
		transition: background-color 0.2s, color 0.2s;
	}

	.month-nav-btn:hover {
		background-color: var(--color-primary);
		color: var(--color-text-primary);
	}

	.month-nav-btn svg {
		width: 16px;
		height: 16px;
	}

	/* Categories Section */
	.categories-section {
		display: flex;
		flex-direction: column;
	}

	.categories-header {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		color: var(--color-text-muted);
		margin-bottom: 8px;
	}

	.empty-categories {
		text-align: center;
		padding: 20px;
		color: var(--color-text-muted);
		font-size: 14px;
	}

	.category-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 0;
	}

	.category-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.category-dot {
		width: 6px;
		height: 20px;
		border-radius: 3px;
	}

	.category-name {
		font-size: 15px;
		color: var(--color-text-primary);
	}

	.category-amount {
		font-size: 15px;
		color: var(--color-text-primary);
	}

	/* Net Worth Details */
	.net-worth-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 16px;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
	}

	.detail-label {
		font-size: 13px;
	}

	.detail-label.success {
		color: var(--color-success);
	}

	.detail-label.danger {
		color: var(--color-danger);
	}

	.detail-value {
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	/* Chart Container */
	.chart-container {
		position: relative;
		padding-top: 8px;
	}

	.chart-y-labels {
		position: absolute;
		right: 0;
		top: 8px;
		bottom: 24px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		font-size: 11px;
		color: var(--color-text-muted);
	}

	/* Bar Chart */
	.bar-chart {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		height: 100px;
		padding-right: 48px;
		gap: 8px;
	}

	.bar-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
	}

	.bar {
		width: 24px;
		background-color: var(--color-chart-1);
		border-radius: 4px 4px 0 0;
		position: relative;
		margin-top: auto;
	}

	.bar.current {
		background: transparent;
		border: 2px dashed var(--color-primary);
	}

	.bar-dot {
		position: absolute;
		top: -6px;
		left: 50%;
		transform: translateX(-50%);
		width: 12px;
		height: 12px;
		background-color: var(--color-text-primary);
		border-radius: 50%;
		border: 2px solid var(--color-bg-secondary);
	}

	.bar-label {
		font-size: 11px;
		color: var(--color-text-muted);
		margin-top: 8px;
	}

	.bar-label.highlight {
		color: var(--color-primary);
	}

	/* Area Chart */
	.area-chart-inner {
		position: relative;
		height: 100px;
		margin-right: 48px;
	}

	.area-svg {
		width: 100%;
		height: 100%;
	}

	.area-dots {
		position: absolute;
		inset: 0;
	}

	.dot-wrapper {
		position: absolute;
		transform: translate(-50%, 50%);
	}

	.area-dot {
		width: 12px;
		height: 12px;
		background-color: var(--color-success);
		border-radius: 50%;
		border: 2px solid var(--color-bg-secondary);
	}

	.dot-line {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		width: 2px;
		height: 48px;
		border-left: 2px dashed var(--color-success);
	}

	.area-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 8px;
		margin-right: 48px;
		font-size: 11px;
		color: var(--color-text-muted);
	}

	.area-labels .highlight {
		color: var(--color-primary);
	}

	/* SVG Gradient and Line colors */
	.gradient-start {
		stop-color: var(--color-success);
		stop-opacity: 0.4;
	}

	.gradient-end {
		stop-color: var(--color-success);
		stop-opacity: 0.1;
	}

	.area-line {
		stroke: var(--color-success);
	}
</style>

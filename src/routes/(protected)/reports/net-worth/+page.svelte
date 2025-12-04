<script lang="ts">
	import { LoadingState } from '$lib/components';
	import { formatCurrency } from '$lib/utils/format';
	import { goto } from '$app/navigation';

	// Data state
	let loading = $state(true);
	let netWorthData = $state<{
		currentNetWorth: number;
		assets: number;
		debts: number;
		monthlyChange: number;
		monthlyChangePercent: number;
		history: { month: string; label: string; value: number }[];
	} | null>(null);

	// Chart shows 6 months at a time with smooth scroll
	const MONTHS_PER_VIEW = 6;
	
	// Scroll position for smooth horizontal scrolling
	let scrollContainer: HTMLElement | null = $state(null);
	let scrollOffset = $state(0);

	// Table filter
	type TableFilter = 'thisYear' | 'allDates';
	let tableFilter: TableFilter = $state('thisYear');

	// Bar width constant (same as in CSS)
	const BAR_WIDTH = 50;

	// Derived: date range display based on scroll position
	let dateRangeDisplay = $derived(() => {
		if (!netWorthData?.history || netWorthData.history.length === 0) return '';
		const history = netWorthData.history;
		const totalMonths = history.length;
		
		if (totalMonths <= MONTHS_PER_VIEW) {
			return `${history[0].label} - ${history[totalMonths - 1].label}`;
		}
		
		// Calculate visible range based on scroll offset and container width
		const containerWidth = scrollContainer?.clientWidth || (MONTHS_PER_VIEW * BAR_WIDTH);
		const visibleMonths = Math.floor(containerWidth / BAR_WIDTH);
		
		const firstVisibleIndex = Math.floor(scrollOffset / BAR_WIDTH);
		const lastVisibleIndex = Math.min(firstVisibleIndex + visibleMonths - 1, totalMonths - 1);
		
		const first = history[Math.max(0, firstVisibleIndex)];
		const last = history[Math.min(lastVisibleIndex, totalMonths - 1)];
		return `${first?.label || ''} - ${last?.label || ''}`;
	});

	// Derived: chart scaling (start from 0 for clarity)
	let chartScale = $derived(() => {
		if (!netWorthData?.history || netWorthData.history.length === 0) {
			return { min: 0, max: 20000, range: 20000 };
		}
		const values = netWorthData.history.map((m) => m.value);
		const maxVal = Math.max(...values);
		const minVal = Math.min(...values);
		
		// Always start from 0 for positive values
		let min = 0;
		
		// If there are negative values, include them
		if (minVal < 0) {
			// Round down to nearest thousand
			min = Math.floor(minVal / 1000) * 1000;
		}
		
		// Round max up to nearest nice number
		// Add 10% padding and round up
		const maxWithPadding = maxVal * 1.1;
		
		// Round to nice intervals: 5K, 10K, 15K, 20K, 25K, etc.
		const step = 5000;
		let max = Math.ceil(maxWithPadding / step) * step;
		
		// Ensure max is at least a bit more than maxVal
		if (max <= maxVal) {
			max += step;
		}
		
		return { min, max, range: max - min };
	});

	// Derived: filtered table data
	let filteredTableData = $derived(() => {
		if (!netWorthData?.history) return [];
		
		const currentYear = new Date().getFullYear();
		
		if (tableFilter === 'thisYear') {
			return netWorthData.history.filter(m => {
				const year = parseInt(m.month.split('-')[0]);
				return year === currentYear;
			});
		}
		
		return netWorthData.history;
	});

	// Load data
	async function loadNetWorthData() {
		loading = true;
		try {
			const response = await fetch('/api/reports/net-worth');
			if (!response.ok) throw new Error('Failed to load net worth data');
			netWorthData = await response.json();

			// Scroll to the end (latest months) after data loads
			setTimeout(() => {
				if (scrollContainer) {
					scrollContainer.scrollLeft = scrollContainer.scrollWidth;
					scrollOffset = scrollContainer.scrollLeft;
				}
			}, 100);
		} catch (err) {
			console.error('Error loading net worth:', err);
		} finally {
			loading = false;
		}
	}

	// Navigation functions
	function goBack() {
		goto('/reports');
	}

	function goLeft() {
		if (scrollContainer) {
			const scrollAmount = BAR_WIDTH * MONTHS_PER_VIEW;
			scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
		}
	}

	function goRight() {
		if (scrollContainer) {
			const scrollAmount = BAR_WIDTH * MONTHS_PER_VIEW;
			scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
		}
	}

	// Handle scroll event
	function handleScroll(e: Event) {
		const target = e.target as HTMLElement;
		scrollOffset = target.scrollLeft;
	}

	// Calculate bar height percentage
	function getBarHeight(value: number): number {
		const scale = chartScale();
		if (scale.range === 0) return 50;
		return ((value - scale.min) / scale.range) * 100;
	}

	// Format Y-axis labels
	function formatAxisValue(value: number): string {
		if (Math.abs(value) >= 1000) {
			return `${(value / 1000).toFixed(0)}K`;
		}
		return value.toString();
	}

	// Generate Y-axis labels (5 labels from max to min)
	let yAxisLabels = $derived(() => {
		const scale = chartScale();
		const labels: number[] = [];
		const numLabels = 5;
		const step = scale.range / (numLabels - 1);
		
		for (let i = 0; i < numLabels; i++) {
			const value = scale.max - (step * i);
			labels.push(Math.round(value));
		}
		return labels;
	});

	// Load on mount
	$effect(() => {
		loadNetWorthData();
	});
</script>

<div class="net-worth-page">
	<!-- Header -->
	<header class="page-header">
		<button class="back-btn" onclick={goBack} aria-label="Go back">
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<h1 class="page-title">Net Worth</h1>
		<div class="header-spacer"></div>
	</header>

	{#if loading}
		<LoadingState message="Loading net worth data..." />
	{:else if netWorthData}
		<div class="page-content">
			<!-- Summary Section -->
			<div class="summary-section">
				<div class="net-worth-value">
					<span class="label">Net Worth</span>
					<span class="value">{formatCurrency(netWorthData.currentNetWorth)}</span>
				</div>

				<div class="summary-row">
					<div class="summary-item">
						<span class="item-dot assets"></span>
						<span class="item-label">Assets</span>
						<span class="item-value">{formatCurrency(netWorthData.assets)}</span>
					</div>
					<div class="summary-item">
						<span class="item-dot debts"></span>
						<span class="item-label">Debts</span>
						<span class="item-value">{formatCurrency(-netWorthData.debts)}</span>
					</div>
					<div class="summary-item">
						<span class="item-label">Change in Net Worth</span>
						<span class="item-value change" class:negative={netWorthData.monthlyChange < 0}>
							{formatCurrency(netWorthData.monthlyChange)}
							<span class="change-arrow" class:down={netWorthData.monthlyChange < 0}>
								{netWorthData.monthlyChange >= 0 ? '↑' : '↓'}
							</span>
							<span class="change-percent">{Math.abs(netWorthData.monthlyChangePercent).toFixed(1)}%</span>
						</span>
					</div>
				</div>
			</div>

			<!-- Date Navigation -->
			<div class="date-nav">
				<button class="nav-btn" onclick={goLeft} aria-label="Previous months">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<span class="date-range">{dateRangeDisplay()}</span>
				<button class="nav-btn" onclick={goRight} aria-label="Next months">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>

			<!-- Chart -->
			<div class="chart-wrapper">
				<!-- Y-Axis Labels -->
				<div class="y-axis">
					{#each yAxisLabels() as label}
						<span class="y-label">{formatAxisValue(label)}lei</span>
					{/each}
				</div>

				<!-- Scrollable Chart Area -->
				<div 
					class="chart-scroll-container"
					bind:this={scrollContainer}
					onscroll={handleScroll}
				>
					<div 
						class="chart-content-scroll"
						style="width: {Math.max((netWorthData?.history?.length || 6) * 50, 100)}px"
					>
						<!-- Grid Lines (fixed position in background) -->
						<div class="grid-lines-scroll">
							{#each yAxisLabels() as _}
								<div class="grid-line"></div>
							{/each}
						</div>

						<!-- Bars with line connecting dots -->
						<div class="bars-scroll">
							{#each netWorthData?.history || [] as monthData, i}
								<div class="bar-column-scroll">
									<div class="bar-area">
										<div
											class="bar"
											style="height: {getBarHeight(monthData.value)}%"
										></div>
										<div
											class="line-dot"
											style="bottom: {getBarHeight(monthData.value)}%"
										></div>
										<!-- Line to next dot -->
										{#if i < (netWorthData?.history?.length || 0) - 1}
											{@const nextValue = netWorthData?.history?.[i + 1]?.value || 0}
											{@const currentHeight = getBarHeight(monthData.value)}
											{@const nextHeight = getBarHeight(nextValue)}
											<svg class="connecting-line" viewBox="0 0 50 100" preserveAspectRatio="none">
												<line
													x1="25"
													y1={100 - currentHeight}
													x2="75"
													y2={100 - nextHeight}
													stroke="var(--color-primary)"
													stroke-width="2"
													vector-effect="non-scaling-stroke"
												/>
											</svg>
										{/if}
									</div>
									<span class="bar-label">{monthData.label.split(' ')[0]}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<!-- Table Filter -->
			<div class="table-filter">
				<button 
					class="filter-btn" 
					class:active={tableFilter === 'thisYear'}
					onclick={() => tableFilter = 'thisYear'}
				>
					This Year
				</button>
				<button 
					class="filter-btn" 
					class:active={tableFilter === 'allDates'}
					onclick={() => tableFilter = 'allDates'}
				>
					All Dates
				</button>
			</div>

			<!-- Monthly Table -->
			<div class="monthly-table">
				<div class="table-header">
					<span>Month</span>
					<span>Net Worth</span>
					<span>Monthly Change</span>
				</div>
				{#each [...filteredTableData()].reverse() as monthData, i}
					{@const allHistory = [...filteredTableData()].reverse()}
					{@const prevValue = i < allHistory.length - 1 
						? allHistory[i + 1]?.value 
						: monthData.value}
					{@const change = monthData.value - (prevValue || monthData.value)}
					{@const changePercent = prevValue ? (change / Math.abs(prevValue)) * 100 : 0}
					<div class="table-row">
						<span class="month-name">{monthData.label}</span>
						<span class="month-value">{formatCurrency(monthData.value)}</span>
						<span class="month-change" class:negative={change < 0}>
							{change >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(change))} ({Math.abs(changePercent).toFixed(1)}%)
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.net-worth-page {
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - 70px);
		min-height: calc(100dvh - 70px);
		padding-bottom: 24px;
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

	.back-btn {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--color-text-primary);
		cursor: pointer;
		border-radius: 50%;
		margin-left: -8px;
	}

	.back-btn:active {
		background-color: var(--color-bg-tertiary);
	}

	.back-btn svg {
		width: 24px;
		height: 24px;
	}

	.page-title {
		font-size: 20px;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.header-spacer {
		width: 40px;
	}

	.page-content {
		padding: 0 16px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* Summary Section */
	.summary-section {
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		padding: 20px;
	}

	.net-worth-value {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 16px;
	}

	.net-worth-value .label {
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.net-worth-value .value {
		font-size: 32px;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.summary-row {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.summary-item {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.item-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.item-dot.assets {
		background-color: var(--color-success);
	}

	.item-dot.debts {
		background-color: var(--color-danger);
	}

	.item-label {
		flex: 1;
		font-size: 14px;
		color: var(--color-text-secondary);
	}

	.item-value {
		font-size: 14px;
		color: var(--color-text-primary);
	}

	.item-value.change {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--color-success);
	}

	.item-value.change.negative {
		color: var(--color-danger);
	}

	.change-arrow {
		font-size: 12px;
	}

	.change-percent {
		font-size: 12px;
		opacity: 0.8;
	}

	/* Date Navigation */
	.date-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
	}

	.nav-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background-color: var(--color-bg-secondary);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-primary);
		cursor: pointer;
		transition: all 0.2s;
	}

	.nav-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.nav-btn:not(:disabled):active {
		background-color: var(--color-bg-tertiary);
	}

	.nav-btn svg {
		width: 20px;
		height: 20px;
	}

	.date-range {
		font-size: 16px;
		font-weight: 500;
		color: var(--color-text-primary);
		min-width: 140px;
		text-align: center;
	}

	/* Chart */
	.chart-wrapper {
		display: flex;
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		padding: 20px 0 16px 8px;
		min-height: 280px;
		overflow: hidden;
	}

	.y-axis {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding-right: 8px;
		padding-bottom: 28px; /* Space for bar labels */
		min-width: 55px;
		flex-shrink: 0;
	}

	.y-label {
		font-size: 10px;
		color: var(--color-text-muted);
		text-align: right;
	}

	.chart-scroll-container {
		flex: 1;
		overflow-x: auto;
		overflow-y: hidden;
		-webkit-overflow-scrolling: touch;
		scroll-behavior: smooth;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.chart-scroll-container::-webkit-scrollbar {
		display: none;
	}

	.chart-content-scroll {
		height: 100%;
		position: relative;
		min-width: 100%;
		display: flex;
		flex-direction: column;
	}

	.grid-lines-scroll {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 28px; /* Same as bar label space */
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		pointer-events: none;
	}

	.grid-line {
		height: 1px;
		background-color: var(--color-border);
		opacity: 0.3;
	}

	.bars-scroll {
		display: flex;
		flex: 1;
		position: relative;
	}

	.bar-column-scroll {
		width: 50px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
		position: relative;
	}

	.bar-area {
		flex: 1;
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		position: relative;
		margin-bottom: 28px; /* Space for labels, aligned with y-axis */
	}

	.bar {
		width: 32px;
		background: linear-gradient(
			180deg,
			var(--color-primary) 0%,
			rgba(59, 130, 246, 0.6) 100%
		);
		border-radius: 4px 4px 0 0;
		min-height: 4px;
	}

	.line-dot {
		position: absolute;
		left: 50%;
		transform: translate(-50%, 50%);
		width: 10px;
		height: 10px;
		background-color: var(--color-primary);
		border: 2px solid var(--color-bg-secondary);
		border-radius: 50%;
		z-index: 3;
	}

	.connecting-line {
		position: absolute;
		left: 0;
		top: 0;
		width: 50px;
		height: 100%;
		z-index: 2;
		pointer-events: none;
		overflow: visible;
	}

	.bar-label {
		position: absolute;
		bottom: 8px;
		font-size: 10px;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	/* Table Filter */
	.table-filter {
		display: flex;
		gap: 8px;
		padding: 0 4px;
	}

	.filter-btn {
		flex: 1;
		padding: 10px 16px;
		background-color: var(--color-bg-secondary);
		border: none;
		border-radius: 8px;
		font-size: 14px;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.2s;
	}

	.filter-btn.active {
		background-color: var(--color-primary);
		color: var(--color-text-primary);
	}

	.filter-btn:not(.active):active {
		background-color: var(--color-bg-tertiary);
	}

	/* Monthly Table */
	.monthly-table {
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		overflow: hidden;
	}

	.table-header {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		padding: 12px 16px;
		background-color: var(--color-bg-tertiary);
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.table-header span:last-child {
		text-align: right;
	}

	.table-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		padding: 14px 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.table-row:last-child {
		border-bottom: none;
	}

	.month-name {
		font-size: 14px;
		color: var(--color-text-primary);
	}

	.month-value {
		font-size: 14px;
		color: var(--color-text-primary);
	}

	.month-change {
		font-size: 13px;
		color: var(--color-success);
		text-align: right;
	}

	.month-change.negative {
		color: var(--color-danger);
	}
</style>

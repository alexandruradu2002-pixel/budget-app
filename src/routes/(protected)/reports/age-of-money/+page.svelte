<script lang="ts">
	import { LoadingState } from '$lib/components';
	import { goto } from '$app/navigation';

	// Data state
	let loading = $state(true);
	let ageOfMoney = $state<number | null>(null);
	let ageHistory = $state<{ date: string; label: string; value: number }[]>([]);

	// Filter preset
	type FilterPreset = '6months' | '1year' | 'all';
	let filterPreset: FilterPreset = $state('6months');

	// Derived: filtered history based on preset
	let filteredHistory = $derived(() => {
		if (!ageHistory.length) return [];
		
		const now = new Date();
		let cutoffDate: Date;
		
		switch (filterPreset) {
			case '6months':
				cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
				break;
			case '1year':
				cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
				break;
			case 'all':
			default:
				return ageHistory;
		}
		
		const cutoffStr = cutoffDate.toISOString().slice(0, 7);
		return ageHistory.filter(h => h.date >= cutoffStr);
	});

	// Chart scale - use nice round numbers
	let chartScale = $derived(() => {
		const history = filteredHistory();
		if (!history.length) return { min: 0, max: 100, range: 100 };
		
		const values = history.map(h => h.value);
		const maxVal = Math.max(...values);
		const minVal = Math.min(...values);
		
		// Round to nice intervals (multiples of 5 or 10)
		const dataRange = maxVal - minVal;
		let step = 5;
		if (dataRange > 50) step = 10;
		if (dataRange > 100) step = 20;
		if (dataRange > 200) step = 50;
		
		// Round min down and max up to step multiples, with padding
		const min = Math.max(0, Math.floor((minVal - step) / step) * step);
		const max = Math.ceil((maxVal + step) / step) * step;
		
		return { min, max, range: max - min };
	});

	// Calculate bar height percentage
	function getBarHeight(value: number): number {
		const scale = chartScale();
		if (scale.range === 0) return 50;
		return ((value - scale.min) / scale.range) * 100;
	}

	// Format Y-axis labels
	function formatAxisValue(value: number): string {
		return Math.round(value) + 'd';
	}

	// Generate Y-axis labels
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

	/**
	 * Calculate Age of Money
	 * 
	 * Age of Money is calculated using FIFO (First In, First Out) accounting:
	 * 1. Get all income transactions (money coming in)
	 * 2. Get all expense transactions (money going out)
	 * 3. For each expense, determine which income "bucket" funded it
	 * 4. Calculate the days between when that income was received and when it was spent
	 * 5. Average across recent expenses
	 */
	async function loadAgeOfMoney() {
		loading = true;
		try {
			// Get all transactions, sorted by date ascending
			const response = await fetch('/api/transactions?limit=10000');
			if (!response.ok) throw new Error('Failed to load transactions');
			
			const data = await response.json();
			const transactions = data.transactions || [];
			
			// Sort by date ascending (oldest first) for FIFO
			const sortedTransactions = [...transactions].sort((a, b) => 
				new Date(a.date).getTime() - new Date(b.date).getTime()
			);
			
			// Separate income and expenses
			// Income: positive amounts
			// Expenses: negative amounts
			interface IncomeBucket {
				date: string;
				amount: number;
				remaining: number;
			}
			
			const incomeBuckets: IncomeBucket[] = [];
			const expenseAges: { date: string; age: number; amount: number }[] = [];
			
			for (const tx of sortedTransactions) {
				const txDate = new Date(tx.date);
				
				if (tx.amount > 0) {
					// Income - add to buckets
					incomeBuckets.push({
						date: tx.date,
						amount: tx.amount,
						remaining: tx.amount
					});
				} else if (tx.amount < 0) {
					// Expense - consume from oldest income buckets (FIFO)
					let expenseAmount = Math.abs(tx.amount);
					let totalWeightedAge = 0;
					let totalConsumed = 0;
					
					for (const bucket of incomeBuckets) {
						if (bucket.remaining <= 0) continue;
						if (expenseAmount <= 0) break;
						
						const consumeAmount = Math.min(bucket.remaining, expenseAmount);
						bucket.remaining -= consumeAmount;
						expenseAmount -= consumeAmount;
						
						// Calculate age: days between income date and expense date
						const incomeDate = new Date(bucket.date);
						const ageInDays = Math.floor((txDate.getTime() - incomeDate.getTime()) / (1000 * 60 * 60 * 24));
						
						// Weight by amount consumed
						totalWeightedAge += ageInDays * consumeAmount;
						totalConsumed += consumeAmount;
					}
					
					if (totalConsumed > 0) {
						const avgAge = totalWeightedAge / totalConsumed;
						expenseAges.push({
							date: tx.date,
							age: Math.max(0, avgAge), // Can't be negative
							amount: Math.abs(tx.amount)
						});
					}
				}
			}
			
			// Calculate current Age of Money (average of last 10 expenses)
			const recentExpenses = expenseAges.slice(-10);
			if (recentExpenses.length > 0) {
				const totalWeightedAge = recentExpenses.reduce((sum, e) => sum + e.age * e.amount, 0);
				const totalAmount = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
				ageOfMoney = Math.round(totalWeightedAge / totalAmount);
			} else {
				ageOfMoney = null;
			}
			
			// Build monthly history
			// Group expenses by month and calculate average age for each month
			const monthlyAges = new Map<string, { totalWeightedAge: number; totalAmount: number }>();
			
			for (const expense of expenseAges) {
				const month = expense.date.slice(0, 7); // YYYY-MM
				const existing = monthlyAges.get(month) || { totalWeightedAge: 0, totalAmount: 0 };
				existing.totalWeightedAge += expense.age * expense.amount;
				existing.totalAmount += expense.amount;
				monthlyAges.set(month, existing);
			}
			
			// Convert to array and sort
			const historyData: { date: string; label: string; value: number }[] = [];
			const sortedMonths = Array.from(monthlyAges.keys()).sort();
			
			for (const month of sortedMonths) {
				const data = monthlyAges.get(month)!;
				if (data.totalAmount > 0) {
					const avgAge = Math.round(data.totalWeightedAge / data.totalAmount);
					const [year, monthNum] = month.split('-');
					const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
					historyData.push({
						date: month,
						label: `${monthNames[parseInt(monthNum) - 1]} ${year}`,
						value: avgAge
					});
				}
			}
			
			ageHistory = historyData;
			
		} catch (err) {
			console.error('Error calculating Age of Money:', err);
		} finally {
			loading = false;
		}
	}

	// Navigation
	function goBack() {
		goto('/reports');
	}

	// Load on mount
	$effect(() => {
		loadAgeOfMoney();
	});
</script>

<div class="age-of-money-page">
	<!-- Header -->
	<header class="page-header">
		<button class="back-btn" onclick={goBack} aria-label="Go back">
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<h1 class="page-title">Age of Money</h1>
		<div class="header-spacer"></div>
	</header>

	{#if loading}
		<LoadingState message="Calculating Age of Money..." />
	{:else}
		<div class="page-content">
			<!-- Current Age Display -->
			<div class="current-age-section">
				<span class="current-label">Current</span>
				<span class="current-value">
					{#if ageOfMoney !== null}
						{ageOfMoney} days
					{:else}
						--
					{/if}
				</span>
			</div>

			<!-- Filter Presets -->
			<div class="filter-presets">
				<button 
					class="preset-btn" 
					class:active={filterPreset === '6months'}
					onclick={() => filterPreset = '6months'}
				>
					6 Months
				</button>
				<button 
					class="preset-btn" 
					class:active={filterPreset === '1year'}
					onclick={() => filterPreset = '1year'}
				>
					1 Year
				</button>
				<button 
					class="preset-btn" 
					class:active={filterPreset === 'all'}
					onclick={() => filterPreset = 'all'}
				>
					All Dates
				</button>
			</div>

			<!-- Chart -->
			{#if filteredHistory().length > 0}
				{@const history = filteredHistory()}
				{@const yLabels = yAxisLabels()}
				<div class="chart-wrapper">
					<!-- Y-Axis Labels -->
					<div class="y-axis">
						{#each yLabels as label}
							<span class="y-label">{formatAxisValue(label)}</span>
						{/each}
					</div>

					<!-- Chart Area -->
					<div class="chart-container">
						<!-- Grid Lines -->
						<div class="grid-lines">
							{#each yLabels as _}
								<div class="grid-line"></div>
							{/each}
						</div>

						<!-- Area Chart -->
						<div class="area-chart">
							<svg class="area-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
								<defs>
									<linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
										<stop offset="0%" class="gradient-start" />
										<stop offset="100%" class="gradient-end" />
									</linearGradient>
								</defs>
								<!-- Area fill -->
								<path
									d={(() => {
										const points = history.map((item, i) => {
											const x = history.length > 1 ? (i / (history.length - 1)) * 100 : 50;
											const y = 100 - getBarHeight(item.value);
											return { x, y };
										});
										if (points.length === 0) return '';
										let path = `M${points[0].x},${points[0].y}`;
										for (let i = 1; i < points.length; i++) {
											path += ` L${points[i].x},${points[i].y}`;
										}
										path += ` L${points[points.length - 1].x},100 L${points[0].x},100 Z`;
										return path;
									})()}
									fill="url(#areaGradient)"
								/>
								<!-- Line -->
								<polyline
									class="area-line"
									fill="none"
									stroke-width="2"
									vector-effect="non-scaling-stroke"
									points={history.map((item, i) => {
										const x = history.length > 1 ? (i / (history.length - 1)) * 100 : 50;
										const y = 100 - getBarHeight(item.value);
										return `${x},${y}`;
									}).join(' ')}
								/>
							</svg>

							<!-- Dots -->
							<div class="area-dots">
								{#each history as item, i}
									{@const x = history.length > 1 ? (i / (history.length - 1)) * 100 : 50}
									<div 
										class="dot-wrapper" 
										style="left: {x}%; bottom: {getBarHeight(item.value)}%"
									>
										<div class="area-dot" class:current={i === history.length - 1}></div>
										{#if i === history.length - 1}
											<div class="dot-line"></div>
										{/if}
									</div>
								{/each}
							</div>
						</div>

						<!-- X-Axis Labels -->
						<div class="x-axis">
							{#each history as item, i}
								<!-- Show fewer labels if too many -->
								{#if history.length <= 6 || i === 0 || i === history.length - 1 || i % Math.ceil(history.length / 6) === 0}
									<span 
										class="x-label" 
										class:highlight={i === history.length - 1}
										style="left: {history.length > 1 ? (i / (history.length - 1)) * 100 : 50}%"
									>
										{item.label.split(' ')[0]}
									</span>
								{/if}
							{/each}
						</div>
					</div>
				</div>
			{:else}
				<div class="no-data">
					<p>Not enough transaction data to calculate Age of Money.</p>
				</div>
			{/if}

			<!-- Explanation Section -->
			<div class="explanation-section">
				<h2 class="explanation-title">Understanding Age of Money</h2>
				<p class="explanation-text">
					Age of Money is how long, on average, money sits in your account(s) between earning and spending it.
				</p>
				<p class="explanation-text">
					Want to have more time to make decisions? Tired of shifting money around at the last minute? 
					Use Age of Money to help you gauge the time between earning and spending.
				</p>
				<p class="explanation-text muted">
					A higher Age of Money typically indicates better financial stability, as it means you're 
					spending money you earned further in the past rather than living paycheck to paycheck.
				</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.age-of-money-page {
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

	/* Current Age Section */
	.current-age-section {
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		padding: 24px;
		text-align: center;
	}

	.current-label {
		display: block;
		font-size: 14px;
		color: var(--color-text-muted);
		margin-bottom: 8px;
	}

	.current-value {
		font-size: 36px;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	/* Filter Presets */
	.filter-presets {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	.preset-btn {
		padding: 8px 16px;
		border-radius: 20px;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.preset-btn:active {
		background-color: var(--color-bg-tertiary);
	}

	.preset-btn.active {
		background-color: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	/* Chart */
	.chart-wrapper {
		display: flex;
		gap: 8px;
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		padding: 20px 16px 20px 8px;
	}

	.y-axis {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-width: 36px;
		height: 176px; /* Match chart height: 200px - 24px for x-axis */
	}

	.y-label {
		font-size: 11px;
		color: var(--color-text-muted);
		text-align: right;
		line-height: 1;
	}

	.chart-container {
		flex: 1;
		position: relative;
		height: 200px;
	}

	.grid-lines {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 176px; /* Match y-axis height */
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.grid-line {
		height: 1px;
		background-color: var(--color-border);
		opacity: 0.3;
	}

	/* Area Chart */
	.area-chart {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 176px; /* Match grid height */
	}

	.area-svg {
		width: 100%;
		height: 100%;
	}

	.gradient-start {
		stop-color: var(--color-success);
		stop-opacity: 0.4;
	}

	.gradient-end {
		stop-color: var(--color-success);
		stop-opacity: 0.05;
	}

	.area-line {
		stroke: var(--color-success);
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
		width: 10px;
		height: 10px;
		background-color: var(--color-success);
		border-radius: 50%;
		border: 2px solid var(--color-bg-secondary);
	}

	.area-dot.current {
		width: 12px;
		height: 12px;
	}

	.dot-line {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		width: 2px;
		height: 24px;
		border-left: 2px dashed var(--color-success);
	}

	/* X-Axis */
	.x-axis {
		position: absolute;
		top: 176px; /* Below the chart area */
		left: 0;
		right: 0;
		height: 24px;
		display: flex;
		align-items: flex-start;
		padding-top: 8px;
	}

	.x-label {
		position: absolute;
		transform: translateX(-50%);
		font-size: 11px;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.x-label.highlight {
		color: var(--color-primary);
		font-weight: 600;
	}

	/* No Data */
	.no-data {
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		padding: 40px 24px;
		text-align: center;
	}

	.no-data p {
		color: var(--color-text-muted);
		margin: 0;
	}

	/* Explanation Section */
	.explanation-section {
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		padding: 20px;
	}

	.explanation-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 12px 0;
	}

	.explanation-text {
		font-size: 14px;
		color: var(--color-text-secondary);
		line-height: 1.6;
		margin: 0 0 12px 0;
	}

	.explanation-text:last-child {
		margin-bottom: 0;
	}

	.explanation-text.muted {
		color: var(--color-text-muted);
		font-size: 13px;
	}
</style>

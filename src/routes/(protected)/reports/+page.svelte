<script lang="ts">
	import { PageHeader, HeaderButton, WorkInProgress } from '$lib/components';
	import { formatCurrency, formatMonthYear } from '$lib/utils/format';
	
	// Reports/Reflect page
	let loading = $state(false);

	// Current month state
	let currentDate = $state(new Date());

	let displayMonth = $derived(formatMonthYear(currentDate));

	// Mock data
	const spendingTotal = 349.00;
	const spendingBudget = 500;
	const spendingPercent = (spendingTotal / spendingBudget) * 100;
	
	const topCategories = [
		{ name: 'Restaurant/Cantina', amount: 300.00, color: '#6366F1' },
		{ name: 'SuperMarchet', amount: 49.00, color: '#22C55E' }
	];

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

<WorkInProgress />

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

	<div class="reports-content">
		<!-- Spending Breakdown Card -->
		<a href="/reports/spending" class="report-card">
			<div class="card-header">
				<div class="card-icon purple">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<span class="card-title">Spending Breakdown</span>
				<svg class="card-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			</div>
			
			<div class="card-body">
				<span class="card-subtitle">{displayMonth}</span>
				<span class="card-amount">{formatCurrency(spendingTotal)}</span>
			</div>

			<div class="progress-bar">
				<div class="progress-fill purple" style="width: {spendingPercent}%"></div>
				<div class="progress-fill green" style="width: {100 - spendingPercent}%"></div>
			</div>

			<div class="categories-section">
				<div class="categories-header">
					<span>Top Categories</span>
					<span>Spent</span>
				</div>
				{#each topCategories as category}
					<div class="category-item">
						<div class="category-info">
							<div class="category-dot" style="background-color: {category.color}"></div>
							<span class="category-name">{category.name}</span>
						</div>
						<span class="category-amount">{formatCurrency(category.amount)}</span>
					</div>
				{/each}
			</div>
		</a>

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
								<stop offset="0%" style="stop-color:#22C55E;stop-opacity:0.4" />
								<stop offset="100%" style="stop-color:#22C55E;stop-opacity:0.1" />
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
							fill="none"
							stroke="#22C55E"
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
		background-color: #6366F1;
	}

	.card-icon.blue {
		background-color: var(--color-primary);
	}

	.card-icon.green {
		background-color: #22C55E;
	}

	.card-icon svg {
		width: 16px;
		height: 16px;
		color: white;
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

	.progress-fill {
		height: 100%;
	}

	.progress-fill.purple {
		background-color: #6366F1;
	}

	.progress-fill.green {
		background-color: #22C55E;
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
		background-color: #6366F1;
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
		background-color: white;
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
		background-color: #22C55E;
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
		border-left: 2px dashed #22C55E;
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
</style>

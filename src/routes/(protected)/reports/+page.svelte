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

	// Load data on mount and when month changes
	$effect(() => {
		const _ = monthRange(); // depend on monthRange
		loadSpendingData();
	});
</script>

<div class="reports-page">
	<!-- Header -->
	<PageHeader title="Reflect" />

	{#if loading}
		<LoadingState message="Loading spending data..." />
	{:else}
		<div class="reports-content">
			<a href="/reports/spending" class="report-card simple-card">
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
			</a>

			<!-- Net Worth Card -->
			<a href="/reports/net-worth" class="report-card simple-card">
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
			</a>

		<!-- Age of Money Card -->
		<a href="/reports/age-of-money" class="report-card simple-card">
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

	.simple-card .card-header {
		margin-bottom: 0;
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
</style>

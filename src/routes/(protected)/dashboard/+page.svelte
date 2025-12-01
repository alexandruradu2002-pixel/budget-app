<script lang="ts">
	import { LoadingState, PageHeader, HeaderButton } from '$lib/components';
	import { formatCurrency, formatMonthYear } from '$lib/utils/format';

	let stats = $state({
		totalBalance: 0,
		monthlyIncome: 0,
		monthlyExpenses: 0,
		accountsCount: 0
	});

	let loading = $state(true);
	let currentDate = $state(new Date());
	let displayMonth = $derived(formatMonthYear(currentDate));

	async function loadDashboard() {
		try {
			const response = await fetch('/api/dashboard', { credentials: 'include' });
			if (response.ok) {
				stats = await response.json();
			}
		} catch (error) {
			console.error('Failed to load dashboard:', error);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		loadDashboard();
	});
</script>

<div class="dashboard-page">
	<PageHeader title="Dashboard">
		<HeaderButton label="Notifications">
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
			</svg>
		</HeaderButton>
		<HeaderButton label="More options">
			<svg fill="currentColor" viewBox="0 0 24 24">
				<circle cx="12" cy="5" r="1.5"/>
				<circle cx="12" cy="12" r="1.5"/>
				<circle cx="12" cy="19" r="1.5"/>
			</svg>
		</HeaderButton>
	</PageHeader>

	{#if loading}
		<LoadingState message="Loading dashboard..." />
	{:else}
		<!-- Balance Overview Card -->
		<div class="balance-card">
			<div class="balance-header">
				<span class="balance-label">Total Balance</span>
				<span class="balance-month">{displayMonth}</span>
			</div>
			<div class="balance-amount">{formatCurrency(stats.totalBalance)}</div>
			<div class="balance-stats">
				<div class="stat-item income">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
					</svg>
					<div class="stat-content">
						<span class="stat-label">Income</span>
						<span class="stat-value">+{formatCurrency(stats.monthlyIncome)}</span>
					</div>
				</div>
				<div class="stat-item expense">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
					</svg>
					<div class="stat-content">
						<span class="stat-label">Expenses</span>
						<span class="stat-value">-{formatCurrency(stats.monthlyExpenses)}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Stats Grid -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-card-icon accounts">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
					</svg>
				</div>
				<div class="stat-card-content">
					<span class="stat-card-value">{stats.accountsCount}</span>
					<span class="stat-card-label">Active Accounts</span>
				</div>
			</div>

			<a href="/plan" class="stat-card clickable">
				<div class="stat-card-icon budget">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
					</svg>
				</div>
				<div class="stat-card-content">
					<span class="stat-card-label">View Budget</span>
					<span class="stat-card-subtitle">Plan your spending</span>
				</div>
				<svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</a>
		</div>

		<!-- Quick Actions -->
		<section class="quick-actions">
			<h2 class="section-title">Quick Actions</h2>
			<div class="actions-grid">
				<a href="/spending" class="action-item">
					<div class="action-icon">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
					</div>
					<span class="action-label">Add Transaction</span>
				</a>
				<a href="/accounts" class="action-item">
					<div class="action-icon">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
						</svg>
					</div>
					<span class="action-label">Accounts</span>
				</a>
				<a href="/plan" class="action-item">
					<div class="action-icon">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
						</svg>
					</div>
					<span class="action-label">Budget</span>
				</a>
				<a href="/reports" class="action-item">
					<div class="action-icon">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
					</div>
					<span class="action-label">Reports</span>
				</a>
			</div>
		</section>
	{/if}
</div>

<style>
	.dashboard-page {
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - 70px);
		min-height: calc(100dvh - 70px);
		padding-bottom: 24px;
	}

	/* Balance Card */
	.balance-card {
		margin: 0 16px 16px;
		padding: 20px;
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
	}

	.balance-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.balance-label {
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.balance-month {
		font-size: 13px;
		color: var(--color-text-muted);
		padding: 4px 10px;
		background-color: var(--color-bg-tertiary);
		border-radius: 8px;
	}

	.balance-amount {
		font-size: 32px;
		font-weight: 700;
		color: var(--color-text-primary);
		margin-bottom: 20px;
	}

	.balance-stats {
		display: flex;
		gap: 16px;
	}

	.stat-item {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px;
		background-color: var(--color-bg-tertiary);
		border-radius: 12px;
	}

	.stat-item svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.stat-item.income svg {
		color: var(--color-success);
	}

	.stat-item.expense svg {
		color: var(--color-danger);
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.stat-label {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.stat-value {
		font-size: 14px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.stat-item.income .stat-value {
		color: var(--color-success);
	}

	.stat-item.expense .stat-value {
		color: var(--color-danger);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		padding: 0 16px;
		margin-bottom: 24px;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		text-decoration: none;
	}

	.stat-card.clickable:active {
		background-color: var(--color-bg-tertiary);
	}

	.stat-card-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		flex-shrink: 0;
	}

	.stat-card-icon.accounts {
		background-color: rgba(59, 130, 246, 0.15);
		color: var(--color-primary);
	}

	.stat-card-icon.budget {
		background-color: rgba(16, 185, 129, 0.15);
		color: var(--color-success);
	}

	.stat-card-icon svg {
		width: 22px;
		height: 22px;
	}

	.stat-card-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.stat-card-value {
		font-size: 24px;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.stat-card-label {
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	.stat-card-subtitle {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.chevron-icon {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	/* Quick Actions */
	.quick-actions {
		padding: 0 16px;
	}

	.section-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 12px;
	}

	.actions-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
	}

	.action-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 16px 8px;
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		text-decoration: none;
		transition: background-color 0.2s;
	}

	.action-item:active {
		background-color: var(--color-bg-tertiary);
	}

	.action-icon {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--color-bg-tertiary);
		border-radius: 12px;
		color: var(--color-primary);
	}

	.action-icon svg {
		width: 22px;
		height: 22px;
	}

	.action-label {
		font-size: 12px;
		color: var(--color-text-secondary);
		text-align: center;
	}

	/* Responsive */
	@media (max-width: 400px) {
		.actions-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

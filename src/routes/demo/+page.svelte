<script lang="ts">
	import { formatCurrency, formatDateWithDay } from '$lib/utils/format';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	let currentView = $state<'home' | 'plan' | 'spending' | 'accounts' | 'reflect'>('home');
	let showNotice = $state(true);

	// Navigation items
	const navItems = [
		{ view: 'home' as const, label: 'Home', icon: 'home' },
		{ view: 'plan' as const, label: 'Plan', icon: 'plan' },
		{ view: 'spending' as const, label: 'Spending', icon: 'spending' },
		{ view: 'accounts' as const, label: 'Accounts', icon: 'accounts' },
		{ view: 'reflect' as const, label: 'Reflect', icon: 'reflect' }
	];

	// Group accounts by type from server data
	const accountTypeLabels: Record<string, { name: string; icon: string }> = {
		checking: { name: 'CHECKING', icon: '💵' },
		savings: { name: 'SAVINGS', icon: '💰' },
		credit_card: { name: 'CREDIT CARDS', icon: '💳' },
		cash: { name: 'CASH', icon: '💵' },
		investment: { name: 'INVESTMENTS', icon: '📈' }
	};

	let accountGroups = $derived(() => {
		const groups: Record<string, { name: string; icon: string; total: number; accounts: typeof data.accounts }> = {};
		
		for (const account of data.accounts) {
			const type = account.type || 'checking';
			if (!groups[type]) {
				const label = accountTypeLabels[type] || { name: type.toUpperCase(), icon: '💰' };
				groups[type] = { ...label, total: 0, accounts: [] };
			}
			groups[type].accounts.push(account);
			groups[type].total += account.balance;
		}
		
		return Object.values(groups);
	});

	// Group transactions by date from server data
	let transactionGroups = $derived(() => {
		const groups: Record<string, { date: string; dateFormatted: string; transactions: typeof data.transactions }> = {};
		
		for (const tx of data.transactions.slice(0, 30)) {
			const date = tx.date;
			if (!groups[date]) {
				groups[date] = {
					date,
					dateFormatted: formatDateWithDay(date),
					transactions: []
				};
			}
			groups[date].transactions.push(tx);
		}
		
		return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
	});

	// Total balance
	let totalBalance = $derived(data.accounts.reduce((sum, acc) => sum + acc.balance, 0));

	// Budget groups from server data
	let budgetGroups = $derived(() => {
		// Group budgets into categories
		const grouped = [
			{
				name: 'Monthly Bills',
				expanded: true,
				categories: data.budgets.slice(0, 4)
			},
			{
				name: 'Living Expenses',
				expanded: true,
				categories: data.budgets.slice(4, 8)
			}
		];
		return grouped;
	});
</script>

<svelte:head>
	<title>Demo - Budget App</title>
</svelte:head>

<!-- Demo Notice Banner -->
{#if showNotice}
<div class="demo-banner">
	<span class="demo-banner-text">
		🎭 <strong>Demo Mode</strong> - This demo uses fictional data. 
		<a href="https://github.com/alexandruradu2002-pixel/budget_app" target="_blank" class="demo-banner-link">Install your own version</a>
	</span>
	<button onclick={() => showNotice = false} class="demo-banner-close" aria-label="Close demo notice">✕</button>
</div>
{/if}

<div class="app-container" class:with-banner={showNotice}>
	<!-- DASHBOARD/HOME VIEW -->
	{#if currentView === 'home'}
	<header class="page-header-simple">
		<h1 class="page-title">Dashboard</h1>
		<div class="header-actions">
			<button class="icon-btn" aria-label="Settings">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			</button>
		</div>
	</header>

	<main class="main-content">
		<!-- Stats Cards -->
		<div class="stats-grid">
			<div class="stat-card">
				<span class="stat-label">Total Balance</span>
				<span class="stat-value">{formatCurrency(data.stats.totalBalance, 'USD')}</span>
			</div>
			<div class="stat-card">
				<span class="stat-label">Monthly Income</span>
				<span class="stat-value success">{formatCurrency(data.stats.monthlyIncome, 'USD')}</span>
			</div>
			<div class="stat-card">
				<span class="stat-label">Monthly Expenses</span>
				<span class="stat-value danger">{formatCurrency(data.stats.monthlyExpenses, 'USD')}</span>
			</div>
			<div class="stat-card">
				<span class="stat-label">Savings Rate</span>
				<span class="stat-value">{data.stats.savingsRate}%</span>
			</div>
		</div>

		<!-- Spending by Category -->
		<div class="section">
			<h2 class="section-title">Spending by Category</h2>
			<div class="category-list">
				{#each data.spending.slice(0, 5) as category}
				<div class="category-item">
					<div class="category-info">
						<span class="category-color" style="background: {category.color}"></span>
						<span class="category-name">{category.name}</span>
					</div>
					<div class="category-stats">
						<span class="category-amount">{formatCurrency(category.amount, 'USD')}</span>
						<span class="category-percent">{category.percentage}%</span>
					</div>
				</div>
				{/each}
			</div>
		</div>

		<!-- Recent Transactions -->
		<div class="section">
			<h2 class="section-title">Recent Transactions</h2>
			<div class="tx-list">
				{#each data.transactions.slice(0, 5) as tx}
				<div class="tx-card">
					<div class="tx-main">
						<span class="tx-payee">{tx.payee}</span>
						<span class="tx-amount" class:income={tx.amount > 0} class:expense={tx.amount < 0}>
							{tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, 'USD')}
						</span>
					</div>
					<div class="tx-tags">
						{#if tx.category_name}
						<span class="tag category">{tx.category_name}</span>
						{/if}
						<span class="tag account">{tx.account_name}</span>
					</div>
				</div>
				{/each}
			</div>
		</div>
	</main>

	<!-- PLAN VIEW -->
	{:else if currentView === 'plan'}
	<header class="page-header-simple">
		<button class="month-selector" aria-label="Select month">
			<span>Jan 2026</span>
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="chevron-icon">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		<div class="header-actions">
			<button class="icon-btn" aria-label="Edit budget">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
				</svg>
			</button>
		</div>
	</header>

	<main class="main-content">
		<!-- Plan Summary -->
		<div class="plan-summary">
			<div class="plan-stat">
				<span class="plan-label">Budgeted</span>
				<span class="plan-value">{formatCurrency(data.budgets.reduce((s, b) => s + b.budgeted, 0), 'USD')}</span>
			</div>
			<div class="plan-stat">
				<span class="plan-label">Spent</span>
				<span class="plan-value warning">{formatCurrency(data.budgets.reduce((s, b) => s + b.spent, 0), 'USD')}</span>
			</div>
		</div>

		<!-- Toggle -->
		<div class="plan-toggle">
			<button class="toggle-btn active" aria-label="Show budget">BUDGET</button>
			<button class="toggle-btn" aria-label="Show spent">SPENT</button>
		</div>

		<!-- Budget Groups -->
		<div class="budget-groups">
			{#each budgetGroups() as group}
			<div class="budget-group">
				<button class="group-header" aria-label="Toggle {group.name} category">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="expand-icon">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
					<span class="group-name">{group.name}</span>
				</button>
				<div class="group-items">
					{#each group.categories as cat}
					<div class="budget-row">
						<div class="budget-info">
							<span class="budget-name">{cat.category_name}</span>
							<div class="budget-bar">
								<div class="budget-bar-fill" style="width: {Math.min(cat.percentage, 100)}%; background: {cat.category_color}"></div>
							</div>
						</div>
						<div class="budget-amounts">
							<span class="budget-spent">{formatCurrency(cat.spent, 'USD')}</span>
							<span class="budget-target">of {formatCurrency(cat.budgeted, 'USD')}</span>
						</div>
					</div>
					{/each}
				</div>
			</div>
			{/each}
		</div>
	</main>

	<!-- SPENDING VIEW -->
	{:else if currentView === 'spending'}
	<header class="page-header-simple">
		<h1 class="page-title">Spending</h1>
		<div class="header-actions">
			<button class="icon-btn" aria-label="Edit transaction">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
				</svg>
			</button>
			<button class="icon-btn" aria-label="Search transactions">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</button>
		</div>
	</header>

	<main class="main-content">
		{#each transactionGroups() as group}
		<div class="date-group">
			<div class="date-header">
				<span class="date-text">{group.dateFormatted}</span>
				<span class="tx-count">{group.transactions.length} transactions</span>
			</div>
			<div class="tx-list">
				{#each group.transactions as tx}
				<div class="tx-card">
					<div class="tx-main">
						<span class="tx-payee">{tx.payee}</span>
						<span class="tx-amount" class:income={tx.amount > 0} class:expense={tx.amount < 0}>
							{tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, 'USD')}
						</span>
					</div>
					<div class="tx-tags">
						{#if tx.category_name}
						<span class="tag category" style="color: {tx.category_color}">{tx.category_name}</span>
						{:else}
						<span class="tag assign">⚠ Assign</span>
						{/if}
						<span class="tag account">{tx.account_name}</span>
					</div>
					{#if tx.description}
					<div class="tx-memo">{tx.description}</div>
					{/if}
				</div>
				{/each}
			</div>
		</div>
		{/each}
	</main>

	<!-- ACCOUNTS VIEW -->
	{:else if currentView === 'accounts'}
	<header class="page-header-simple">
		<h1 class="page-title">Accounts</h1>
		<div class="header-actions">
			<button class="icon-btn" aria-label="Edit accounts">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="icon">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
				</svg>
			</button>
			<button class="icon-btn" aria-label="List view">
				<svg fill="currentColor" viewBox="0 0 24 24" class="icon">
					<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
				</svg>
			</button>
		</div>
	</header>

	<main class="main-content">
		<!-- Total Balance Card -->
		<div class="total-balance-card">
			<span class="total-label">Total Balance</span>
			<span class="total-amount">{formatCurrency(totalBalance, 'USD')}</span>
		</div>

		<!-- Account Groups -->
		{#each accountGroups() as group}
		<div class="account-group">
			<div class="group-header-row">
				<div class="group-title">
					<span class="group-icon">{group.icon}</span>
					<span class="group-name">{group.name}</span>
				</div>
				<span class="group-total">{formatCurrency(group.total, 'USD')}</span>
			</div>
			{#each group.accounts as account}
			<div class="account-row">
				<div class="account-name-row">
					<span class="account-color" style="background: {account.color}"></span>
					<span class="account-name">{account.name}</span>
				</div>
				<span class="account-balance" class:negative={account.balance < 0}>
					{formatCurrency(account.balance, 'USD')}
				</span>
			</div>
			{/each}
		</div>
		{/each}

		<!-- Add Account Button -->
		<button class="add-account-btn" aria-label="Add new account">
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="plus-icon">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			<span>Add Account</span>
		</button>
	</main>

	<!-- REFLECT VIEW -->
	{:else if currentView === 'reflect'}
	<header class="page-header-simple">
		<h1 class="page-title">Reflect</h1>
	</header>

	<main class="main-content">
		<!-- Spending Summary -->
		<div class="reflect-summary">
			<h2 class="section-title">This Month</h2>
			<div class="reflect-stats">
				<div class="reflect-stat-card">
					<span class="reflect-stat-label">Income</span>
					<span class="reflect-stat-value success">{formatCurrency(data.stats.monthlyIncome, 'USD')}</span>
				</div>
				<div class="reflect-stat-card">
					<span class="reflect-stat-label">Expenses</span>
					<span class="reflect-stat-value danger">{formatCurrency(data.stats.monthlyExpenses, 'USD')}</span>
				</div>
				<div class="reflect-stat-card">
					<span class="reflect-stat-label">Net</span>
					<span class="reflect-stat-value" class:success={data.stats.monthlyIncome - data.stats.monthlyExpenses > 0}>
						{formatCurrency(data.stats.monthlyIncome - data.stats.monthlyExpenses, 'USD')}
					</span>
				</div>
			</div>
		</div>

		<button class="reflect-item" aria-label="View spending breakdown">
			<div class="reflect-icon spending">💰</div>
			<span class="reflect-label">Spending Breakdown</span>
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="chevron-right">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
		<button class="reflect-item" aria-label="View net worth">
			<div class="reflect-icon networth">📊</div>
			<span class="reflect-label">Net Worth</span>
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="chevron-right">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>

		<!-- Top Categories -->
		<div class="section">
			<h2 class="section-title">Top Spending Categories</h2>
			<div class="category-list">
				{#each data.spending.slice(0, 5) as category}
				<div class="category-item">
					<div class="category-info">
						<span class="category-color" style="background: {category.color}"></span>
						<span class="category-name">{category.name}</span>
					</div>
					<div class="category-stats">
						<span class="category-amount">{formatCurrency(category.amount, 'USD')}</span>
						<span class="category-percent">{category.percentage}%</span>
					</div>
				</div>
				{/each}
			</div>
		</div>
	</main>
	{/if}

	<!-- Floating Action Button -->
	<button class="fab" aria-label="Add new transaction">
		<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
		</svg>
		<span>Transaction</span>
	</button>

	<!-- Bottom Navigation -->
	<nav class="bottom-nav">
		{#each navItems as item}
			<button 
				class="nav-item" 
				class:active={currentView === item.view}
				onclick={() => currentView = item.view}
			>
				<div class="nav-icon-wrapper" class:active={currentView === item.view}>
					{#if item.icon === 'home'}
						<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
						</svg>
					{:else if item.icon === 'plan'}
						<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					{:else if item.icon === 'spending'}
						<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
					{:else if item.icon === 'accounts'}
						<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
						</svg>
					{:else if item.icon === 'reflect'}
						<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
					{/if}
				</div>
				<span class="nav-label">{item.label}</span>
			</button>
		{/each}
	</nav>
</div>

<style>
	/* Demo Banner */
	.demo-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background: var(--color-primary);
		color: white;
		padding: 8px 16px;
		text-align: center;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
	}

	.demo-banner-text {
		font-size: 14px;
	}

	.demo-banner-link {
		color: white;
		text-decoration: underline;
	}

	.demo-banner-close {
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		padding: 4px;
		font-size: 16px;
	}

	/* App Container */
	.app-container {
		min-height: 100vh;
		min-height: 100dvh;
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		display: flex;
		flex-direction: column;
	}

	.app-container.with-banner {
		padding-top: 40px;
	}

	/* Page Header */
	.page-header-simple {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		min-height: 56px;
	}

	.page-title {
		font-size: 24px;
		font-weight: 700;
	}

	.header-actions {
		display: flex;
		gap: 8px;
	}

	.icon-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		padding: 8px;
		cursor: pointer;
	}

	.icon {
		width: 24px;
		height: 24px;
	}

	/* Main Content */
	.main-content {
		flex: 1;
		padding: 0 16px 140px;
		overflow-y: auto;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
		margin-bottom: 24px;
	}

	.stat-card {
		background: var(--color-bg-secondary);
		border-radius: 12px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stat-label {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.stat-value {
		font-size: 18px;
		font-weight: 700;
	}

	.stat-value.success {
		color: var(--color-success);
	}

	.stat-value.danger {
		color: var(--color-danger);
	}

	/* Sections */
	.section {
		margin-bottom: 24px;
	}

	.section-title {
		font-size: 16px;
		font-weight: 600;
		margin-bottom: 12px;
		color: var(--color-text-secondary);
	}

	/* Category List */
	.category-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.category-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px;
		background: var(--color-bg-secondary);
		border-radius: 8px;
	}

	.category-info {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.category-color {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}

	.category-name {
		font-weight: 500;
	}

	.category-stats {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.category-amount {
		font-weight: 600;
	}

	.category-percent {
		font-size: 12px;
		color: var(--color-text-muted);
		min-width: 32px;
		text-align: right;
	}

	/* Plan View */
	.month-selector {
		display: flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: none;
		color: var(--color-text-primary);
		font-size: 24px;
		font-weight: 700;
		cursor: pointer;
	}

	.chevron-icon {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
	}

	.plan-summary {
		display: flex;
		justify-content: flex-end;
		gap: 24px;
		margin-bottom: 16px;
	}

	.plan-stat {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.plan-label {
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.plan-value {
		font-size: 14px;
		font-weight: 600;
	}

	.plan-value.warning {
		color: var(--color-warning);
	}

	.plan-toggle {
		display: flex;
		justify-content: flex-end;
		gap: 16px;
		margin-bottom: 16px;
	}

	.toggle-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		padding: 4px 0;
		letter-spacing: 0.05em;
	}

	.toggle-btn.active {
		color: var(--color-text-primary);
		border-bottom: 2px solid var(--color-primary);
	}

	.budget-groups {
		display: flex;
		flex-direction: column;
	}

	.budget-group {
		border-bottom: 1px solid var(--color-border);
	}

	.group-header {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 12px 0;
		background: none;
		border: none;
		color: var(--color-text-primary);
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		text-align: left;
	}

	.expand-icon {
		width: 16px;
		height: 16px;
		color: var(--color-text-muted);
	}

	.group-items {
		padding-left: 24px;
	}

	.budget-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 0;
		border-bottom: 1px solid var(--color-border);
		gap: 16px;
	}

	.budget-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.budget-name {
		color: var(--color-text-primary);
		font-weight: 500;
	}

	.budget-bar {
		height: 4px;
		background: var(--color-bg-tertiary);
		border-radius: 2px;
		overflow: hidden;
	}

	.budget-bar-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.budget-amounts {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
	}

	.budget-spent {
		font-weight: 600;
		font-size: 14px;
	}

	.budget-target {
		color: var(--color-text-muted);
		font-size: 12px;
	}

	/* Spending View */
	.date-group {
		margin-bottom: 16px;
	}

	.date-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 0 8px;
	}

	.date-text {
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.tx-count {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.tx-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.tx-card {
		background: var(--color-bg-secondary);
		border-radius: 12px;
		padding: 16px;
	}

	.tx-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.tx-payee {
		font-weight: 600;
	}

	.tx-amount {
		font-weight: 600;
	}

	.tx-amount.income {
		color: var(--color-success);
	}

	.tx-amount.expense {
		color: var(--color-danger);
	}

	.tx-tags {
		display: flex;
		gap: 8px;
		margin-bottom: 4px;
	}

	.tag {
		font-size: 12px;
		padding: 4px 8px;
		border-radius: 4px;
		background: var(--color-bg-tertiary);
	}

	.tag.category {
		color: var(--color-primary);
	}

	.tag.account {
		color: var(--color-text-muted);
	}

	.tag.assign {
		background: rgba(234, 179, 8, 0.2);
		color: var(--color-warning);
	}

	.tx-memo {
		font-size: 13px;
		color: var(--color-primary);
		font-style: italic;
	}

	/* Accounts View */
	.total-balance-card {
		background: var(--color-primary);
		border-radius: 12px;
		padding: 24px;
		text-align: center;
		margin-bottom: 24px;
	}

	.total-label {
		display: block;
		font-size: 14px;
		opacity: 0.9;
		margin-bottom: 4px;
	}

	.total-amount {
		display: block;
		font-size: 32px;
		font-weight: 700;
	}

	.account-group {
		margin-bottom: 8px;
	}

	.group-header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 0;
	}

	.group-title {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.group-icon {
		font-size: 16px;
	}

	.group-name {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
	}

	.group-total {
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.account-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 0;
		border-bottom: 1px solid var(--color-border);
	}

	.account-name-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.account-color {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.account-name {
		font-weight: 500;
	}

	.account-balance {
		color: var(--color-success);
		font-weight: 600;
	}

	.account-balance.negative {
		color: var(--color-danger);
	}

	.add-account-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 16px;
		margin-top: 24px;
		background: none;
		border: 1px dashed var(--color-border);
		border-radius: 12px;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
	}

	.plus-icon {
		width: 20px;
		height: 20px;
	}

	/* Reflect View */
	.reflect-summary {
		margin-bottom: 24px;
	}

	.reflect-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
	}

	.reflect-stat-card {
		background: var(--color-bg-secondary);
		border-radius: 12px;
		padding: 16px;
		text-align: center;
	}

	.reflect-stat-label {
		display: block;
		font-size: 11px;
		color: var(--color-text-muted);
		margin-bottom: 4px;
	}

	.reflect-stat-value {
		font-size: 16px;
		font-weight: 700;
	}

	.reflect-stat-value.success {
		color: var(--color-success);
	}

	.reflect-stat-value.danger {
		color: var(--color-danger);
	}

	.reflect-item {
		display: flex;
		align-items: center;
		gap: 16px;
		width: 100%;
		padding: 16px;
		background: var(--color-bg-secondary);
		border: none;
		border-radius: 12px;
		margin-bottom: 12px;
		cursor: pointer;
		text-align: left;
	}

	.reflect-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
	}

	.reflect-icon.spending {
		background: rgba(16, 185, 129, 0.15);
	}

	.reflect-icon.networth {
		background: rgba(16, 185, 129, 0.15);
	}

	.reflect-label {
		flex: 1;
		font-weight: 500;
		color: var(--color-primary);
	}

	.chevron-right {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
	}

	/* FAB */
	.fab {
		position: fixed;
		bottom: 80px;
		right: 16px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 20px;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 28px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 100;
	}

	.fab svg {
		width: 20px;
		height: 20px;
	}

	/* Bottom Navigation */
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-around;
		align-items: center;
		height: 64px;
		background-color: var(--color-bg-secondary);
		border-top: 1px solid var(--color-border);
		padding-bottom: env(safe-area-inset-bottom, 0);
		z-index: 100;
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		padding: 6px 12px;
		background: none;
		border: none;
		color: var(--color-text-muted);
		min-width: 56px;
		min-height: 44px;
		cursor: pointer;
	}

	.nav-item.active {
		color: white;
	}

	.nav-icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px 12px;
		border-radius: 8px;
	}

	.nav-icon-wrapper.active {
		background-color: var(--color-primary);
	}

	.nav-icon {
		width: 24px;
		height: 24px;
	}

	.nav-label {
		font-size: 11px;
		font-weight: 500;
	}
</style>

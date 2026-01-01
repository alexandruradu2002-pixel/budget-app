<script lang="ts">
	import { formatCurrency, formatMonthYear } from '$lib/utils/format';
	import type { CurrencyValue } from '$lib/constants';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	let currentView = $state<'dashboard' | 'spending' | 'accounts' | 'transactions'>('dashboard');
	let currentDate = $state(new Date());
	let displayMonth = $derived(formatMonthYear(currentDate));

	// Demo notice
	let showNotice = $state(true);
</script>

<svelte:head>
	<title>Demo - Budget App</title>
	<meta name="description" content="Try Budget App with sample data. Personal finance management made simple." />
</svelte:head>

<!-- Demo Notice Banner -->
{#if showNotice}
<div class="demo-banner">
	<span class="demo-banner-text">
		🎭 <strong>Demo Mode</strong> - Acest demo folosește date fictive. 
		<a href="https://github.com/alexandruradu2002-pixel/budget_app" target="_blank" class="demo-banner-link">Instalează-ți propria versiune</a>
	</span>
	<button onclick={() => showNotice = false} class="demo-banner-close">✕</button>
</div>
{/if}

<div class="demo-container" class:with-banner={showNotice}>
	<!-- Demo Navigation -->
	<nav class="demo-nav">
		<div class="nav-brand">
			<span class="nav-brand-icon">💰</span>
			<span class="nav-brand-name">Budget App</span>
			<span class="demo-badge">DEMO</span>
		</div>
		
		<div class="nav-tabs">
			<button 
				class="nav-tab" 
				class:active={currentView === 'dashboard'}
				onclick={() => currentView = 'dashboard'}
			>
				<svg class="nav-tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
				</svg>
				Dashboard
			</button>
			<button 
				class="nav-tab" 
				class:active={currentView === 'spending'}
				onclick={() => currentView = 'spending'}
			>
				<svg class="nav-tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				Cheltuieli
			</button>
			<button 
				class="nav-tab" 
				class:active={currentView === 'accounts'}
				onclick={() => currentView = 'accounts'}
			>
				<svg class="nav-tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
				</svg>
				Conturi
			</button>
			<button 
				class="nav-tab" 
				class:active={currentView === 'transactions'}
				onclick={() => currentView = 'transactions'}
			>
				<svg class="nav-tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
				Tranzacții
			</button>
		</div>
	</nav>

	<!-- Dashboard View -->
	{#if currentView === 'dashboard'}
	<div class="demo-content">
		<header class="demo-header">
			<h1 class="demo-title">Dashboard</h1>
			<span class="demo-month-badge">{displayMonth}</span>
		</header>

		<!-- Balance Card -->
		<div class="balance-card">
			<div class="balance-header">
				<span class="balance-label">Sold Total</span>
			</div>
			<div class="balance-amount">{formatCurrency(data.stats.totalBalance)}</div>
			<div class="balance-stats">
				<div class="stat-item income">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
					</svg>
					<div class="stat-content">
						<span class="stat-label">Venituri</span>
						<span class="stat-value">+{formatCurrency(data.stats.monthlyIncome)}</span>
					</div>
				</div>
				<div class="stat-item expense">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
					</svg>
					<div class="stat-content">
						<span class="stat-label">Cheltuieli</span>
						<span class="stat-value">-{formatCurrency(data.stats.monthlyExpenses)}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Stats Grid -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-card-icon primary">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
					</svg>
				</div>
				<div class="stat-card-content">
					<span class="stat-card-value">{data.accounts.length}</span>
					<span class="stat-card-label">Conturi Active</span>
				</div>
			</div>
			
			<div class="stat-card">
				<div class="stat-card-icon success">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					</svg>
				</div>
				<div class="stat-card-content">
					<span class="stat-card-value">{data.stats.savingsRate}%</span>
					<span class="stat-card-label">Rata de Economisire</span>
				</div>
			</div>
		</div>

		<!-- Budgets Preview -->
		<section class="demo-section">
			<h2 class="section-title">Bugete luna aceasta</h2>
			<div class="budgets-list">
				{#each data.budgets.slice(0, 5) as budget}
				<div class="budget-item">
					<div class="budget-header">
						<span class="budget-category" style="--cat-color: {budget.category_color}">
							{budget.category_name}
						</span>
						<span class="budget-amounts">
							{formatCurrency(budget.spent)} / {formatCurrency(budget.budgeted)}
						</span>
					</div>
					<div class="budget-bar">
						<div 
							class="budget-progress"
							class:over-budget={budget.percentage > 100}
							style="width: {Math.min(budget.percentage, 100)}%"
						></div>
					</div>
				</div>
				{/each}
			</div>
		</section>
	</div>

	<!-- Spending View -->
	{:else if currentView === 'spending'}
	<div class="demo-content">
		<header class="demo-header">
			<h1 class="demo-title">Cheltuieli</h1>
			<span class="demo-month-badge">{displayMonth}</span>
		</header>

		<div class="spending-grid">
			<!-- Pie Chart Placeholder -->
			<div class="chart-card">
				<h3 class="card-title">Cheltuieli pe categorii</h3>
				<div class="pie-chart">
					<!-- CSS-based pie chart visualization -->
				</div>
			</div>

			<!-- Category List -->
			<div class="category-list-card">
				<h3 class="card-title">Top Categorii</h3>
				<div class="category-list">
					{#each data.spending as category}
					<div class="category-item">
						<div class="category-info">
							<span class="category-dot" style="background: {category.color}"></span>
							<span class="category-name">{category.name}</span>
						</div>
						<div class="category-stats">
							<span class="category-amount">{formatCurrency(category.amount)}</span>
							<span class="category-percent">{category.percentage}%</span>
						</div>
					</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Accounts View -->
	{:else if currentView === 'accounts'}
	<div class="demo-content">
		<header class="demo-header">
			<h1 class="demo-title">Conturi</h1>
			<span class="demo-month-badge">{data.accounts.length} conturi active</span>
		</header>

		<div class="accounts-grid">
			{#each data.accounts as account}
			<div class="account-card">
				<div class="account-header">
					<div class="account-icon" style="background: {account.color}20; color: {account.color}">
						{#if account.type === 'checking'}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
						</svg>
						{:else if account.type === 'savings'}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{:else if account.type === 'credit_card'}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
						</svg>
						{:else if account.type === 'cash'}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
						{:else if account.type === 'investment'}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
						</svg>
						{:else}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
						{/if}
					</div>
					<div class="account-info">
						<span class="account-name">{account.name}</span>
						<span class="account-type">{account.type}</span>
					</div>
				</div>
				<div class="account-balance" class:negative={account.balance < 0}>
					{formatCurrency(account.balance, account.currency as CurrencyValue)}
				</div>
			</div>
			{/each}
		</div>
	</div>

	<!-- Transactions View -->
	{:else if currentView === 'transactions'}
	<div class="demo-content">
		<header class="demo-header">
			<h1 class="demo-title">Tranzacții</h1>
			<span class="demo-month-badge">Ultimele {Math.min(data.transactions.length, 20)} tranzacții</span>
		</header>

		<div class="transactions-list">
			{#each data.transactions.slice(0, 20) as tx}
			<div class="transaction-item">
				<div class="tx-left">
					<span class="tx-category-dot" style="background: {tx.category_color}"></span>
					<div class="tx-info">
						<span class="tx-payee">{tx.payee}</span>
						<span class="tx-meta">{tx.category_name} • {tx.account_name}</span>
					</div>
				</div>
				<div class="tx-right">
					<span class="tx-amount" class:income={tx.amount > 0} class:expense={tx.amount < 0}>
						{tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
					</span>
					<span class="tx-date">{new Date(tx.date).toLocaleDateString('ro-RO')}</span>
				</div>
			</div>
			{/each}
		</div>
	</div>
	{/if}

	<!-- Footer CTA -->
	<footer class="demo-footer">
		<div class="cta-box">
			<h3 class="cta-title">Îți place ce vezi?</h3>
			<p class="cta-text">Instalează-ți propria versiune gratuită în câteva minute.</p>
			<div class="cta-buttons">
				<a href="https://github.com/alexandruradu2002-pixel/budget_app" target="_blank" class="btn-primary">
					<svg class="btn-icon" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
					GitHub
				</a>
				<a href="https://vercel.com/new/clone?repository-url=https://github.com/alexandruradu2002-pixel/budget_app" target="_blank" class="btn-secondary">
					<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
					</svg>
					Deploy pe Vercel
				</a>
			</div>
		</div>
	</footer>
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
		padding: 0.5rem 1rem;
		text-align: center;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.demo-banner-text {
		font-size: 0.875rem;
	}

	.demo-banner-link {
		color: white;
		text-decoration: underline;
		opacity: 0.9;
	}

	.demo-banner-link:hover {
		opacity: 1;
	}

	.demo-banner-close {
		background: none;
		border: none;
		color: white;
		opacity: 0.8;
		cursor: pointer;
		padding: 0.25rem;
	}

	.demo-banner-close:hover {
		opacity: 1;
	}

	/* Container */
	.demo-container {
		min-height: 100vh;
		min-height: 100dvh;
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	.demo-container.with-banner {
		padding-top: 40px;
	}

	/* Navigation */
	.demo-nav {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
	}

	@media (min-width: 768px) {
		.demo-nav {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}

	.nav-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-brand-icon {
		font-size: 1.5rem;
	}

	.nav-brand-name {
		font-weight: 700;
		font-size: 1.125rem;
		color: var(--color-text-primary);
	}

	.demo-badge {
		background: var(--color-primary);
		color: white;
		font-size: 0.65rem;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	.nav-tabs {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.nav-tabs::-webkit-scrollbar {
		display: none;
	}

	.nav-tab {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		border-radius: 8px;
		background: transparent;
		color: var(--color-text-secondary);
		border: none;
		cursor: pointer;
		white-space: nowrap;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s;
	}

	.nav-tab:hover {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.nav-tab.active {
		background: var(--color-primary);
		color: white;
	}

	.nav-tab-icon {
		width: 18px;
		height: 18px;
	}

	/* Content */
	.demo-content {
		padding: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.demo-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}

	.demo-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.demo-month-badge {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		padding: 0.375rem 0.75rem;
		background: var(--color-bg-tertiary);
		border-radius: 8px;
	}

	/* Balance Card */
	.balance-card {
		padding: 1.25rem;
		background: var(--color-bg-secondary);
		border-radius: 16px;
		margin-bottom: 1rem;
	}

	.balance-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.balance-label {
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.balance-amount {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin-bottom: 1.25rem;
	}

	.balance-stats {
		display: flex;
		gap: 1rem;
	}

	.stat-item {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem;
		background: var(--color-bg-tertiary);
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
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.stat-value {
		font-size: 0.875rem;
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
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--color-bg-secondary);
		border-radius: 12px;
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

	.stat-card-icon.primary {
		background: color-mix(in srgb, var(--color-primary) 15%, transparent);
		color: var(--color-primary);
	}

	.stat-card-icon.success {
		background: color-mix(in srgb, var(--color-success) 15%, transparent);
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
	}

	.stat-card-value {
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.stat-card-label {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	/* Section */
	.demo-section {
		margin-bottom: 1.5rem;
	}

	.section-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 0.75rem;
	}

	.card-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 1rem;
	}

	/* Budgets */
	.budgets-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.budget-item {
		background: var(--color-bg-secondary);
		padding: 1rem;
		border-radius: 12px;
	}

	.budget-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.budget-category {
		font-weight: 600;
		color: var(--cat-color, var(--color-text-primary));
	}

	.budget-amounts {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.budget-bar {
		height: 8px;
		background: var(--color-bg-tertiary);
		border-radius: 4px;
		overflow: hidden;
	}

	.budget-progress {
		height: 100%;
		background: var(--color-primary);
		border-radius: 4px;
		transition: width 0.3s;
	}

	.budget-progress.over-budget {
		background: var(--color-danger);
	}

	/* Spending Grid */
	.spending-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 768px) {
		.spending-grid {
			grid-template-columns: 280px 1fr;
		}
	}

	.chart-card,
	.category-list-card {
		background: var(--color-bg-secondary);
		padding: 1.25rem;
		border-radius: 12px;
	}

	.pie-chart {
		width: 200px;
		height: 200px;
		border-radius: 50%;
		background: conic-gradient(
			var(--color-chart-1) 0% 25%,
			var(--color-chart-2) 25% 45%,
			var(--color-chart-3) 45% 60%,
			var(--color-chart-4) 60% 75%,
			var(--color-chart-5) 75% 85%,
			var(--color-text-muted) 85% 100%
		);
		margin: 0 auto;
	}

	.category-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.category-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.category-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.category-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.category-name {
		color: var(--color-text-primary);
	}

	.category-stats {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.category-amount {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.category-percent {
		color: var(--color-text-muted);
		font-size: 0.875rem;
		min-width: 40px;
		text-align: right;
	}

	/* Accounts Grid */
	.accounts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.account-card {
		background: var(--color-bg-secondary);
		padding: 1.25rem;
		border-radius: 12px;
	}

	.account-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.account-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.account-icon svg {
		width: 24px;
		height: 24px;
	}

	.account-info {
		display: flex;
		flex-direction: column;
	}

	.account-name {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.account-type {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		text-transform: capitalize;
	}

	.account-balance {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.account-balance.negative {
		color: var(--color-danger);
	}

	/* Transactions List */
	.transactions-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.transaction-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: var(--color-bg-secondary);
		border-radius: 12px;
	}

	.tx-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.tx-category-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.tx-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.tx-payee {
		font-weight: 500;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tx-meta {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tx-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		flex-shrink: 0;
	}

	.tx-amount {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.tx-amount.income {
		color: var(--color-success);
	}

	.tx-amount.expense {
		color: var(--color-danger);
	}

	.tx-date {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	/* Footer CTA */
	.demo-footer {
		padding: 2rem 1rem;
		border-top: 1px solid var(--color-border);
		margin-top: 2rem;
	}

	.cta-box {
		max-width: 600px;
		margin: 0 auto;
		text-align: center;
	}

	.cta-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin-bottom: 0.5rem;
	}

	.cta-text {
		color: var(--color-text-secondary);
		margin-bottom: 1.5rem;
	}

	.cta-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn-primary,
	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s;
	}

	.btn-icon {
		width: 18px;
		height: 18px;
	}

	.btn-primary {
		background: var(--color-primary);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-primary-hover);
	}

	.btn-secondary {
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		background: var(--color-bg-tertiary);
	}

	/* Responsive */
	@media (max-width: 480px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.balance-stats {
			flex-direction: column;
		}

		.demo-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>

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
<div class="fixed top-0 left-0 right-0 bg-(--color-primary) text-white px-4 py-2 text-center z-50 flex items-center justify-center gap-4">
	<span class="text-sm">
		🎭 <strong>Demo Mode</strong> - Acest demo folosește date fictive. 
		<a href="https://github.com/alexandruradu2002-pixel/budget_app" target="_blank" class="underline">Instalează-ți propria versiune</a>
	</span>
	<button onclick={() => showNotice = false} class="text-white/80 hover:text-white">✕</button>
</div>
{/if}

<div class="demo-container" class:with-banner={showNotice}>
	<!-- Demo Navigation -->
	<nav class="demo-nav">
		<div class="nav-brand">
			<span class="text-2xl">💰</span>
			<span class="font-bold">Budget App</span>
			<span class="demo-badge">DEMO</span>
		</div>
		
		<div class="nav-tabs">
			<button 
				class="nav-tab" 
				class:active={currentView === 'dashboard'}
				onclick={() => currentView = 'dashboard'}
			>
				📊 Dashboard
			</button>
			<button 
				class="nav-tab" 
				class:active={currentView === 'spending'}
				onclick={() => currentView = 'spending'}
			>
				💸 Cheltuieli
			</button>
			<button 
				class="nav-tab" 
				class:active={currentView === 'accounts'}
				onclick={() => currentView = 'accounts'}
			>
				🏦 Conturi
			</button>
			<button 
				class="nav-tab" 
				class:active={currentView === 'transactions'}
				onclick={() => currentView = 'transactions'}
			>
				📝 Tranzacții
			</button>
		</div>
	</nav>

	<!-- Dashboard View -->
	{#if currentView === 'dashboard'}
	<div class="demo-content">
		<header class="demo-header">
			<h1>Dashboard</h1>
			<p class="text-secondary">{displayMonth}</p>
		</header>

		<!-- Stats Cards -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon bg-green-500/20 text-green-400">💰</div>
				<div class="stat-content">
					<span class="stat-value">{formatCurrency(data.stats.totalBalance)}</span>
					<span class="stat-label">Sold Total</span>
				</div>
			</div>
			
			<div class="stat-card">
				<div class="stat-icon bg-blue-500/20 text-blue-400">📈</div>
				<div class="stat-content">
					<span class="stat-value text-green-400">+{formatCurrency(data.stats.monthlyIncome)}</span>
					<span class="stat-label">Venituri luna aceasta</span>
				</div>
			</div>
			
			<div class="stat-card">
				<div class="stat-icon bg-red-500/20 text-red-400">📉</div>
				<div class="stat-content">
					<span class="stat-value text-red-400">-{formatCurrency(data.stats.monthlyExpenses)}</span>
					<span class="stat-label">Cheltuieli luna aceasta</span>
				</div>
			</div>
			
			<div class="stat-card">
				<div class="stat-icon bg-purple-500/20 text-purple-400">🎯</div>
				<div class="stat-content">
					<span class="stat-value">{data.stats.savingsRate}%</span>
					<span class="stat-label">Rata de economisire</span>
				</div>
			</div>
		</div>

		<!-- Budgets Preview -->
		<section class="demo-section">
			<h2>Bugete luna aceasta</h2>
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
			<h1>Cheltuieli</h1>
			<p class="text-secondary">{displayMonth}</p>
		</header>

		<div class="spending-grid">
			<!-- Pie Chart Placeholder -->
			<div class="chart-card">
				<h3>Cheltuieli pe categorii</h3>
				<div class="pie-chart">
					{#each data.spending.slice(0, 6) as category, i}
					<div 
						class="pie-slice" 
						style="--color: {category.color}; --percentage: {category.percentage}%; --offset: {data.spending.slice(0, i).reduce((sum, c) => sum + c.percentage, 0)}%"
					></div>
					{/each}
				</div>
			</div>

			<!-- Category List -->
			<div class="category-list-card">
				<h3>Top Categorii</h3>
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
			<h1>Conturi</h1>
			<p class="text-secondary">{data.accounts.length} conturi active</p>
		</header>

		<div class="accounts-grid">
			{#each data.accounts as account}
			<div class="account-card">
				<div class="account-header">
					<div class="account-icon" style="background: {account.color}">
						{#if account.type === 'checking'}💳
						{:else if account.type === 'savings'}🏦
						{:else if account.type === 'credit_card'}💳
						{:else if account.type === 'cash'}💵
						{:else if account.type === 'investment'}📈
						{:else}📦{/if}
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
			<h1>Tranzacții</h1>
			<p class="text-secondary">Ultimele {data.transactions.length} tranzacții</p>
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
			<h3>Îți place ce vezi?</h3>
			<p>Instalează-ți propria versiune gratuită în câteva minute.</p>
			<div class="cta-buttons">
				<a href="https://github.com/alexandruradu2002-pixel/budget_app" target="_blank" class="btn-primary">
					⭐ GitHub
				</a>
				<a href="https://vercel.com/new/clone?repository-url=https://github.com/alexandruradu2002-pixel/budget_app" target="_blank" class="btn-secondary">
					🚀 Deploy pe Vercel
				</a>
			</div>
		</div>
	</footer>
</div>

<style>
	.demo-container {
		min-height: 100vh;
		min-height: 100dvh;
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	.demo-container.with-banner {
		padding-top: 40px;
	}

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

	.demo-badge {
		background: var(--color-primary);
		color: white;
		font-size: 0.65rem;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		font-weight: 600;
	}

	.nav-tabs {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
	}

	.nav-tab {
		padding: 0.5rem 1rem;
		border-radius: 8px;
		background: transparent;
		color: var(--color-text-secondary);
		border: none;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s;
	}

	.nav-tab:hover {
		background: var(--color-bg-tertiary);
	}

	.nav-tab.active {
		background: var(--color-primary);
		color: white;
	}

	.demo-content {
		padding: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.demo-header {
		margin-bottom: 1.5rem;
	}

	.demo-header h1 {
		font-size: 1.75rem;
		font-weight: 700;
	}

	.text-secondary {
		color: var(--color-text-secondary);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
		background: var(--color-bg-secondary);
		border-radius: 12px;
		border: 1px solid var(--color-border);
	}

	.stat-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	/* Budgets */
	.demo-section h2 {
		font-size: 1.25rem;
		margin-bottom: 1rem;
	}

	.budgets-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.budget-item {
		background: var(--color-bg-secondary);
		padding: 1rem;
		border-radius: 12px;
		border: 1px solid var(--color-border);
	}

	.budget-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.budget-category {
		font-weight: 600;
		color: var(--cat-color);
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
			grid-template-columns: 300px 1fr;
		}
	}

	.chart-card, .category-list-card {
		background: var(--color-bg-secondary);
		padding: 1.5rem;
		border-radius: 12px;
		border: 1px solid var(--color-border);
	}

	.chart-card h3, .category-list-card h3 {
		margin-bottom: 1rem;
		font-size: 1rem;
	}

	.pie-chart {
		width: 200px;
		height: 200px;
		border-radius: 50%;
		background: conic-gradient(
			#22C55E 0% 25%,
			#F97316 25% 45%,
			#3B82F6 45% 60%,
			#8B5CF6 60% 75%,
			#EF4444 75% 85%,
			#6B7280 85% 100%
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
	}

	.category-stats {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.category-amount {
		font-weight: 600;
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
		border: 1px solid var(--color-border);
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
		font-size: 1.5rem;
	}

	.account-info {
		display: flex;
		flex-direction: column;
	}

	.account-name {
		font-weight: 600;
	}

	.account-type {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		text-transform: capitalize;
	}

	.account-balance {
		font-size: 1.5rem;
		font-weight: 700;
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
		border: 1px solid var(--color-border);
	}

	.tx-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.tx-category-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.tx-info {
		display: flex;
		flex-direction: column;
	}

	.tx-payee {
		font-weight: 500;
	}

	.tx-meta {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.tx-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
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

	.cta-box h3 {
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.cta-box p {
		color: var(--color-text-secondary);
		margin-bottom: 1.5rem;
	}

	.cta-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn-primary, .btn-secondary {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s;
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

	.text-green-400 { color: #4ADE80; }
	.text-red-400 { color: #F87171; }
</style>

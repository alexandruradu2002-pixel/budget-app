<script lang="ts">
	// Dashboard page
	let stats = $state({
		totalBalance: 0,
		monthlyIncome: 0,
		monthlyExpenses: 0,
		accountsCount: 0
	});

	let loading = $state(true);

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

<div class="space-y-8">
	<h1 class="text-3xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>

	{#if loading}
		<div class="text-[var(--color-text-muted)]">Loading dashboard...</div>
	{:else}
		<!-- Stats grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<div class="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border)]">
				<div class="text-[var(--color-text-muted)] text-sm">Total Balance</div>
				<div class="text-3xl font-bold text-[var(--color-text-primary)] mt-2">
					${stats.totalBalance.toFixed(2)}
				</div>
			</div>

			<div class="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border)]">
				<div class="text-[var(--color-text-muted)] text-sm">Monthly Income</div>
				<div class="text-3xl font-bold text-[var(--color-success)] mt-2">
					+${stats.monthlyIncome.toFixed(2)}
				</div>
			</div>

			<div class="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border)]">
				<div class="text-[var(--color-text-muted)] text-sm">Monthly Expenses</div>
				<div class="text-3xl font-bold text-[var(--color-danger)] mt-2">
					-${stats.monthlyExpenses.toFixed(2)}
				</div>
			</div>

			<div class="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border)]">
				<div class="text-[var(--color-text-muted)] text-sm">Active Accounts</div>
				<div class="text-3xl font-bold text-[var(--color-text-primary)] mt-2">
					{stats.accountsCount}
				</div>
			</div>
		</div>

		<!-- Quick actions -->
		<div class="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border)]">
			<h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<a
					href="/transactions/new"
					class="p-4 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-primary)] rounded-lg text-center transition-colors"
				>
					<div class="text-2xl mb-2">➕</div>
					<div class="text-sm">Add Transaction</div>
				</a>
				<a
					href="/accounts/new"
					class="p-4 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-primary)] rounded-lg text-center transition-colors"
				>
					<div class="text-2xl mb-2">💳</div>
					<div class="text-sm">New Account</div>
				</a>
				<a
					href="/budgets/new"
					class="p-4 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-primary)] rounded-lg text-center transition-colors"
				>
					<div class="text-2xl mb-2">🎯</div>
					<div class="text-sm">Set Budget</div>
				</a>
				<a
					href="/reports"
					class="p-4 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-primary)] rounded-lg text-center transition-colors"
				>
					<div class="text-2xl mb-2">📊</div>
					<div class="text-sm">View Reports</div>
				</a>
			</div>
		</div>
	{/if}
</div>

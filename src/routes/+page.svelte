<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="max-w-md w-full text-center space-y-8">
		<div>
			<h1 class="text-4xl font-bold text-[var(--color-primary)]">💰 Budget App</h1>
			<p class="mt-4 text-[var(--color-text-muted)]">
				Track expenses, manage budgets, and achieve your financial goals.
			</p>
		</div>

		<div class="space-y-4">
			<button
				onclick={() => goto('/login')}
				class="w-full px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-colors"
			>
				Login
			</button>

			<button
				onclick={() => goto('/signup')}
				class="w-full px-6 py-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg font-medium transition-colors border border-[var(--color-border)]"
			>
				Sign Up
			</button>
		</div>

		<div class="grid grid-cols-2 gap-4 mt-12 text-sm">
			<div class="p-4 bg-[var(--color-bg-secondary)] rounded-lg">
				<div class="text-2xl mb-2">📊</div>
				<div class="font-medium">Track Spending</div>
			</div>
			<div class="p-4 bg-[var(--color-bg-secondary)] rounded-lg">
				<div class="text-2xl mb-2">🎯</div>
				<div class="font-medium">Set Budgets</div>
			</div>
			<div class="p-4 bg-[var(--color-bg-secondary)] rounded-lg">
				<div class="text-2xl mb-2">💳</div>
				<div class="font-medium">Multiple Accounts</div>
			</div>
			<div class="p-4 bg-[var(--color-bg-secondary)] rounded-lg">
				<div class="text-2xl mb-2">📈</div>
				<div class="font-medium">Visual Reports</div>
			</div>
		</div>
	</div>
</div>

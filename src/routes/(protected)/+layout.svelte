<script lang="ts">
	// Protected layout - requires authentication
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	let { children } = $props();
	let loading = $state(true);

	onMount(async () => {
		// Check if user is authenticated
		const response = await fetch('/api/auth/me', { credentials: 'include' });
		if (!response.ok) {
			goto('/login');
			return;
		}
		loading = false;
	});
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-[var(--color-text-muted)]">Loading...</div>
	</div>
{:else}
	<div class="min-h-screen">
		<!-- Navigation -->
		<nav class="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between h-16">
					<div class="flex space-x-8">
						<a href="/dashboard" class="inline-flex items-center px-1 pt-1 text-[var(--color-text-primary)]">
							Dashboard
						</a>
						<a href="/transactions" class="inline-flex items-center px-1 pt-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
							Transactions
						</a>
						<a href="/accounts" class="inline-flex items-center px-1 pt-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
							Accounts
						</a>
						<a href="/budgets" class="inline-flex items-center px-1 pt-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
							Budgets
						</a>
						<a href="/reports" class="inline-flex items-center px-1 pt-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
							Reports
						</a>
					</div>
					<div class="flex items-center">
						<button
							onclick={async () => {
								await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
								goto('/login');
							}}
							class="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
						>
							Logout
						</button>
					</div>
				</div>
			</div>
		</nav>

		<!-- Main content -->
		<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			{@render children()}
		</main>
	</div>
{/if}

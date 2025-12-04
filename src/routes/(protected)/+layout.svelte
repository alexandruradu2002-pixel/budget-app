<script lang="ts">
	// Protected layout - LOGIN DISABLED: Single user mode
	import { page } from '$app/stores';
	import { currencyStore, cacheStore } from '$lib/stores';
	
	let { children } = $props();
	let currentPath = $derived($page.url.pathname);

	// Initialize stores (loads from localStorage cache first, then refreshes in background)
	$effect(() => {
		currencyStore.init();
		// Preload accounts and categories for instant modal loading
		cacheStore.preloadEssentials();
	});

	// Navigation items
	const navItems = [
		{ href: '/dashboard', label: 'Home', icon: 'home' },
		{ href: '/plan', label: 'Plan', icon: 'plan' },
		{ href: '/spending', label: 'Spending', icon: 'spending' },
		{ href: '/accounts', label: 'Accounts', icon: 'accounts' },
		{ href: '/reports', label: 'Reflect', icon: 'reflect' }
	];

	function isActive(href: string): boolean {
		return currentPath === href || currentPath.startsWith(href + '/');
	}
</script>

<div class="app-container">
	<!-- Main content area -->
	<main class="main-content">
		{@render children()}
	</main>

	<!-- Bottom Navigation Bar - Fixed at bottom -->
	<nav class="bottom-nav">
		{#each navItems as item}
			<a href={item.href} class="nav-item" class:active={isActive(item.href)}>
				<div class="nav-icon-wrapper" class:active={isActive(item.href)}>
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
			</a>
		{/each}
	</nav>
</div>

<style>
	.app-container {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		min-height: 100dvh;
		background-color: var(--color-bg-primary);
	}

	.main-content {
		flex: 1;
		padding-bottom: 70px; /* Space for bottom nav */
	}

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
		text-decoration: none;
		color: var(--color-text-muted);
		min-width: 56px;
		min-height: 44px;
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
